# AI Dev Office

A multi-agent orchestration framework that simulates a real dev team of 7 AI agents working together -- PM, Dev, Dev-2, Reviewer, Debugger, DevOps, and Free Roam -- with automatic task handoff.

All contributors and AI agents must follow the framework rules in `AGENTS.md`. When this framework is installed into a target project, that project must provide its own `AGENTS.md` for project-specific work.

## Framework Contract

This repository is the portable AI Dev Office framework. Portable defaults live in `AGENTS.md`, `office.config.example.yaml`, `templates/install-manifest.yaml`, `profiles/`, `templates/`, `runners/`, `agents/`, `schemas/`, and `workflows/`. Machine-specific values belong in ignored local config such as `office.config.local.yaml`, `profiles/*.local.yaml`, or environment variables.

The config merge contract is documented in `docs/config-profile-merge-contract.md`.

Additional enforcement for AI Dev Office runners:

- `handler message` must live only in `shared-lib`.
- Do not add, move, or keep duplicate local handler-message logic in consumer services.

**Cursor:** Project rules in `.cursor/rules/ai-dev-office.mdc` tie the IDE agent to this workflow (role prompts remain the single source of truth in `agents/*.md`); optional per-role rules are `ai-dev-office-<role>.mdc` for the rule picker. **Subagents** (Cursor Agent, when enabled): `.cursor/agents/ai-dev-office-*.md` — one file per role; each delegates to the matching file under `ai-dev-office/agents/`.

## Quick Start

### 1. Start a new task via PM

```bash
TASK_ID="TASK-011"
./ai-dev-office/run-agent.sh $TASK_ID pm
```

PM will create `task.md`, `status.yaml`, plan the work, and assign it to Dev or Dev-2.
If a task depends on upstream work, PM/orchestrator can set `status.yaml` to
`phase: blocked` (`state: blocked`) with `blocked_on`, `waiting_for`, and
`ready: false` until dependencies are resolved.

### 2. Run the assigned Dev agent

```bash
./ai-dev-office/run-agent.sh $TASK_ID dev
# or for parallel work:
./ai-dev-office/run-agent.sh $TASK_ID dev-2
```

### 3. Run Reviewer

```bash
./ai-dev-office/run-agent.sh $TASK_ID reviewer
```

Reviewer reads all dev outputs (both `dev-output.yaml` and `dev-2-output.yaml` if they exist), verifies scope and architecture rules from `AGENTS.md`, runs build and test checks, and approves or requests changes. Dev handoff to reviewer now sets `phase/state` to `in_review`.

### 4. Auto Pipeline (runs full flow)

```bash
./ai-dev-office/run-agent.sh $TASK_ID auto
```

Runs PM -> Dev -> Reviewer -> Done automatically, with divergence to Debugger/DevOps/Free Roam as needed.
Auto mode now respects dependency-gated tasks: if `status.yaml` is `blocked`,
the pipeline stops instead of dispatching downstream agents.

When PM sets `assignment.parallel: true` with valid parallel subtasks (`parallel_safe: true`,
non-overlapping owned files, distinct `dev` and `dev-2` lanes), auto mode runs both dev agents
concurrently, writes `dev-parallel.log` and `dev-2-parallel.log`, then routes directly to Reviewer.
See `workflows/hybrid-default.yaml` and `tests/integration/auto-parallel.sh`.

### Validate runtime files

```bash
ruby ai-dev-office/validate-yaml.rb TASK-011
```

Use this after saving `status.yaml` or any `<agent>-output.yaml` file to catch
missing required fields, invalid routing agents, malformed runtime YAML, and
state mismatches (`phase` vs `state`).

### Check office status

```bash
./ai-dev-office/run-agent.sh status
./ai-dev-office/run-agent.sh status TASK-011
```

The status command is read-only. It summarizes current phase, routed agent,
readiness, blocked dependencies, validation state, and the next suggested
runner command. Task ids may use `TASK-NNN` or package-style `TASK-PKG-NNN`.

### Use operator helpers

```bash
./ai-dev-office/run-agent.sh intake "Fix wallet callback failure"
./ai-dev-office/run-agent.sh verify TASK-011
./ai-dev-office/run-agent.sh cleanup
```

