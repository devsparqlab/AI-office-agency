# Project Rules

This file is the target project's own `AGENTS.md`.

## Source of Truth

- The project repository is the source of truth for code, tests, and runtime behavior.
- This framework provides reusable workflow guidance, but project-specific rules win for the target repo.

## Working Rules

- Keep changes scoped to the task at hand.
- Prefer the project's existing patterns and conventions.
- Treat generated artifacts, logs, and task history as runtime data unless the task explicitly says otherwise.
- Put local config and machine-specific values in ignored files.

## AI Dev Office Install Boundary

- Use `ai-dev-office/templates/install-manifest.yaml` to decide what may be installed or synced into this project.
- Use `ai-dev-office/scripts/bootstrap-project.sh` for first-time setup and `ai-dev-office/scripts/sync-to-project.sh` for refreshes.
- Do not install or sync AI Dev Office runtime task history, logs, generated handoff outputs, secrets, local config, or machine-specific MCP files by default.
- Keep project-specific behavior in this project's own `AGENTS.md`, `office.config.yaml`, selected profiles, ignored local config, environment variables, or CLI flags.
- Cursor user-global MCP config, such as `/Users/earth/.cursor/mcp.json`, is host-local. It selects remote or local SocratiCode for that workstation and does not belong in target repos.

## Review Priorities

- Correctness first.
- Match the project contract and test suite.
- Avoid introducing unnecessary dependencies or broad refactors.
