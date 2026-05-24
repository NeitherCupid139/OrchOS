# AGENTS.md

## Workspace Facts

- Package manager/runtime: `bun@1.3.11` (`package.json`), workspace repo via Bun workspaces.
- Main workspace: `apps/web` (TanStack Start app with UI and server routes).
- `apps/addons` and `packages/*` no longer exist — the project has been consolidated into a single `apps/web` workspace.
- Root scripts are the source of truth: `bun run dev`, `build`, `lint`, `lint:strict`, `format`, `check-types`, `test`.

## Commands That Matter

- Start everything: `bun run dev`
- Start the app directly: `bun run --filter=web dev`
- Lint before committing: `bun run lint:strict`
- Full repo checks: `bun run lint && bun run check-types && bun run test`
- App-local tests:
  - `bun run --filter=web test`
- Deploy to Cloudflare: `bun run deploy:cf`
- Generate database migrations: `bun run --filter=web db:generate`
- Run local migrations: `bun run --filter=web db:migrate:local`

## Pre-commit / Verification

- Lefthook pre-commit runs only `bun run lint:strict`. If this fails, the commit will fail.
- `test` uses `vitest run --passWithNoTests` in `apps/web`, so green test runs may still mean no tests executed.
- Root `lint` is `oxlint`, not ESLint. Root `format` is `oxfmt`, not Prettier, even though Prettier is installed.

## Frontend Wiring

- `apps/web` uses TanStack Start. Entry wiring is `apps/web/src/router.tsx` plus file-based routes under `apps/web/src/routes`.
- Routes are in TanStack React Router file-convention: `apps/web/src/routes/__root.tsx` (root layout with providers), `apps/web/src/routes/dashboard.tsx` (dashboard shell), and `apps/web/src/routes/dashboard/*` sub-routes for pages.
- Dashboard pages live in `apps/web/src/pages/dashboard/*` and are lazy-loaded from route files.
- Do not hand-edit `apps/web/src/routeTree.gen.ts`; TanStack Router generates it.
- User-facing strings are expected to go through Paraglide messages (`m.*`) rather than hardcoded UI text.
- Paraglide output lives in `apps/web/src/paraglide` and is treated as generated code; root lint config explicitly ignores it.
- i18n message source files: `apps/web/messages/{languageTag}.json` (en, zh-CN, zh-TW, ko, ja).
- App-local server code lives under `apps/web/src/server` and is reached through TanStack Start server routes or the ORPC RPC system (`api.rpc.$.ts`).
- Client-side state management uses Zustand with stores in `apps/web/src/lib/stores/` (persisted to localStorage).
- UI component library: `@base-ui/react` (ScrollArea, etc.), Tailwind CSS v4 via `@tailwindcss/vite`, `motion` (framer-motion successor) for animations.

## Backend Wiring

- Server-side modules live under `apps/web/src/server/modules/*`.
- Runtime database behavior is Cloudflare D1-first via `apps/web/src/server/runtime/local-db.ts` and the `DB` binding from `apps/web/wrangler.jsonc`.
- API routes use the ORPC system: `apps/web/src/routes/api.rpc.$.ts` is the main handler, with contracts and procedures in `apps/web/src/server/orpc/`.
- Standalone API routes also exist at `apps/web/src/routes/api.chat.ts` and `apps/web/src/routes/api.github-stars.ts`.
- Auth is handled by Clerk (`@clerk/clerk-react`), configured in `apps/web/src/lib/auth.ts` and `apps/web/src/server/auth/`.

## Database / Migration Gotcha

- Drizzle config lives at `apps/web/drizzle.config.ts` and uses SQLite dialect. The `DB` binding is read from `apps/web/wrangler.jsonc`.
- If changing persistence behavior, inspect both `apps/web/src/server/db/*` and `apps/web/src/server/runtime/*` before deciding how migrations should work.
- Current schema tables (in `apps/web/src/server/db/schema.ts`): commands, goals, states, artifacts, activities, runtimes, agents, projects, settings, events, organizations, localAgents, localAgentPairings, problems, rules, mcpServers, conversations, messages, skills, bookmarkCategories, bookmarks.

## Repo-Specific Editing Guidance

- Ignore template README claims in app subfolders unless confirmed by source/config; root config is more reliable here.
