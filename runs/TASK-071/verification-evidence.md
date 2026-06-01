# TASK-071 — 1UP gameplay turnover verification

## Unit tests

```bash
cd Games-Labs-Provider
go test ./internal/core/services/oneup ./internal/handlers/providerhdl
go test ./...
```

Expected: all pass; `oneup` package covers `bets/result` SettleRound after successful wallet debit/win, wallet failure skip, request bet primary, cached bet fallback, zero/no-source turnover, and refund no forward settle.

## Provider logs (after one 1UP bet result round)

```bash
docker logs games-labs-provider-dev 2>&1 | grep -E '1up:bets/result|SettleRound|GAME_API_URL' | tail -40
```

| Log pattern | Meaning |
| --- | --- |
| `GAME_API_URL configured; gameplay SettleRound/turnover publishing enabled` | Provider can reach Game |
| `[1up:bets/result] game SettleRound success round_id=<betID>` | `bets/result` settled gameplay turnover after wallet debit/win success |
| `[1up:bets/result] skip SettleRound` | Missing `GAME_API_URL` or invalid round/user/game input prevented settlement notification |
| No `[1up:*refund*] game SettleRound` row | Refund path did not send forward turnover settlement |

## Wallet SQL (bet debit/refund recorded)

```sql
SELECT idempotency_key, type, amount, created_at
FROM wallet_transactions
WHERE idempotency_key LIKE '1up:bet:%'
   OR idempotency_key LIKE '1up:win:%'
   OR idempotency_key LIKE '1up:refund:%'
ORDER BY created_at DESC
LIMIT 10;
```

## Game SQL (round lifecycle from bet result)

```sql
SELECT round_id, user_id, game_id, game_type, settled_amount, settled_at, reversed_at
FROM round_lifecycles
WHERE round_id = '<betID from test round>'
LIMIT 1;
```

Expect: one row with `settled_amount` matching request `bet`; if request `bet` was zero, expect fallback to cached `oneup:bet:amount:<betID>` amount when present. `reversed_at` remains NULL because 1UP refund does not implement a reverse Game contract.

## Missions consumer (downstream)

```sql
SELECT event_type, created_at
FROM daily_activity_consumer_events
WHERE event_type = 'turnover.settled'
ORDER BY created_at DESC
LIMIT 5;
```

## Runtime closure note

- Final staging validation exposed environment drift outside the scoped 1UP code path: Provider `GAME_API_URL` initially targeted `games-labs-game-service:50053` from the VPS Docker runtime and failed DNS resolution until it was corrected to Game NodePort `84.247.150.206:30553`.
- After `SettleRound` started succeeding, gameplay turnover still did not reach Missions because `Games-Labs-Game` and `Games-Labs-Missions` were configured with different `RABBITMQ_URL` values. Aligning both to the same broker restored `turnover.settled` consumption.
- Final staging signal: new `bets/result` rounds created `round_lifecycles` rows, `daily_activity_consumer_events` received `turnover.settled`, and `quest/overview` showed live Daily turnover progress.

## Regression checks

1. Send `bets/result` with positive `bet` and successful wallet operations -> confirm `[1up:bets/result] game SettleRound success` and `round_lifecycles.settled_amount = bet`.
2. Force wallet debit or win credit failure -> confirm callback returns mapped wallet error and no `[1up:bets/result] game SettleRound` log for that `betID`.
3. Send `bets/result` with `bet = 0` for a previously cached bet -> confirm `settled_amount` uses `oneup:bet:amount:<betID>`.
4. Send `bets/refund` -> confirm wallet refund behavior but no forward `SettleRound` log and no new `round_lifecycles` row.
