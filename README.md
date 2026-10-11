# taskmanager-web

The storefront (and soon the admin) for the TaskManager backend, a Next.js 16 app in an npm-workspaces monorepo. Architecture and conventions: [docs/frontend.md](docs/frontend.md). The backend lives in the separate `TaskManager` repository.

## Repository layout

```
apps/web/        the shop (Next.js App Router)
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
npm run lint
npm run build
npm run test:e2e     # needs the backend stack running (Docker, in the TaskManager repo)
```

The port is 3100, not the Next.js default of 3000, because the API gateway only allows that origin (CORS); on any other port the page loads but its API calls are blocked.

Settings live in `apps/web/.env.local` (see `.env.local.example` beside it).
