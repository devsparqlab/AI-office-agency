# TASK-075: AFB Gameplay Turnover Reference Validation

## Short name
`afb-turnover-reference`

## Type
bugfix

## Priority
medium

## Parent / Epic
- Parent: `TASK-069`
- Epic: Quest Daily Turnover / Provider Gameplay Settlement

## Status

Ready for implementation. `TASK-070` through `TASK-073` established the provider-specific verification pattern and staging runtime checklist.

## Background

AFB is the reference provider for gameplay turnover. It should continue to use payout-time `valid_turnover` as authoritative, not raw wallet debit rows, unless staging evidence proves a provider contract mismatch. This task preserves AFB semantics while adding the same focused verification evidence as other provider lanes.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `Games-Labs-Provider` | Validate AFB payout-time turnover and fallback behavior. |
| `Games-Labs-Game` | No code change expected. |
| `ai-dev-office` | Track provider-specific verification evidence. |

### Affected files

- `Games-Labs-Provider/internal/core/services/afb/service.go`
- `Games-Labs-Provider/internal/core/services/afb/turnover_test.go`
- `Games-Labs-Provider/README.md`
- `ai-dev-office/runs/TASK-075/verification-evidence.md`

## Acceptance criteria

- [ ] AFB still calls Game `SettleRound` from `Payout` only after wallet transactions succeed.
- [ ] `settled_amount` uses payout `valid_turnover`, then transaction `valid_turnover`, then max debit magnitude fallback.
- [ ] Bet-only wallet rows are documented as insufficient for Quest turnover until payout arrives.
- [ ] Tests cover valid_turnover primary, transaction fallback, debit fallback, and zero/no-turnover behavior.
- [ ] README/evidence include AFB log grep and SQL checklist.

## Technical plan

1. Reuse TASK-070 evidence format.
2. Validate current AFB tests and add missing fallback/skip cases.
3. Confirm docs warn QA that `afb:bet:*` alone will not progress turnover.
4. Run provider tests and record staging checklist.

## Assignment

- Primary: `dev-2`
- Parallel: `false`

## Next action

Run `./ai-dev-office/run-agent.sh TASK-075 dev-2`.
