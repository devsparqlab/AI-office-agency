# TASK-074: Sigma Gameplay Turnover Settlement Validation

## Short name
`sigma-turnover-validation`

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

Sigma currently maps `tx.Debit` to `SettleRound` on end-round paths, but prior evidence noted Sigma wallet behavior may be stubbed or less E2E-ready than other providers. This task isolates Sigma so it can be validated without blocking IDG/1UP/VP/GGSoft.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `Games-Labs-Provider` | Validate Sigma end-round hooks and debit-based turnover source. |
| `Games-Labs-Game` | No code change expected. |
| `ai-dev-office` | Track provider-specific verification evidence. |

### Affected files

- `Games-Labs-Provider/internal/core/services/sigma/service.go`
- `Games-Labs-Provider/internal/core/services/sigma/turnover.go`
- `Games-Labs-Provider/internal/core/services/sigma/turnover_test.go`
- `Games-Labs-Provider/internal/handlers/sigmahdl`
- `Games-Labs-Provider/README.md`
- `ai-dev-office/runs/TASK-074/verification-evidence.md`

## Acceptance criteria

- [ ] Sigma calls Game `SettleRound` only on real wallet-success end-round paths.
- [ ] `settled_amount` uses authoritative stake/debit amount and has documented unit semantics.
- [ ] Cancel/reverse paths do not create forward turnover and reverse gap is documented if not implemented.
- [ ] Tests cover debit amount, zero debit, end-round gate, and non-settlement paths.
- [ ] README/evidence clearly states whether Sigma is fully E2E verified or intentionally deferred.

## Technical plan

1. Reuse TASK-070 evidence format.
2. Inspect Sigma wallet path and determine whether E2E is live or stubbed.
3. Tighten hook tests; defer runtime enablement if wallet path is not real.
4. Run provider tests and record staging checklist or deferral reason.

## Assignment

- Primary: `dev-2`
- Parallel: `false`

## Next action

Blocked until `TASK-070` is done, then run `./ai-dev-office/run-agent.sh TASK-074 dev-2`.
