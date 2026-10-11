# Frontend Architecture

Repo: `taskmanager-web` (separate from the `TaskManager` backend repo).
Verified against source on 2026-09-19 (through commit `7df89c2`). Source code is the ultimate truth — if this
document disagrees with the code, the code wins.

> **Repository layout.** The app now lives in `apps/web/` inside an npm-workspaces monorepo (the split is described in the backend repo's `docs/admin-dashboard-plan.md`, section 4). Every `src/...`, `e2e/...` and `public/...` path in this document is relative to `apps/web/`. Run `npm run dev` (the shop, 3100), `npm run dev:admin` (the admin, 3200), `lint`, `build` and `test:e2e` from the repository root. The commit hook (Husky, lint-staged) is configured in the root `package.json` and runs ESLint inside the workspace of each staged file; add a line there for each new app or package.

## Overview

| Item | Value |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS v4 (`src/app/globals.css`), shadcn/ui (`style: base-nova`, base color `neutral`) |
| UI primitives | `@base-ui/react` (not Radix) via shadcn components |
| Server state | TanStack React Query v5 |
| Client state | Zustand v5 (`persist`, `skipHydration`) |
| HTTP | Axios, single shared instance |
| Icons / toasts | lucide-react / sonner |
| Theming | `next-themes` (`ThemeProvider`, class strategy, header toggle) |
| Animation | `@rive-app/react-canvas` via `RivePlayer` — scaffolded only; no `.riv` files and no live usage yet |
| Tests | Playwright end-to-end only (`e2e/`, `npm run test:e2e`), run locally against the real backend. No unit tests. CI (`.github/workflows/ci.yml`) runs `npm run lint` + `npm run build` only — see Testing |
| Git hooks | Husky `pre-commit` → `lint-staged` → `eslint --fix` on staged `*.ts`/`*.tsx` |

The app is a storefront over the backend microservices, reached through the API gateway.
Every page that touches data is a Client Component (`"use client"`); there is no server-side
data fetching, no Server Action, and no middleware.

## Application Structure

```text
src/
  app/          App Router routes (all pages, one root layout)
  components/
    layout/     SiteHeader, SiteFooter, CartDrawer
    ui/         shadcn/ui primitives
  features/     Feature slices: auth, catalog, inventory, orders
                  <feature>/*.tsx         feature-specific components
                (the Axios calls, DTO types and React Query hooks moved to
                 packages/api; the session to packages/auth: see "Shared packages")
  lib/          api (wires @taskmanager/api to this app), query-client, utils
  providers/    QueryProvider, StoreHydrator
  store/        Zustand stores (auth, cart)
```

**Convention:** each feature owns `api.ts` (transport + types) and a `use-*.ts` hook module
(React Query). Components never call `apiClient` directly — they call feature hooks.

## Routing

App Router, no route groups, no nested layouts. `src/app/layout.tsx` is the only layout and
mounts `ThemeProvider → QueryProvider → StoreHydrator + SiteHeader + main + SiteFooter +
CartDrawer + Toaster`. `<html>` carries `suppressHydrationWarning` because `next-themes` sets
the theme class before hydration.

| Route | Access | Notes |
|---|---|---|
| `/` | public | Static hero + category grid with illustrations (server component). The hero's stats ("4 Categories", "Free Returns", "24/7 Support") and the "Free shipping over $50" badge are hardcoded copy, not backed by any data or backend feature |
| `/products` | public | Filters/sort/pagination driven by URL search params |
| `/products/[id]` | public | Product detail + stock, add-to-cart |
| `/login`, `/register` | public | `/login?redirect=<path>` is honored |
| `/account` | auth | Profile, sign out, admin link if Admin |
| `/orders`, `/orders/[id]` | auth | Both guarded. The detail page redirects to bare `/login` (no `?redirect=`), so after signing in the user lands on `/account`, not back on the order |
| `/checkout` | auth | |

Pages that read `useSearchParams` (`/products`, `/login`) wrap their content in `<Suspense>`
— required for the App Router prerender.

Dynamic route params are typed with the Next-generated `PageProps<"/route">` /
`LayoutProps<"/">` globals and unwrapped with React `use(props.params)`.

## Authentication

Flow (all client-side):

```text
LoginPage → useLogin() → POST /users/login → { token, expiresAtUtc }
  → authStore.setSession(token, expiresAtUtc)   (persisted to localStorage "tm-auth")
  → invalidate ["currentUser"] → router.push(redirect ?? "/account")
```

- **Token storage:** `localStorage` key `tm-auth`, via Zustand `persist` (`partialize` keeps
  only `token` + `expiresAtUtc`).
- **Attachment:** an Axios request interceptor reads `useAuthStore.getState().token` and sets
  `Authorization: Bearer <token>` on every request (no allowlist — the header is sent to all
  endpoints, including public ones).
- **Expiry:** `isAuthenticated()` compares `expiresAtUtc` to `Date.now()`. There is no timer;
  expiry is only noticed on the next render or the next 401.
- **401 handling:** a response interceptor calls `authStore.logout()`, clears the entire React
  Query cache (`queryClient.clear()`), and re-rejects. It does **not** redirect; the user is
  bounced to `/login` only if they are on a `useRequireAuth` page (its effect fires on the
  state change).
- **Logout:** `useLogout()` clears the auth store and the entire React Query cache. There is no
  server-side logout/revocation call.
- **Refresh persistence:** `persist` uses `skipHydration: true`; `StoreHydrator` (mounted in
  the root layout) rehydrates both stores in an effect and then sets `hasHydrated`. Guards wait
  on `hasHydrated` so a hard reload does not bounce a signed-in user to `/login`.
- **Current user:** `useCurrentUser()` decodes `sub` from the JWT and queries `GET /users/{id}`,
  enabled only when authenticated.

## Authorization / Roles

- Role is read **client-side from the JWT** by `packages/auth/src/jwt.ts`, from the claim
  `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`. `isAdmin()` is true when that
  claim equals `"Admin"` and the session is unexpired. The token is decoded with `atob` — the
  signature is never verified in the browser.
- `useRequireAuth(redirectTo, { requireAdmin, forbiddenRedirectTo })` is the single guard hook.
  It returns `{ isReady }`; pages render `null` until ready. (The admin app's console sends non-admins
  are redirected to `/`.
- **This is UI convenience, not a security boundary.** Nothing stops a client from rendering
  admin UI or issuing admin requests; enforcement is the backend's (`Admin` policy on the
  catalog/inventory write endpoints — see the backend `docs/authentication.md`).

## API Client

`@taskmanager/api/client` exports a single Axios instance, `apiClient`, and `configureApi()`; each app calls `configureApi` once at startup (the shop does it in `src/lib/api.ts`, imported by the query provider). A request made before that throws a clear error.

| Concern | Implementation |
|---|---|
| Base URL | Given to `configureApi` by the app: `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"` (the API gateway) |
| Auth header | Request interceptor, Bearer from the app's `getToken` (the shop reads the auth store) |
| 401 | Response interceptor → the app's `onUnauthorized` (the shop: `logout()` and clear the query cache; the cart is kept), error re-thrown |
| Other statuses | Not intercepted; handled per-call by React Query |
| Error messages | `getApiErrorMessage(error, fallback)` reads ProblemDetails `detail` then `title` |

All calls are centralized in `packages/api/src/*-api.ts`. Backend paths used, matching the gateway
route prefixes: `/users`, `/products`, `/inventory`, `/orders`. (`/tasks` and `/basket` exist on
the gateway but the frontend calls neither.)

`getInventory` is the one place that swallows a status: 404 → `null` (product with no
inventory record).

## React Query

- One `QueryClient`, a module-level singleton in `src/lib/query-client.ts`, handed to
  `QueryProvider`. It is a singleton (rather than created in component state) so the Axios 401
  interceptor can clear it outside React. That is only safe because nothing fetches on the
  server — adding SSR data fetching would make this client shared across requests.
- Defaults: `staleTime: 60_000`, `retry: 1`. No persistence, no devtools, no SSR hydration.

| Key | Source | Notes |
|---|---|---|
| `["products", params]` | `useProducts` | `placeholderData: keepPrevious` for filter/page changes |
| `["product", id]` | `useProduct` | `enabled: Boolean(id)` |
| `["inventory"]` | `useInventoryList` | admin list |
| `["inventory", productId]` | `useInventory` | |
| `["orders"]` | `useOrders` | |
| `["order", id]` | `useOrder` | **polls every 1500 ms while status is `Pending`**, then stops — this is how the async fulfillment saga's result reaches the UI |
| `["currentUser", userId]` | `useCurrentUser` | |

Mutations invalidate rather than optimistically update: create product → `["products"]`;
create/restock inventory → `["inventory"]` and `["inventory", productId]`; create order →
`["orders"]`. No optimistic updates anywhere.

Note the key overlap: `["inventory"]` is both the list key and a prefix of `["inventory", id]`,
so invalidating the list also invalidates every per-product query. Intentional or not, that is
the current behavior.

## Zustand

| Store | Persisted (`localStorage`) | Responsibility |
|---|---|---|
| `auth-store` (`tm-auth`) | `token`, `expiresAtUtc` | Session token, expiry check, `isAdmin()` derived from the JWT, `hasHydrated` flag |
| `cart-store` (`tm-cart`) | `items` | Cart lines (`productId`, `name`, `price`, `quantity`), drawer `isOpen` (not persisted). Cleared by an explicit sign-out (`useLogout`), not when a token merely expires (`api-client.ts`) |

Both use `skipHydration: true` and are rehydrated by `StoreHydrator`.

`useCartCount()` / `useCartSubtotal()` are selector hooks exported alongside the cart store —
the pattern for derived cart values.

**The cart is purely client-side.** The backend `BasketService` is never called; cart contents
exist only in the browser and are sent to `POST /orders` at checkout, including the client's
own `unitPrice`.

## Product / Catalog

```text
/products page (URL search params = filter state)
  → useProducts({category,minPrice,maxPrice,search,sort,page,pageSize:12})
  → GET /products?…  → { items, totalCount, page, pageSize }
  → grid of ProductCard | skeletons | "No products match your filters."
```

- Filter state lives in the URL, not in a store; `updateParams` rewrites the query string with
  `router.push` and resets `page` unless `page` is the field being changed.
- Sort options: `newest | price-asc | price-desc | name`. Price slider range is `0–200`
  (`MAX_PRICE`); values at the bounds are omitted from the request.
- Categories are a hardcoded frontend constant (`packages/api/src/categories.ts`), not
  fetched from the backend.
- Detail page combines `useProduct(id)` and `useInventory(id)`; add-to-cart is disabled while
  inventory loads or when `quantityAvailable === 0`.
- Checkout: `POST /orders` with the cart lines → clear cart → `router.push(/orders/{id})`,
  where the polling `useOrder` shows `Pending → Confirmed | Cancelled` and renders
  `cancellationReason` on cancellation.

## Admin app (`apps/admin`, `@taskmanager/admin`)

The admin is its own Next.js app, served on **port 3200** (`npm run dev:admin`), beside the shop on 3100. It reuses `@taskmanager/ui`, `@taskmanager/api` and `@taskmanager/auth`; nothing from the shop's own code.

- **Its own session.** `localStorage` is per origin, so signing in to the shop does not sign in to the admin, and the reverse. That is deliberate. The admin has its own sign-in page, which signs the person straight back out and says so if the account is not an `Admin` (the check reads the role from the token, as everywhere; the backend enforces it).
- **Routes:** `/login`; and, behind one guard in `app/(console)/layout.tsx`, `/` (redirects to `/dashboard`), `/dashboard` and `/products`. The dashboard shows four KPI cards (orders, revenue, average order value, cancellation rate, each against the previous period of equal length) from the backend's `GET /orders/admin/summary`, for 7, 30 or 90 whole UTC days; revenue is confirmed orders only, with no tax or shipping. The guard is `useRequireAuth` with `requireAdmin`; a signed-in non-admin goes to `/login?forbidden=1`, where that session is dropped. The login page only follows a `redirect` that is a path inside the app.
- **The shell:** a slim header (brand, "Back to shop" to `NEXT_PUBLIC_SHOP_URL`, "Sign out") and a sidebar, a tab row on mobile, driven by the `NAV` array in the layout. To add a section, add a page under `app/(console)/` and one `NAV` entry.
- **Products** (unchanged from when it lived in the shop): lists `useProducts({ pageSize: 100 })` joined against `useInventoryList()` via a `Map<productId, quantityAvailable>`. **New product** is a two-step client-orchestrated flow, `POST /products` then `POST /inventory` with the initial stock; if the second call fails the product exists with no inventory record, and the dialog says so (no rollback). **Restock** calls `POST /inventory/{id}/restock`; on a 404 it falls back to `POST /inventory`.
- **Gateway CORS.** The gateway only answers browsers on the origins in `Cors:AllowedOrigins`: 3100 and 3200 in `deploy/docker-compose.yml` of the backend repo. A new origin must be added there, or the page loads and every API call is blocked.
- **The shop** links to the admin from `/account` (only for admins) using `NEXT_PUBLIC_ADMIN_URL` (default `http://localhost:3200`).
- **Tests:** `apps/admin/e2e`. An anonymous visit is turned away; a throwaway customer is refused and left signed out; and, when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in the environment, an administrator signs in, sees the data and signs out (skipped without them, so no credential is stored in this repository).

## Shared UI package (`packages/ui`, `@taskmanager/ui`)

The shadcn/Base UI primitives (`button`, `card`, `dialog`, `select`, `sheet`, `table`, `empty-state`, `error-message`, and the rest of what used to be `components/ui`) and the design tokens live in `packages/ui`, so the shop and the future admin app share one set.

- **Importing:** `import { Button } from "@taskmanager/ui/components/button"`, `import { cn } from "@taskmanager/ui/lib/utils"`. The package's `exports` map names exactly these paths (`./components/*`, `./lib/utils`, `./theme.css`); the source is compiled by the app's bundler, so there is no build step for the package.
- **Styles:** the tokens, the `@theme` mapping and the base layer are `packages/ui/src/theme.css`. An app's stylesheet imports it after `tailwindcss`, `tw-animate-css` and `shadcn/tailwind.css`, **and** must add an `@source` line pointing at the package (see `apps/web/src/app/globals.css`). Tailwind v4 scans only the app's own files by itself: without that line the app still builds, but every class used only inside the package silently has no styles. This was checked on purpose: with the line removed, a visual comparison of 20 screenshots fails; with it, all 20 match the pre-move baseline.
- **What stayed in the app, and why:** `error-state` (it formats errors with the API helper, which belongs with the API client) and `rive-player` (a shop-only library). `src/lib/utils.ts` is a one-line re-export of `cn`, so existing imports keep working.
- **Adding a component:** the shadcn CLI is **not** set up to write into the package. Its monorepo mode did not resolve the package alias here (it produced a path outside the repository, so that configuration was removed). Run `npx shadcn add <name>` in `apps/web` (it lands in `apps/web/src/components/ui`), then move the file into `packages/ui/src/components`, change its `@/...` imports to relative ones, and import it through `@taskmanager/ui`.
- **Linting:** the package has its own `eslint.config.mjs` (the app's rules minus the one that looks for a `pages` directory). When a third config appears, extract them into a shared `packages/config`.

## Shared packages (`packages/api`, `packages/auth`, `packages/config`)

Beside `packages/ui` (above), three more packages exist so that a second app does not copy code:

| Package | Contains | Imported as |
|---|---|---|
| `@taskmanager/api` | the Axios client and `configureApi`; `getApiErrorMessage`; one `*-api.ts` per backend area (auth, catalog, inventory, orders) with its DTO types; the React Query hooks (`use-products`, `use-inventory`, `use-orders`); the product `categories` | `@taskmanager/api/client`, `.../errors`, `.../catalog-api`, `.../use-products`, ... |
| `@taskmanager/auth` | the persisted auth store (`tm-auth`), the JWT helper, `useLogin`/`useRegister`/`useCurrentUser`/`useLogout`, and `useRequireAuth` | `@taskmanager/auth/auth-store`, `.../use-auth`, `.../use-require-auth`, `.../jwt` |
| `@taskmanager/config` | the shared ESLint rules (`base`, and `library()` for a package) and `tsconfig.base.json` | `@taskmanager/config/eslint`, `.../tsconfig.base.json` |

How they fit together, and the two places where an app still has to supply something:
- **Dependencies point one way:** `auth` uses `api`; `api` and `ui` use nothing of ours; an app uses all of them. Nothing in a package imports from an app. That is why the API client no longer imports the auth store or the query client: it asks the app (`getToken`, `onUnauthorized`).
- **`useLogout` is in two parts.** The package one ends the session and clears the query cache, and accepts `onLoggedOut`. The shop's `src/features/auth/use-logout.ts` wraps it and empties the cart there, so the package knows nothing about carts. Import `useLogout` from the app wrapper.
- **`react-query`, `react` and `next` are peer dependencies** of the packages: there must be exactly one copy of each in the app's bundle, or hooks break in confusing ways.
- **No build step.** The apps' bundler compiles the packages' TypeScript directly (Turbopack transpiles workspace packages by itself).
- **Where a moved file went:** `lib/api-client.ts` → `packages/api/src/client.ts`; `lib/api-error.ts` → `errors.ts`; `features/*/api.ts` → `packages/api/src/*-api.ts`; `features/*/use-*.ts` (catalog, inventory, orders) → `packages/api/src/use-*.ts`; `features/catalog/categories.ts` → `categories.ts`; `lib/jwt.ts`, `store/auth-store.ts`, `features/auth/use-auth.ts`, `features/auth/use-require-auth.ts` → `packages/auth/src/`.

## UI Architecture

- shadcn/ui components in `src/components/ui`, built on `@base-ui/react`. Base UI's composition
  prop is `render` (not Radix `asChild`): `<Button nativeButton={false} render={<Link …/>} />`,
  `<DialogTrigger render={<Button…/>} />`. Follow this when adding components.
- Variants via `class-variance-authority`; `cn` is re-exported from the `cn` package through
  `src/lib/utils.ts` (not the usual local `clsx + tailwind-merge` helper).
- Icons: `lucide-react`. Toasts: `sonner`, mounted once as `<Toaster />` in the root layout.
- Theming: `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`) in the root layout; a
  `ThemeToggle` in `SiteHeader` flips light/dark; `sonner` follows the theme via `useTheme`.
- **Product imagery** is `ProductIllustration`: a colored icon tile keyed by category name.
  It matches the four hardcoded categories exactly; any other category string (including a
  misspelling in backend data) falls back to a neutral `Package` tile. There are no real
  product images — the backend has no image field.
- `RivePlayer` wraps `@rive-app/react-canvas` and falls back to its `fallback` prop until a
  `.riv` file loads. Nothing renders it yet and `public/` contains no `.riv` files; it is
  referenced only in a comment in `ProductIllustration`.
- `EmptyState` (`components/ui/empty-state.tsx`) is the shared empty-list component (icon,
  title, description, optional action), used by `/orders` and the cart drawer.
- Responsive pattern: `max-w-7xl` (catalog) / `max-w-2xl` (forms, orders) containers with
  `px-4 sm:px-6 lg:px-8`, Tailwind breakpoint utilities. Header nav and search hide below
  `md`/`sm`.

## Error Handling

| Case | Behavior |
|---|---|
| Loading | `Skeleton` components; list pages show skeleton grids, `/products` dims the grid at `opacity: 0.6` while `isFetching` |
| Empty | `EmptyState` component: `/orders`, `/products` (with "Clear filters"), the cart drawer, checkout, and a missing product |
| 401 | Interceptor logs out; guarded pages then redirect to `/login` |
| 403 | No specific handling — a non-admin who reaches an admin call sees the generic error message |
| 404 | Product detail renders a "Product not found" `EmptyState` on `isError`; `getInventory` maps 404 → `null`; restock maps 404 → create |
| Load failure | `ErrorState` (`components/ui/error-state.tsx`) with a "Try again" button replaces the content on `/products`, `/orders`, `/orders/[id]` and the admin list. Before this, a failed request looked like an empty list or a never-ending skeleton. |
| Submit errors | `ErrorMessage` (`components/ui/error-message.tsx`, `role="alert"`) beside the control: login, register, checkout, new-product dialog (which also reports a failed initial-stock call: the product exists, stock was not set). |
| Row-level action errors | `toast.error` — restock, where an inline message would have no good place. Successes use `toast.success`. |
| Network failure | No dedicated handling; surfaces as the generic fallback message |
| Validation | Native HTML form validation only (`required`, `type="email"`, `minLength={8}`, `min`/`step`). No schema validation library. |

Unexpected render errors are caught by `app/error.tsx` (header and footer stay; the "Try again" button calls `retry()`, which is this Next.js version's recovery call rather than the older `reset()`). Unknown URLs get `app/not-found.tsx` (HTTP 404). `app/global-error.tsx` covers a failure of the root layout itself; it renders its own document and is always light, because the theme toggle lives in that layout.

## Environment Configuration

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API gateway base URL | `http://localhost:8000` |

`.env.local.example` documents it. `next.config.ts` is empty (defaults). Because the variable is
`NEXT_PUBLIC_*`, it is inlined at build time — a container image must be rebuilt to point at a
different gateway. No Dockerfile exists in this repo.

## Testing

End-to-end tests live in `e2e/` and run with `npm run test:e2e` (config: `playwright.config.ts`,
Chromium only). They run against the **real backend** — start the Docker stack in the
`TaskManager` repo first; the tests do not start it. The config reuses a dev server already on
port 3100, or starts one there; the port is fixed because the gateway's CORS policy allows
`http://localhost:3100` only. `npm run dev` therefore defaults to 3100 (`next dev --port 3100` in `package.json`), not Next's usual 3000; on any other port the page loads but the browser blocks its API calls.

| Test | Covers |
|---|---|
| catalog loads products from the backend | Frontend ↔ gateway wiring: a wrong `NEXT_PUBLIC_API_URL` fails here instead of leaving skeletons forever |
| a new customer can check out and the order is confirmed | Register → add to cart → checkout → saga resolves to `Confirmed`, then asserts stock dropped by one in InventoryService |

The checkout test registers a new `e2e+<id>@example.com` user on each run, and buys one unit of
the first catalog product that has a non-zero price and stock (found via the public
`GET /products` and `GET /inventory`). It skips, rather than fails, when no such product
exists. Each run therefore leaves a test user and an order behind and consumes one unit of
stock — acceptable on a local dev stack, not something to point at shared data.

The tests are not in CI: GitHub Actions has no backend to reach. Running them there would
mean starting the backend stack in the workflow.

## Important Conventions

1. Components call feature hooks; only `features/*/api.ts` imports `apiClient`.
2. DTO types live next to the call that returns them, in `features/*/api.ts`.
3. Auth token is read from the store *inside* the interceptor (`getState()`), never passed in.
4. Guard client pages with `useRequireAuth` and render `null` until `isReady` — never redirect
   before `hasHydrated`.
5. Mutations invalidate query keys in `onSuccess`; no manual cache writes.
6. URL search params are the source of truth for catalog filter/sort/page state.
7. Base UI composition uses `render={...}`, not `asChild`.
8. Error copy comes from `getApiErrorMessage`, never from `error.message`. Where it shows follows the table in Error Handling: page data → `ErrorState`, a submitted form → `ErrorMessage`, a row action → toast.

## Known Issues / Uncertainties

- **Test coverage is thin.** Two end-to-end tests cover catalog loading and the checkout path
  (see Testing); there are no unit or component tests, and CI still verifies only lint + build.
  Most behavior above is read from source, not from test evidence.
- Order pricing is client-supplied: checkout sends `unitPrice` from the local cart.
  Verified in the backend (2026-09-19): `OrderService` does **not** re-validate — it stores the
  client's `unitPrice` verbatim. Tracked in the backend `docs/TODO.md`.
- Prices are formatted with `toFixed(2)` and a hardcoded `$`; there is no currency/locale
  handling.
- Categories are hardcoded (`categories.ts`) and must match backend data exactly. Products
  whose stored category differs (e.g. a typo) never match a category filter and render with
  the fallback illustration.
- `admin` product creation has no rollback if the follow-up inventory call fails.
- Product **editing/deletion** does not exist in the frontend — only create and restock.
- Local `.env.local` can silently drift from `.env.local.example`. A copy left pointing at
  `http://localhost:5160` (the gateway's `dotnet run` port) fails every API call with
  `ERR_CONNECTION_REFUSED` while the Docker stack is up, leaving `/products` on skeletons
  indefinitely. Use `http://localhost:8000` with the Docker gateway.

Verified 2026-09-19 against the running Docker stack: the gateway serves the bare
`GET /products` the catalog page issues, and its CORS policy allows `http://localhost:3100`
with credentials.
