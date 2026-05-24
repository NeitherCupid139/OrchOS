# OrchOS

**AI Agent Orchestration System** — Coordinate multiple AI agents to accomplish complex development goals from a unified dashboard.

---

## Features

- **Conversations / Chat** — Persistent chat threads with AI agents and runtimes, with message history, streaming, and thinking state visualization
- **Bookmarks** — Organize links into custom categories, import from HTML/JSON/CSV, drag-and-drop reorder, pin favorites to the home dashboard
- **Agent Management** — Register AI agents and runtimes, auto-detect installed CLIs, assign agents to conversations and goals
- **Goal Tracking** — Create goals with success criteria, track progress through compatibility state projections with activity logs
- **Problem Inbox** — Collect issues from various sources, prioritize, and convert to goals
- **Automation Rules** — Define conditions and actions to auto-fix, ignore, or assign reviewers
- **MCP Server Management** — Manage Model Context Protocol server profiles with global or project scoping
- **Skills** — Define reusable capabilities with install path, source URL, and scoping
- **Local Devices** — Pair and manage local agent installations across devices
- **Calendar** — Dashboard calendar view
- **Mail** — Email integration panel
- **Board** — Project board view for organized workflows
- **i18n** — English, Simplified Chinese, Traditional Chinese, Japanese, Korean (powered by Paraglide JS)
- **Dark / Light Theme** — Auto-detect or manually toggle, persisted across sessions

---

## Architecture

```
OrchOS/
└── apps/
    └── web/          # TanStack Start app with UI, server routes, and database
```

### Tech Stack

| Layer       | Technology                                                      |
| ----------- | --------------------------------------------------------------- |
| Frontend    | React 19, Vite, TanStack Start, TanStack React Router           |
| Styling     | Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui, `motion`      |
| UI Primitives | `@base-ui/react` (ScrollArea, etc.), `@hugeicons/react` (icons) |
| State       | Zustand (persisted to localStorage)                             |
| i18n        | Paraglide JS (compile-time, 5 languages)                        |
| Charts      | Recharts                                                        |
| Backend     | TanStack Start server routes on Bun, Drizzle ORM, SQLite (Cloudflare D1) |
| Auth        | Clerk (`@clerk/clerk-react`)                                    |
| AI SDK      | `ai` + `@ai-sdk/react`                                          |
| Virtualization | `@tanstack/react-virtual`                                     |
| Workspace   | Bun workspaces (single `apps/web` workspace)                    |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.3
- Node.js >= 22

### Install & Run

```bash
# Install dependencies
bun install

# Start the app
bun run dev
```

The app runs at **http://localhost:3000**.

### Run Individually

```bash
bun run --filter=web dev
```

### Build

```bash
bun run build
```

---

## Available Scripts

| Command                 | Description                       |
| ----------------------- | --------------------------------- |
| `bun run dev`           | Start the dev server              |
| `bun run build`         | Build the app                     |
| `bun run lint`          | Lint with oxlint                  |
| `bun run lint:strict`   | Lint and fail on warnings         |
| `bun run check-types`   | TypeScript type checking          |
| `bun run format`        | Format code with oxfmt            |
| `bun run test`          | Run tests (vitest)                |
| `bun run deploy:cf`     | Deploy to Cloudflare              |
| `bun run cf-typegen`    | Generate Cloudflare type bindings |

Targeting the workspace directly:

```bash
bun run --filter=web dev
bun run --filter=web build
bun run --filter=web test
bun run --filter=web db:generate     # Generate Drizzle migrations
bun run --filter=web db:migrate:local # Apply migrations locally
```

---

## Database

The app uses **Cloudflare D1** (SQLite) with Drizzle ORM. The `DB` binding is configured in `apps/web/wrangler.jsonc`.

### Tables

`commands`, `goals`, `states`, `artifacts`, `activities`, `runtimes`, `agents`, `projects`, `settings`, `events`, `organizations`, `localAgents`, `localAgentPairings`, `problems`, `rules`, `mcpServers`, `conversations`, `messages`, `skills`, `bookmarkCategories`, `bookmarks`

### Migrations

```bash
bun run --filter=web db:generate
bun run --filter=web db:migrate:local
bun run --filter=web db:migrate:remote
```

---

## Keyboard Shortcuts

| Shortcut            | Action           |
| ------------------- | ---------------- |
| `Cmd+K` / `Ctrl+K`  | Open command bar |

---

## Project Structure (Frontend)

```
apps/web/src/
├── components/         # UI components, dialogs, layout, panels
│   ├── chat/           # Chat components (message flow, markdown, code blocks)
│   ├── dialogs/        # Reusable dialogs (RenameDialog, etc.)
│   ├── layout/         # Sidebar, shell layouts
│   ├── panels/         # Dashboard panels (CreationView, BoardView, etc.)
│   └── ui/             # Primitive UI components (button, scroll-area, tooltip, etc.)
├── lib/                # Utilities, API client, stores, i18n, hooks
│   ├── stores/         # Zustand stores (conversation, board)
│   ├── orpc/           # ORPC client contracts
│   └── hooks/          # Custom React hooks
├── pages/              # Page-level components loaded by routes
│   └── dashboard/      # Dashboard page components
├── routes/             # TanStack Router file-based routes
├── server/             # Server-side code
│   ├── auth/           # Clerk auth integration
│   ├── cloudflare/     # Cloudflare-specific helpers
│   ├── db/             # Drizzle schema and migrations
│   ├── modules/        # Server modules
│   ├── orpc/           # ORPC server procedures and contracts
│   └── runtime/        # Local DB runtime adapter
├── paraglide/          # Generated i18n messages (do not edit)
└── styles.css          # Tailwind CSS entry
```

---

## Learn More

- [TanStack React Router](https://tanstack.com/router) — File-based routing for React
- [TanStack Start](https://tanstack.com/start) — Full-stack React framework
- [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) — Compile-time i18n
- [Drizzle ORM](https://orm.drizzle.team/) — TypeScript ORM with SQLite
- [Clerk](https://clerk.com/) — Authentication and user management
- [Motion](https://motion.dev/) — Animation library for React
- [ORPC](https://orpc.unnoq.com/) — RPC framework for the server
