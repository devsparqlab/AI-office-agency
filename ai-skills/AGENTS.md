# AI Skills Agent Guide

This guide teaches coding agents how to use the reusable skill library.

## Purpose

`ai-skills/` provides reusable working principles for AI coding agents. It does not replace project-specific `AGENTS.md`, architecture documents, source code, tests, or CI output.

Use skills to improve the way you investigate, review, plan, and communicate changes.

## Priority order

When instructions conflict, follow this order:

1. User request and explicit scope
2. Project root `AGENTS.md`
3. Actual source code, tests, build output, CI, logs
4. `ai-dev-office/` task state and role contract, if running inside the office workflow
5. `ai-skills/` reusable skill guidance
6. Prior chat history or memory

## Required behavior

- Pick the smallest relevant skill set for the task.
- Do not blindly apply every skill.
- Do not turn a simple edit into an architecture review ritual. Humanity already invented meetings; do not recreate them in markdown.
- For repository-specific claims, inspect real files before asserting implementation details.
- Record uncertainty clearly when evidence is missing.

## Common routing

| User intent | Recommended skill |
| --- | --- |
| Bug, failed test, broken endpoint, logs | `skills/debugging/SKILL.md` |
| PR review, code review, before merge | `skills/code-review/SKILL.md` |
| API response shape, protobuf, gateway, mobile/web contract | `skills/api-contract-review/SKILL.md` |
| Go modules, Docker build, shared-lib, CI parity | `skills/dependency-guard/SKILL.md` |
| Provider API, callback, signature, staging/prod integration | `skills/vendor-integration/SKILL.md` |
| Service ownership, gRPC, RabbitMQ, cross-service impact | `skills/microservice-boundary-review/SKILL.md` |
| Deploy, release, rollback, smoke test | `skills/release-checklist/SKILL.md` |

## Output style

Prefer concise, evidence-based output:

- finding
- evidence
- risk
- recommended action
- verification command or test

Do not produce giant essays unless the user asks for deep analysis. The goal is to make agents less chaotic, not to create a second internet made of checklists.
