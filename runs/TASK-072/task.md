# TASK-072: VP BetNSettle Gameplay Turnover Validation

## Short name
`vp-betnsettle-turnover`

## Type
bugfix

## Priority
medium

## Parent / Epic
- Parent: `TASK-069`
- Epic: Quest Daily Turnover / Provider Gameplay Settlement

## Status

Ready for implementation. `TASK-070` and `TASK-071` established the provider-specific verification pattern and staging runtime checklist.

## Background

VP uses a combined `betnsettle` callback. Current mapper uses `validBetAmt` with fallback to `actualBetAmt` and calls Game `SettleRound` after wallet net delta succeeds. This task validates that behavior as a provider-specific lane and documents any reversal/rollback gap.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `Games-Labs-Provider` | Validate VP turnover source, hook point, wallet-success gate, and rollback skip behavior. |
| `Games-Labs-Game` | No code change expected. |
| `ai-dev-office` | Track provider-specific verification evidence. |

### Affected files

- `Games-Labs-Provider/internal/core/services/vp/seamless.go`
- `Games-Labs-Provider/internal/core/services/vp/turnover.go`
- `Games-Labs-Provider/internal/core/services/vp/turnover_test.go`
- `Games-Labs-Provider/internal/handlers/vphdl`
- `Games-Labs-Provider/README.md`
- `ai-dev-office/runs/TASK-072/verification-evidence.md`

## Acceptance criteria

- [ ] `betnsettle` calls Game `SettleRound` only after wallet delta succeeds.
- [ ] `settled_amount` uses `validBetAmt`, falling back to `actualBetAmt`, never net win/loss.
- [ ] Balance, rollback, and wallet failure paths do not create forward turnover.
- [ ] Tests cover primary amount, fallback amount, zero amount, wallet failure, and rollback skip.
- [ ] README/evidence include VP log grep and SQL checklist.

## Technical plan

1. Reuse TASK-070 evidence format.
2. Tighten VP mapper and callback tests around betnsettle-only semantics.
3. Document whether rollback requires a future `turnover.reversed` task.
4. Run provider tests and record staging checklist.

## Assignment

- Primary: `dev-2`
- Parallel: `false`

## Next action

Run `./ai-dev-office/run-agent.sh TASK-072 dev-2`.
