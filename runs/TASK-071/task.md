# TASK-071: 1UP Gameplay Turnover Settlement Validation

## Short name
`oneup-turnover-validation`

## Type
bugfix

## Priority
medium

## Parent / Epic
- Parent: `TASK-069`
- Epic: Quest Daily Turnover / Provider Gameplay Settlement

## Status

Blocked until `TASK-070` establishes the provider-specific verification pattern.

## Background

1UP already calls Game `SettleRound` from `bets/result` after wallet debit/win success and maps `req.Bet` through `utils.MinorToMajor`, with Redis bet amount fallback. This task isolates 1UP for focused verification and any small alignment needed after the IDG repair.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `Games-Labs-Provider` | Validate 1UP turnover source, hook point, skip paths, and runtime evidence. |
| `Games-Labs-Game` | No code change expected; receives `SettleRound`. |
| `ai-dev-office` | Track provider-specific verification evidence. |

### Affected files

- `Games-Labs-Provider/internal/core/services/oneup/callback.go`
- `Games-Labs-Provider/internal/core/services/oneup/turnover.go`
- `Games-Labs-Provider/internal/core/services/oneup/turnover_test.go`
- `Games-Labs-Provider/internal/handlers/providerhdl/oneup_callback_test.go`
- `Games-Labs-Provider/README.md`
- `ai-dev-office/runs/TASK-071/verification-evidence.md`

## Acceptance criteria

- [ ] `bets/result` calls Game `SettleRound` only after wallet debit/win operations succeed.
- [ ] `settled_amount` is authoritative bet turnover: `req.Bet` primary, cached bet amount fallback, minor-to-major conversion verified.
- [ ] Refund paths do not call `SettleRound` unless a reverse contract is intentionally implemented.
- [ ] Tests cover success, wallet failure, fallback, zero bet, and refund skip.
- [ ] README/evidence include 1UP log grep and SQL checklist.

## Technical plan

1. Reuse TASK-070 evidence format.
2. Add or tighten table tests around 1UP turnover conversion and fallback.
3. Add service/handler assertions for wallet failure and refund skip.
4. Run provider tests and record one staging round checklist.

## Assignment

- Primary: `dev-2`
- Parallel: `false`

## Next action

Blocked until `TASK-070` is done, then run `./ai-dev-office/run-agent.sh TASK-071 dev-2`.
