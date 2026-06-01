# TASK-073: GGSoft Gameplay Turnover Settlement Validation

## Short name
`ggsoft-turnover-validation`

## Type
bugfix

## Priority
medium

## Parent / Epic
- Parent: `TASK-069`
- Epic: Quest Daily Turnover / Provider Gameplay Settlement

## Status

Ready for implementation. `TASK-070` through `TASK-072` established the provider-specific verification pattern and staging runtime checklist.

## Background

GGSoft has separate callback types. Current code stores bet state on type `1`, and calls Game `SettleRound` on type `4` when `end_round=true`, using `req.Bet`. This task validates whether type `4` always carries authoritative bet turnover or should consume cached bet state from type `1`.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `Games-Labs-Provider` | Validate GGSoft type-specific turnover source and end-round gate. |
| `Games-Labs-Game` | No code change expected. |
| `ai-dev-office` | Track provider-specific verification evidence. |

### Affected files

- `Games-Labs-Provider/internal/core/services/ggsoft/service.go`
- `Games-Labs-Provider/internal/core/services/ggsoft/turnover.go`
- `Games-Labs-Provider/internal/core/services/ggsoft/turnover_test.go`
- `Games-Labs-Provider/README.md`
- `ai-dev-office/runs/TASK-073/verification-evidence.md`

## Acceptance criteria

- [ ] Type `4` with `end_round=true` calls Game `SettleRound` only after wallet operation succeeds.
- [ ] `settled_amount` uses authoritative bet turnover, either `req.Bet` or cached type `1` bet state when type `4` omits it.
- [ ] Type `1`, type `2` cancel, type `3` award, and type `4 end_round=false` do not create forward turnover.
- [ ] Tests cover type-specific hook/skip behavior and turnover fallback.
- [ ] README/evidence include GGSoft log grep and SQL checklist.

## Technical plan

1. Reuse TASK-070 evidence format.
2. Confirm GGSoft request shape and whether type `4` reliably carries `bet`.
3. Add fallback to stored bet state only if required by source/tests.
4. Run provider tests and record staging checklist.

## Assignment

- Primary: `dev-2`
- Parallel: `false`

## Next action

Run `./ai-dev-office/run-agent.sh TASK-073 dev-2`.
