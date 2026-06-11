# TASK-070: IDG Bet-Debit Gameplay Turnover Settlement

## Short name
`idg-bet-debit-turnover`

## Type
bugfix

## Priority
high

## Parent / Epic
- Parent: `TASK-069`
- Epic: Quest Daily Turnover / Provider Gameplay Settlement

## Background

`daily-turnover-6000` progresses only from Game `turnover.settled` events. IDG currently debits wallet on `IDGBet`, caches stake in Redis, then calls Game `SettleRound` on `IDGWin`. Runtime evidence showed `wallet_transactions` with `idg:bet:*` `DEBIT` rows, but no `round_lifecycles`, so the win/cache path is too fragile for Quest turnover.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `Games-Labs-Provider` | Move IDG gameplay turnover production to the wallet-success bet callback and remove reliance on win-time Redis stake lookup. |
| `Games-Labs-Game` | No code change expected; receives `SettleRound` and emits `turnover.settled`. |
| `ai-dev-office` | Track verification evidence and provider-specific handoff. |

### Affected files

- `Games-Labs-Provider/internal/core/services/idg/callback.go`
- `Games-Labs-Provider/internal/core/services/idg/turnover.go`
- `Games-Labs-Provider/internal/core/services/idg/callback_test.go`
- `Games-Labs-Provider/internal/core/services/idg/turnover_test.go`
- `Games-Labs-Provider/README.md`
- `ai-dev-office/runs/TASK-070/verification-evidence.md`

### Explicitly out of scope

- Do not make Missions query `wallet_transactions`.
- Do not map `spend.settled` onto `TURNOVER_AMOUNT`.
- Do not change shared-lib proto/event contracts unless a hard blocker is found.
- Do not alter other providers in this task.

## Acceptance criteria

- [ ] `IDGBet` calls Game `SettleRound` only after `IDGDebitWallet` succeeds.
- [ ] `SettleRound` uses `round_id=wagerID`, `user_id=userID`, `game_id=gameID`, `provider_code=idg`, and `settled_amount=parsed Amount`.
- [ ] `IDGWin` no longer sends a second gameplay `SettleRound` for the same wager.
- [ ] Wallet debit failures do not call `SettleRound`.
- [ ] `IDGCancel` reverse behavior is implemented or explicitly documented as a blocker before enabling bet-time counting in staging.
- [ ] Unit tests cover bet success, wallet failure, win no-double-count, and cancel/reversal behavior.
- [ ] Provider README and `verification-evidence.md` show the SQL/log checklist for IDG.
- [ ] `go test ./internal/core/services/idg ./internal/handlers/idghdl` and `go test ./...` pass in `Games-Labs-Provider`.

## Technical plan

1. Add failing tests showing `IDGBet` sends `SettleRound` after successful debit and does not send it on debit failure.
2. Add failing test showing `IDGWin` does not double-settle after bet-time settlement.
3. Decide and implement the smallest safe `IDGCancel` reverse path or document a staging blocker if Game lacks the required reverse contract.
4. Update IDG turnover helper/tests to make bet amount the authoritative turnover source instead of Redis cache.
5. Update docs and verification evidence with runtime log + SQL checks.

## Risks

| Risk | Mitigation |
| --- | --- |
| Counting at bet time over-counts canceled wagers. | Implement or explicitly block on reverse/cancel handling before staging enablement. |
| Duplicate callbacks double-count turnover. | Rely on Game `round_lifecycles` insert gate and avoid win-time second settle. |
| Provider game id does not resolve in Game. | Keep `provider_code=idg` and verify Game logs/DB after one test round. |

## Assignment

- Primary: `dev-2`
- Parallel: `false`

## Next action

Run `./ai-dev-office/run-agent.sh TASK-070 dev-2`.
