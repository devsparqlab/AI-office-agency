# AI Skills

Reusable AI working skills for Codex, Cursor, Claude, and other coding agents.

This directory is intentionally separate from `ai-dev-office/`.

- `ai-dev-office/` is the orchestration layer: agents, runners, workflow, schemas, task state.
- `ai-skills/` is the reusable thinking layer: checklists, review rules, debugging habits, and integration guardrails.

## Recommended use

Copy or sync this directory into each project, or split it into a standalone repository such as `vestearth/ai-skills`.

```text
project-root/
  AGENTS.md
  .cursor/rules/
  ai-dev-office/      # optional orchestration framework
  ai-skills/          # reusable skill/checklist library
```

## Skill index

| Skill | Use when |
| --- | --- |
| `debugging` | Investigating bugs, broken behavior, failed tests, logs, stack traces |
| `code-review` | Reviewing code changes before merge or handoff |
| `api-contract-review` | Changing API responses, protobuf contracts, gateway routes, mobile/web contracts |
| `dependency-guard` | Changing Go modules, Dockerfiles, CI build rules, or shared-lib versions |
| `vendor-integration` | Integrating external game/payment/provider callbacks or seamless APIs |
| `microservice-boundary-review` | Changing service ownership, gRPC/RabbitMQ flows, cross-service behavior |
| `release-checklist` | Preparing deployment, production rollout, verification, or rollback notes |

## Adapter strategy

Adapters should be thin. Do not duplicate full skill text in tool-specific files.

- Codex: reference this directory from `AGENTS.md`.
- Cursor: use `.mdc` rules that route to the matching `ai-skills/<skill>/SKILL.md`.
- Claude Code: expose each skill folder as a Claude-compatible skill.

## Source of truth rule

The actual repository files, tests, build output, CI, and production logs always beat AI memory, indexed context, old summaries, or previous task history. Apparently this needs to be written down because machines learned confidence from humans.
