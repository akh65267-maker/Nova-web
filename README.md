# taskmanager-web

The Nova Commerce storefront and admin console (backend: the `TaskManager` repository), a Next.js 16 app in an npm-workspaces monorepo. Architecture and conventions: [docs/frontend.md](docs/frontend.md). The backend lives in the separate `TaskManager` repository.

## Repository layout

```
apps/web/        the shop (Next.js App Router), port 3100
apps/admin/      the admin console, port 3200
packages/ui/     shared UI primitives and the design tokens (@taskmanager/ui)
packages/api/    the API client, DTO types and React Query hooks (@taskmanager/api)
packages/auth/   the session store and sign-in hooks (@taskmanager/auth)
packages/config/ shared ESLint and tsconfig (@taskmanager/config)
docs/            documentation
package.json     the workspace root: scripts, git hooks, lint-staged
```

All paths in `docs/frontend.md` that start with `src/`, `e2e/` or `public/` are relative to `apps/web/`.

## Getting started

```bash
npm install          # once, from the repository root
npm run dev          # the shop, on http://localhost:3100
npm run dev:admin    # the admin, on http://localhost:3200 (a second terminal)
npm run lint
npm run build
npm run test:e2e     # both apps; needs the backend stack running (Docker, in the TaskManager repo)
                     # set ADMIN_EMAIL and ADMIN_PASSWORD to include the administrator flow
```

The ports are 3100 and 3200, not the Next.js default of 3000, because the API gateway only allows those two origins (CORS); on any other port the page loads but its API calls are blocked.

Settings live in each app's `.env.local` (see the `.env.local.example` beside it).
