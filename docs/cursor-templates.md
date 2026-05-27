# Cursor Templates Guide

Optional Cursor integration files help IDE agents follow the AI Dev Office workflow without duplicating role prompts.

## Install paths

Bootstrap/sync can prepare empty directories:

```bash
./ai-dev-office/scripts/bootstrap-project.sh --target ../target-project --profile generic
```

Creates `.cursor/rules/` and `.cursor/agents/` in the target project when missing.
Framework files install under `target/ai-dev-office/`; Cursor paths are at the target project root.

## `.cursor/rules/`

| File | Purpose |
|------|---------|
| `ai-dev-office.mdc` | Always-on orchestration: read `agents/*.md`, follow handoff YAML, validate runtime files |
| `ai-dev-office-<role>.mdc` | Optional per-role picker entries delegating to `agents/<role>.md` |
| `socraticode.mdc` | Optional SocratiCode discovery routing (when using indexed navigation) |

Rules should **delegate** to `ai-dev-office/agents/*.md` — do not copy long role text into rules.

## `.cursor/agents/`

When Cursor subagents are enabled, one stub per role:

```text
.cursor/agents/ai-dev-office-pm.md
.cursor/agents/ai-dev-office-dev.md
...
```

Each stub points to the matching file under `ai-dev-office/agents/`. Subagent definitions live in the target project's `.cursor/agents/`; the framework ships patterns, not machine-specific copies.

## What not to install

Per `templates/install-manifest.yaml` exclude rules, do **not** copy into target projects:

- `runs/**`, task output YAML, logs, `.cursor-prompt.md`
- `office.config.local.yaml`, `profiles/*.local.yaml`, `.env`, `.socraticode.local.yaml`
- Machine-specific paths or secrets

## Related docs

- [cursor.md](cursor.md) — IDE and cursor-agent runner flow
- [getting-started.md](getting-started.md) — bootstrap and sync commands