These helpers are non-mutating in v2: `intake` previews a PM-ready task,
`verify` recommends evidence commands, and `cleanup` reports stale or
inconsistent runtime artifacts without changing them. Skill guides:
`docs/skills/office-intake.md`, `docs/skills/office-verify.md`, `docs/skills/office-cleanup.md`.

### Bootstrap a target project

```bash
./ai-dev-office/scripts/bootstrap-project.sh --target ../target-project --profile generic
./ai-dev-office/scripts/sync-to-project.sh --target ../target-project --profile games-labs
```

`bootstrap-project.sh` creates starter project files such as `AGENTS.md`,
`office.config.yaml`, `.agents/skills/`, `.cursor/rules/`, `.cursor/agents/`,
and starter docs. `sync-to-project.sh` refreshes the installed framework files.
Both commands follow `templates/install-manifest.yaml` and do not copy runtime
task history, logs, or local machine config by default.

### SocratiCode context provider

`run-agent.sh` can inject a local SocratiCode context section into each role
prompt for code-impacting work. GitHub/local checkout remains the source of
truth for code, branches, PRs, and CI; SocratiCode is only an AI working-context
index.

#### Codebase truth and navigation

- Repository source code is the authoritative source of truth.
- SocratiCode is the primary discovery and navigation layer for repository-specific work.
- Agents must treat SocratiCode search results, symbol summaries, and graph output as navigation aids, not final evidence.
- When indexed context and repository source code conflict, repository source code wins.

Default behavior is optional and recorded:

- If `socraticode` is available, the runner adds `--- AI CONTEXT INDEX ---` to
  the prompt and logs a `context_provider` event in `meta.yaml`.
- If it is unavailable, fails, or returns no context, the runner falls back to
  local repo inspection (`rg`, files on disk, tests, CI evidence) without
  failing the run.
- For non-code tasks, the runner records `status: skipped`.
- Context injection applies to `pm`, `dev`, `dev-2`, `reviewer`, `debugger`, and `free-roam` (not `devops`; see `office.config.yaml`).
- Agent outputs may include concise `context_sources`; do not paste large search
  results into YAML handoffs.
- **Cursor sessions:** use MCP server `user-socraticode` first (see `.cursor/rules/socraticode.mdc`). Start with `codebase_status` and `codebase_list_projects`; use `codebase_search`, `codebase_symbol`, `codebase_symbols`, `codebase_health`, `codebase_graph_query`, `codebase_graph_circular`, `codebase_impact`, and `codebase_flow` as needed.
- **Codex sessions:** use SocratiCode MCP as the primary query path when exposed; otherwise fall back to the CLI wrapper before manual repo inspection.
- Shared discovery policy and tool routing summary: `AGENTS.md` (Codebase Discovery Policy).

#### Capability layers and exposure gaps

- Central SocratiCode MCP server is the backend capability layer.
- Local `socraticode` CLI wrapper is the shell-access layer for the same discovery system.
- Codex or Cursor session tools are the session-exposed layer and may expose only a subset of backend capabilities.
- A missing tool in the session-exposed layer does not mean the backend capability is missing.
- When a required capability exists in the backend or CLI layer but is not exposed in the current session, agents must say so explicitly and fall back to `scripts/socraticode-tcp-wrapper.sh` or the `socraticode` CLI before manual repository inspection.

#### Required repository discovery flow

Before answering a repository-specific question or planning code-impacting work:

1. Run `codebase_status` with the configured primary project path from local config or the `SOCRATICODE_PRIMARY_PROJECT` env var; if the call fails, hangs, or is unusable, retry with the configured fallback path from `office.config.local.yaml`, `profiles/*.local.yaml`, or `SOCRATICODE_FALLBACK_PROJECT`.
2. Use SocratiCode to locate the relevant files, symbols, endpoints, configs, contracts, or related services.
3. Read the actual repository files before making implementation claims, routing decisions, or review verdicts.
4. Verify implementation details against source code, tests, and command output.

Agents must not answer codebase-specific questions from memory alone.

