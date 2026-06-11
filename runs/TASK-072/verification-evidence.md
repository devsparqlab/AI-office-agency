# TASK-072 — VP betnsettle gameplay turnover verification

## Unit tests

```bash
cd Games-Labs-Provider
go test ./internal/core/services/vp ./internal/handlers/vphdl
go test ./...
```

Expected: all pass; `vp` package covers `betnsettle` SettleRound after wallet-success net delta, `validBetAmt` primary with `actualBetAmt` fallback, zero/no-positive-turnover handling, wallet failure skip, and no forward settlement on `balance` / `rollback`.

## Provider logs (after one VP betnsettle round)

```bash
docker logs games-labs-provider-dev 2>&1 | grep -E 'vp:betnsettle|SettleRound|GAME_API_URL' | tail -40
```

| Log pattern | Meaning |
| --- | --- |
| `GAME_API_URL configured; gameplay SettleRound/turnover publishing enabled` | Provider can reach Game |
| `[vp:betnsettle] game SettleRound success round_id=<roundId or txRef>` | `betnsettle` settled gameplay turnover after wallet net delta success |
| `[vp:betnsettle] skip SettleRound` | Missing `GAME_API_URL` or invalid round/user/game input prevented settlement notification |
| No `[vp:*rollback*] game SettleRound` row | `rollback` path did not send forward turnover |

## Wallet SQL (betnsettle ledger recorded)

```sql
SELECT idempotency_key, type, amount, created_at
FROM wallet_transactions
WHERE idempotency_key LIKE 'vp:betnsettle:%'
   OR idempotency_key LIKE 'vp:rollback:%'
ORDER BY created_at DESC
LIMIT 10;
```

## Game SQL (round lifecycle from betnsettle)

```sql
SELECT round_id, user_id, game_id, game_type, settled_amount, settled_at, reversed_at
FROM round_lifecycles
WHERE round_id = '<roundId or txRef from test round>'
LIMIT 1;
```

Expect: one row with `settled_amount` matching `validBetAmt`; if `validBetAmt` was zero, expect fallback to positive `actualBetAmt`. `reversed_at` remains NULL because VP rollback does not implement a Game reverse contract in this task.

## Missions consumer (downstream)

```sql
SELECT event_id, event_type, status, created_at
FROM daily_activity_consumer_events
WHERE event_type = 'turnover.settled'
ORDER BY created_at DESC
LIMIT 5;
```

## Runtime note

- The shared staging checklist from TASK-070/TASK-071 still applies: Provider `GAME_API_URL` must target Game NodePort (`84.247.150.206:30553` in the current VPS setup), and `Games-Labs-Game` plus `Games-Labs-Missions` must share the same `RABBITMQ_URL` so `turnover.settled` reaches Missions.

## Regression checks

1. Send `betnsettle` with positive `validBetAmt` and successful wallet delta -> confirm `[vp:betnsettle] game SettleRound success` and `round_lifecycles.settled_amount = validBetAmt`.
2. Send `betnsettle` with `validBetAmt = 0` but positive `actualBetAmt` -> confirm `settled_amount` falls back to `actualBetAmt`.
3. Force wallet debit/credit failure -> confirm VP returns mapped wallet error and no `[vp:betnsettle] game SettleRound` log for that round.
4. Send `balance` or `rollback` -> confirm normal wallet response/balance lookup but no forward `SettleRound` log and no new `round_lifecycles` row.
