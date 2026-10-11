# Working in the monorepo

One repository, two apps, four shared packages. Run every command from the **repository root**.

```
apps/web/        the shop          http://localhost:3100
apps/admin/      the admin console http://localhost:3200
packages/ui      components and theme (@taskmanager/ui)
packages/api     API client and React Query hooks (@taskmanager/api)
packages/auth    auth store, JWT helpers, hooks (@taskmanager/auth)
packages/config  shared ESLint and tsconfig (@taskmanager/config)
```

## Run both apps

1. Start the backend (TaskManager repo): `docker compose up` in `deploy/`. The gateway listens on `http://localhost:8000`.
2. Install once: `npm install`.
3. Two terminals:

```bash
npm run dev          # the shop, 3100
npm run dev:admin    # the admin, 3200
```

Use exactly these ports: the gateway's CORS only allows these two origins. On any other port the page loads but every API call is blocked.

Sessions are separate per app (`localStorage` is per origin). Signing in to the shop does not sign in to the admin. The admin only accepts an `Admin` account.

## Everyday commands

| Command | What it does |
|---|---|
| `npm run lint` | lints every workspace |
| `npm run build` | builds both apps |
| `npm run test:e2e` | e2e for both apps, against the real backend; set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to include the administrator flow |
| `npm run dev -w @taskmanager/admin` | run one workspace directly |
| `npm install <pkg> -w @taskmanager/web` | add a dependency to one workspace (never to the root) |

## Where does new code go?

- Used by one app only: in that app (`apps/web/src/...`).
- Used by both: a package. UI goes in `packages/ui`, API calls and hooks in `packages/api`, auth in `packages/auth`.
- Apps never import from each other. Shared code goes through a package.
- A new admin section: add a page under `apps/admin/src/app/(console)/` and one entry in `NAV` in that folder's `layout.tsx`.

## Gotchas

- A new origin (another port or domain) must be added to `Cors:AllowedOrigins` in the backend's `deploy/docker-compose.yml`.
- Tailwind scans `packages/ui` through the `@source` line in each app's `globals.css`. Keep it, or shared components lose their styles.
- Settings live in each app's `.env.local` (see the `.env.local.example` beside it).
- A running dev server holds its folder open on Windows; stop it before `git mv`.
- Going back to a single app: switch to `main` (the monorepo lives on the `monorepo` branch until merged).