If both projectPath attempts fail or SocratiCode is unavailable, misconfigured, or not indexed, the agent must explicitly say so in its output and fall back to direct repository inspection.

#### SocratiCode tool routing

Use `codebase_status` first when:

- starting repository-specific investigation
- verifying index readiness
- confirming the configured project is available

Use `codebase_search` when:

- locating implementation
- locating endpoints
- locating handlers
- locating configs
- locating protobuf definitions
- locating database access
- locating event publishers or consumers
- locating docs tied to implementation

Use `codebase_symbol` when:

- inspecting a specific function
- inspecting a struct
- inspecting an interface
- inspecting a method
- inspecting a package-level symbol

Use `codebase_symbols` when:

- listing symbols in a file
- discovering candidate symbols by name before drilling into one

Use graph tools when available for:

- tracing dependencies
- impact analysis
- caller/callee analysis
- circular dependency investigation

Session exposure note:

- `codebase_graph_query` and `codebase_graph_stats` may exist in the backend and local CLI wrapper even when they are not exposed in the current session MCP tool surface.
- In that case, use `socraticode codebase_graph_query ...` or `socraticode codebase_graph_stats ...` through `scripts/socraticode-tcp-wrapper.sh` and record the fallback in `context_sources.socraticode`.

#### Command routing and data source

SocratiCode uses **two backends** in this workspace:

| Backend | `projectPath` | Access | Infra |
|---------|---------------|--------|-------|
| Remote canonical | `SOCRATICODE_PRIMARY_PROJECT` | MCP via `socraticode-remote` (SSH → configured host) or `socraticode-tcp-wrapper.sh` | Remote SocratiCode host |
| Local Docker | `SOCRATICODE_FALLBACK_PROJECT` | MCP/CLI via `npx -y socraticode` on this Mac | Docker: Qdrant (`:16333`) + Ollama (`:11435`) |

The `socraticode-tcp-wrapper.sh` routes **remote-backed** commands over SSH and falls back to **local Docker SocratiCode** (`npx -y socraticode` via `socraticode-local-mcp-client.js`) when remote is unreachable:

- `context`, `codebase_status`: remote TCP first → local Docker MCP fallback
- `codebase_search`, `codebase_symbol`: remote central index first → local Docker MCP fallback
- `codebase_graph_*`: remote graph first → local `socraticode-graph-helper.js` fallback

Set `SOCRATICODE_BACKEND=local` to skip remote entirely (Mac + local Docker only).

For the **local Docker fallback**, use `npx -y socraticode` (or Cursor MCP configured to `npx -y socraticode`, not `socraticode-remote`) with the configured fallback project path. Do not treat this path as direct repo inspection — it is still SocratiCode indexed navigation.

Environment overrides:

- `SOCRATICODE_LOCAL_PROJECT`: default local repo root for the Docker-indexed fallback.
- `SOCRATICODE_GRAPH_ROOT`: default local root for graph commands.
- `SOCRATICODE_REMOTE_HOST`, `SOCRATICODE_REMOTE_PORT`,
  `SOCRATICODE_REMOTE_PROJECT`, `SOCRATICODE_SSH_KEY`: remote TCP provider
  settings for context and status.

#### JSON response examples

`codebase_status` returns provider-level status from the remote TCP service:

```json
{
  "type": "success",
  "method": "codebase_status",
  "message": "Codebase is indexed and ready",
  "status": "active"
}
```

`codebase_search` returns remote line matches from the central index:

```json
{
  "type": "success",
  "method": "codebase_search",
  "query": "MockAuthService",
  "projectPath": "${SOCRATICODE_PRIMARY_PROJECT}/api-gateway",
  "count": 2,
  "results": [
    { "file": "services/auth_service.go", "line": 81, "snippet": "type MockAuthService struct {" }
  ]
}
```

`codebase_symbol` returns a preferred definition plus all matches from the
central checkout:

```json
{
  "type": "success",
  "method": "codebase_symbol",
  "name": "ValidateToken",
  "projectPath": "${SOCRATICODE_PRIMARY_PROJECT}/api-gateway",
  "definition": {
    "file": "services/auth_service.go",
    "line": 39,
    "kind": "method",
    "isDefinition": true
  },
  "matches": []
}
```

