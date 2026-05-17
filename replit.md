# Zpětná vazba na školní obědy

A Czech school lunch feedback app where students rate their daily meals, with an admin dashboard showing aggregate stats.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, wouter, TanStack Query

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/feedback.ts` — feedback table schema
- `artifacts/api-server/src/routes/feedback.ts` — feedback API routes
- `artifacts/lunch-feedback/src/pages/home.tsx` — student feedback form
- `artifacts/lunch-feedback/src/pages/admin.tsx` — admin dashboard

## Architecture decisions

- OpenAPI-first: all API contracts defined in `lib/api-spec/openapi.yaml`, types generated via Orval
- Meal IDs are lowercase/no-diacritics internally (`obed1`, `obed2`) but displayed as "Oběd 1" / "Oběd 2" in the UI
- Rating values are enum strings: `positive`, `neutral`, `negative`
- Stats aggregated server-side via SQL COUNT with FILTER clauses for efficiency

## Product

- **Feedback form** (`/`) — students pick their meal (Oběd 1 or 2), rate it with a face icon (positive/neutral/negative), and optionally leave a text comment
- **Admin dashboard** (`/admin`) — shows all submitted feedback in a list plus visual stats comparing ratings across meals

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/db/src/schema/`, run `pnpm run typecheck:libs` before typechecking the api-server, otherwise feedbackTable won't be in the db exports
- After each OpenAPI spec change, re-run codegen before using the updated types

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
