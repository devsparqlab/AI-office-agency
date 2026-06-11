# TASK-085: One-Command Dev Startup for Dashboard (server + client)

## Short name
`dashboard-one-command-dev`

## Type
chore

## Priority
low

## Parent / Epic
- Parent: none
- Epic: AI Office Dashboard DX

## Status

The dashboard requires two terminals (`server/` Express on 4310, `client/` Vite
on 3000). Running only the client floods the console with
`http proxy error: /api/* ECONNREFUSED` because the Vite proxy target is down.
Add a root `dashboard/package.json` with `concurrently` so a single
`npm run dev` starts both processes.

## Scope

### Target repo

| Repo | Reason |
| --- | --- |
| `ai-dev-office` | Dashboard workspace root script + docs. |

### Affected files

| Path | Action | Description |
| --- | --- | --- |
| `dashboard/package.json` | created | Root scripts: `dev` (concurrently server+client), `install:all`. |
| `dashboard/README.md` | modified | Document the one-command flow. |
| `ai-dev-office/runs/TASK-085/*` | created | Task status and artifacts. |

### Explicitly excluded

- No changes to server or client source code, ports, or proxy config.
- No changes to existing per-package `dev` scripts (two-terminal flow still works).

## Acceptance Criteria

- [ ] `npm run dev` from `dashboard/` starts the Express server (4310) and Vite client (3000) together.
- [ ] `/api/health` responds through the Vite proxy with no ECONNREFUSED.
- [ ] Existing per-package workflows are untouched.

## Verification

- `cd dashboard && npm run dev`, then `curl http://localhost:3000/api/health` returns the server health payload.

## Assignment

- Primary: `devops`
- Parallel: `false`