`codebase_graph_query` returns remote package edges for a file:

```json
{
  "type": "success",
  "method": "codebase_graph_query",
  "file": "api-gateway/services/auth_service.go",
  "packagePath": "github.com/SparqLab/games-lab/api-gateway/services",
  "imports": [
    {
      "importPath": "github.com/SparqLab/games-lab/api-gateway/middleware",
      "resolvedPackagePath": "github.com/SparqLab/games-lab/api-gateway/middleware",
      "resolvedFiles": ["api-gateway/middleware/auth.go"],
      "local": true
    }
  ],
  "dependents": [
    {
      "file": "api-gateway/gateway/http.go",
      "packagePath": "github.com/SparqLab/games-lab/api-gateway/gateway"
    }
  ],
  "summary": {
    "directImports": 8,
    "localImports": 2,
    "localDependents": 1
  }
}
```

`codebase_graph_stats` returns remote graph totals:

```json
{
  "type": "success",
  "method": "codebase_graph_stats",
  "projectPath": "${SOCRATICODE_FALLBACK_PROJECT}",
  "fileCount": 402,
  "packageCount": 178,
  "localEdgeCount": 489,
  "externalEdgeCount": 1853,
  "topConnectedFiles": [],
  "topConnectedPackages": [],
  "orphanFiles": []
}
```

`codebase_graph_circular` returns remote package cycles:

```json
{
  "type": "success",
  "method": "codebase_graph_circular",
  "projectPath": "${SOCRATICODE_FALLBACK_PROJECT}",
  "cycleCount": 0,
  "cycles": []
}
```

When `--projectPath` is invalid for local commands, the wrapper fails clearly
instead of falling back silently:

```json
{
  "type": "error",
  "method": "codebase_graph_stats",
  "error": "Invalid projectPath: /does/not/exist"
}
```

### Run integration tests

```bash
# Individual scenarios
ai-dev-office/tests/integration/contract-foundation.sh
ai-dev-office/tests/integration/dependency-policy.sh
ai-dev-office/tests/integration/dependency-guard.sh
ai-dev-office/tests/integration/auto-parallel.sh
ai-dev-office/tests/integration/context-provider.sh
ai-dev-office/tests/integration/operator-commands.sh
ai-dev-office/tests/integration/status-command.sh
ai-dev-office/tests/integration/runner-fallback.sh
ai-dev-office/tests/integration/bootstrap-sync.sh
ai-dev-office/tests/integration/profile-merge.sh
```

| Script | What it checks |
|--------|----------------|
| `contract-foundation.sh` | Portable framework contract files, protected fields, install manifest boundaries |
| `dependency-policy.sh` | Blocked dispatch guard, automatic unblock, Dev-to-Reviewer handoff |
| `dependency-guard.sh` | `check-service-dependencies.sh` integration with runner |
| `auto-parallel.sh` | PM parallel plan validation and auto-mode concurrent dev lanes |
| `context-provider.sh` | SocratiCode context injection and fallback recording |
| `operator-commands.sh` | `intake`, `verify`, and `cleanup` helper behavior |
| `status-command.sh` | `status` summary output and next-command routing |
| `runner-fallback.sh` | Runner auto-switch on quota/auth failures |

### Run SocratiCode graph smoke checks

```bash
ai-dev-office/tests/smoke/socraticode-graph.sh
```

This runs:

- `socraticode codebase_graph_query --file api-gateway/services/auth_service.go`
- `socraticode codebase_graph_stats`
- `socraticode codebase_graph_circular`

### Run dependency guard (CI parity for services)

```bash
ai-dev-office/scripts/check-service-dependencies.sh
```

This guard enforces:
- no `go.work` in service roots
- aligned `github.com/SparqLab/shared-lib` versions across all detected dependent repos
- shared-lib enforcement policy is configurable via `SHARED_LIB_POLICY` (see below)
- Docker build rules (`no go mod tidy`, `go build -mod=readonly`)
- compile checks with `GOWORK=off` and `GOFLAGS=-mod=readonly`
- excluded repo: `Games-Labs-Provider` (temporary local Docker visibility workaround)

`run-agent.sh` automatically executes this guard before `reviewer`, `devops`,
and `auto` runs (configurable in `office.config.yaml`).

Configuration (environment variables):

- `SHARED_LIB_POLICY`: `aligned` (default), `latest`, or `pinned`.
  - `aligned`: ensure all guarded services use the same `github.com/SparqLab/shared-lib` version.
  - `latest`: resolve `shared-lib@latest` and ensure all services match that version (network access required).
  - `pinned`: enforce a pinned version; set via `GUARD_SHARED_LIB_VERSION` env var or `.shared-lib-version` file at the workspace or repo-parent.
- `GUARD_SHARED_LIB_VERSION`: when `SHARED_LIB_POLICY=pinned`, set the required version (example: `v1.2.3`).
- `EXCLUDED_SERVICES`: comma-separated list of service names to skip (default: `Games-Labs-Provider`).
- `BUILD_TARGET`: set the `go build` target used for CI-parity compile (default: `./cmd`).

### Scaffold agent output files

```bash
./ai-dev-office/run-agent.sh TASK-011 scaffold dev
./ai-dev-office/run-agent.sh TASK-011 scaffold reviewer
```

Use this when you want a starter `dev-output.yaml`, `dev-2-output.yaml`, or
`reviewer-output.yaml` to fill in manually. Add `--force` to overwrite an
existing output file.

### Migrate legacy runtime files

```bash
ruby ai-dev-office/migrate-legacy-runtime.rb ai-dev-office/runs/TASK-011/reviewer-output.yaml
```

This helper currently supports legacy `reviewer-output.yaml` files that predate the structured `build_check` and `artifacts` fields. You can also pass a task directory such as `TASK-011`. Add `--write` to overwrite supported files in place after reviewing the generated YAML.

---

## Agents

- **PM**: Creates tasks, plans work, assigns to Dev agents. Routes to Dev / Dev-2 (ready) / Free Roam (unclear).
- **Dev**: Writes/modifies code for focused tasks. Routes task to `in_review` for Reviewer.
- **Dev-2**: Senior Dev for complex, cross-cutting work. Routes task to `in_review` for Reviewer.
- **Reviewer**: Reviews code + runs build/tests. Routes to Done (approved) / Debugger (rejected) / DevOps (infra fail) / Free Roam (escalate).
- **Debugger**: Root-cause analysis and targeted fixes. Routes to Reviewer (fix applied) / Dev (more implementation needed) / Free Roam (low confidence).
- **DevOps**: Docker, CI/CD, deployment, infra. Routes to Reviewer (fixed) / Dev (code issue) / Free Roam (stuck).
- **Free Roam**: Senior-level cross-functional solver. Routes to Dev / PM / any agent / Done (abort).

## Workflow

```text
User Request -> PM -> Dev/Dev-2 -> Reviewer -> Done
                 |       \             |
            (unclear)  Dev-2        (rejected)     (infra)
                 |    (parallel)      |               |
                 v        |           v               v
             Free Roam   |        Debugger         DevOps
                         |           |               |
                         |           +-----> Reviewer (fix applied)
                         |           |
                         |           +-----> Dev (more work needed)
                         |                           |
                         +---------------------------+-----> Reviewer (retry)

Dependency gate:
Blocked (waiting on TASK-X/TASK-Y) --unblock when upstream done--> Assigned/In Review

Loop guard:
iteration >= loop_guard.max_iterations --escalate--> Free Roam

Free Roam can reroute to any agent or send back to PM to re-split.
```

### Runtime State Semantics

- `phase` and `state` represent the same runtime state and should stay aligned.
- `in_review` is the active reviewer queue state after Dev/Dev-2 handoff.
- `blocked` means the task is intentionally not dispatchable.
- `blocked_on` lists upstream task ids that must be resolved first.
- `waiting_for` describes the semantic condition (for example `contract_freeze`).
- `ready: false` means "do not dispatch yet"; `ready: true` means routing is allowed.
- `current_agent` is enforced by `run-agent.sh`; running a different agent is rejected.
- `iteration` is tracked in `status.yaml`; when it reaches `loop_guard.max_iterations` (default `8` in `office.config.yaml`), the runner routes to `free-roam` and stops.
- Manual or DevOps verification notes may be recorded in `runs/<task-id>/verification-evidence.md` and referenced from reviewer output.

## Baseline Rules

The source of truth for repo-wide rules is `AGENTS.md`. In particular, every runner and agent must follow:

- Service architecture rules: internal sync via `gRPC`, external access through `api-gateway`, async messaging via `RabbitMQ`
- Isolation rules: no cross-service database access and no shared mutable state outside APIs or events
- Naming conventions: `games-labs-<domain>`, `<Domain>Service`, `gameslabs.<domain>.v1`, and `<domain>.<action>`
- Contract rules: define or update `.proto` first for contract changes, keep changes backward compatible when possible, and version breaking changes
- Safety rules: no hardcoded secrets, no committed `.env` files, no duplicate shared logic, no unnecessary dependencies
- Definition of done: build passes, tests pass or are explicitly skipped for a valid reason, lint passes when applicable, and required proto or generated artifacts are updated

## Runbooks

### New Feature

1. Tell PM what you want: `./run-agent.sh TASK-011 pm`
2. PM creates task, plans subtasks, assigns Dev/Dev-2
3. Expected path: PM -> Dev -> In Review -> Done

### Urgent Bugfix

1. Tell PM with priority critical
2. PM assigns directly to Dev or Dev-2
3. Expected path: PM -> Dev -> In Review -> Done

### Infrastructure / DevOps Task

1. Tell PM about the infra need
2. PM assigns to DevOps (via `type: devops`)
3. Expected path: PM -> DevOps -> In Review -> Done

### Parallel Development

1. PM splits task into subtasks for Dev and Dev-2 with `parallel: true`, distinct owned files, and `parallel_safe: true` on each subtask
2. Either run both in separate terminals, or use `./run-agent.sh TASK-NNN auto` to launch both lanes concurrently
3. Review parallel logs (`dev-parallel.log`, `dev-2-parallel.log`) if auto mode fails
4. Reviewer collects both `dev-output.yaml` and `dev-2-output.yaml` in a single review

---

## Runners

### Priority Order

1. **Codex CLI** — Type: CLI (default), Best for: heavy autonomous work and full-auto mode
2. **Cursor CLI Agent** — Type: CLI, Best for: terminal-driven fallback work with Cursor Agent
3. **Cursor** — Type: IDE (interactive), Best for: complex/interactive tasks and code navigation

### Usage

```bash
./ai-dev-office/run-agent.sh TASK-011 dev              # Codex (default)
./ai-dev-office/run-agent.sh TASK-011 dev codex         # Explicit Codex
./ai-dev-office/run-agent.sh TASK-011 dev cursor-agent  # Run Cursor CLI Agent
./ai-dev-office/run-agent.sh TASK-011 dev cursor        # Generate prompt for Cursor
```

For Cursor: open the IDE, read `ai-dev-office/agents/<agent>.md`, read the task files under `ai-dev-office/runs/<task-id>/`, and follow the output contract strictly. You can also use the generated `.cursor-prompt.md`.

### Mixing Runners

All runners share the same task files (`runs/<task-id>/`), so you can mix freely:

- Dev on Codex + Dev-2 on Cursor (different agents, same task)
- TASK-011 on Cursor Agent + TASK-012 on Codex (different tasks)
- PM on Cursor -> Dev on Cursor Agent -> Reviewer on Codex (sequential handoff)

**Do not** run the same agent on the same task with multiple runners simultaneously — they would overwrite each other's output file.

### Auto-switch

When a runner fails with quota/auth errors, the script retries it, then switches to the next runner in priority order. Codex falls back to Cursor CLI Agent, then to Cursor IDE prompt generation. Watched patterns: `insufficient_quota`, `quota exceeded`, `rate limit`, `unauthorized`, `invalid api key`, `token expired`.

---

## Directory Structure

```text
ai-dev-office/
  office.config.yaml      # Main configuration (v2.0)
  SKILL.md                # Cursor/Codex skill for auto-detection
  README.md               # This file
  role-prompt-templates-codex-first.md  # Concise Codex-first starter prompts per role
  run-agent.sh            # Single-terminal runner script
  validate-yaml.rb        # Runtime validator for status and agent output YAML
  migrate-legacy-runtime.rb  # Helper to upgrade selected legacy runtime YAML files
  scripts/
    check-service-dependencies.sh  # CI-parity dependency guard
    socraticode-tcp-wrapper.sh   # CLI fallback for SocratiCode MCP gaps
    socraticode-central-query.js # Remote index query helper
    socraticode-graph-helper.js    # Remote graph query helper
  tests/
    integration/          # Runner, guard, parallel, operator, and status tests
    smoke/                # SocratiCode graph smoke checks
  docs/
    skills/               # Operator helper guides (intake, verify, cleanup)
    superpowers/          # Office usability specs and implementation plans
  schemas/
    status.schema.yaml        # Validation schema for runs/<task-id>/status.yaml
    meta.schema.yaml          # Validation schema for runs/<task-id>/meta.yaml
    task.schema.yaml          # Structured PM task blueprint schema
    agent-output.schema.yaml  # Base schema for <agent>-output.yaml handoff files
    pm-output.schema.yaml     # PM-specific task and assignment schema
    dev-output.schema.yaml    # Dev routing schema
    dev-2-output.schema.yaml  # Dev-2 routing schema
    reviewer-output.schema.yaml  # Reviewer verdict and build/test schema
    debugger-output.schema.yaml  # Debugger diagnosis schema
    devops-output.schema.yaml    # DevOps infra verification schema
    free-roam-output.schema.yaml # Free Roam decision schema
  agents/
    pm.md                  # PM agent prompt + contract
    dev.md                 # Dev agent prompt + contract
    dev-2.md               # Dev-2 (Senior) agent prompt + contract
    reviewer.md            # Reviewer agent prompt + contract (includes build/test)
    debugger.md            # Debugger agent prompt + contract
    devops.md              # DevOps agent prompt + contract
    free-roam.md           # Free Roam agent prompt + contract
  workflows/
    hybrid-default.yaml    # Default hybrid orchestration workflow (v2.0)
  runners/
    codex.yaml             # Codex CLI runner config (primary/default)
    cursor-agent.yaml      # Cursor CLI Agent runner config (secondary)
    cursor.yaml            # Cursor IDE runner config (interactive fallback)
  tasks/
    templates/
      new-task.yaml        # Task template (legacy, PM creates tasks now)
  runs/
    <task-id>/             # TASK-NNN or TASK-PKG-NNN
      task.md              # Task description (created by PM)
      status.yaml          # Current runtime state and dependency gating
      pm-output.yaml       # PM's plan and assignment
      meta.yaml            # Event log (audit/history), not dispatch source of truth
      .cursor-prompt.md    # Generated Cursor prompt (when using cursor runner)
      verification-evidence.md  # Optional manual build/test evidence (often DevOps)
      dev-parallel.log     # Auto parallel lane log (when applicable)
      dev-2-parallel.log   # Auto parallel lane log (when applicable)
      <agent>-output.yaml  # Each agent's output
```

Task metadata in `pm-output.yaml` supports a stable `task.id`, a full `task.title`,
an optional compact `task.short_name` for logs and terminal displays, plus
optional `task.parent` / `task.epic` fields for grouped or child work.
Concise role starters for Codex-first sessions: `role-prompt-templates-codex-first.md`.
Agent permission boundaries: `SKILL.md`.

## Legacy Agents

The following agents existed in v1.0 and have been replaced:

- `Planner` -> **PM**: PM does everything Planner did + creates tasks + assigns work.
- `Tester` -> **Reviewer** + **DevOps**: Reviewer now runs build/tests; DevOps handles infra issues.

Legacy prompt files may still exist for reference, but the active v2 workflow uses `pm`, `dev`, `dev-2`, `reviewer`, `debugger`, `devops`, and `free-roam`.
