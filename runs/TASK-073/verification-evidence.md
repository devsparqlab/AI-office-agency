# TASK-073 — GGSoft gameplay turnover verification

## Unit tests

```bash
cd Games-Labs-Provider
go test ./internal/core/services/ggsoft
go test ./...
```

Expected: all pass; `ggsoft` package covers type `4` `SettleRound` after wallet-success settlement, `req.Bet` primary with stored type `1` bet-state fallback, wallet failure skip, and no forward settlement on type `1`, `2`, `3`, or type `4 end_round=false`.

## Provider logs (after one GGSoft settle round)

```bash
docker logs games-labs-provider-dev 2>&1 | grep -E 'ggsoft:settle|SettleRound|GAME_API_URL' | tail -40
```

| Log pattern | Meaning |
| --- | --- |
| `GAME_API_URL configured; gameplay SettleRound/turnover publishing enabled` | Provider can reach Game |
| `[ggsoft:settle] game SettleRound success round_id=<order_id>` | GGSoft type `4` + `end_round=true` settled gameplay turnover after wallet operation success |
| `[ggsoft:settle] skip SettleRound` | Missing `GAME_API_URL` or invalid round/user/game input prevented settlement notification |
| No `[ggsoft:*type 1/2/3*] game SettleRound` row | Non-settlement callback types did not send forward turnover |

## Wallet SQL (GGSoft ledger recorded)

```sql
SELECT idempotency_key, type, amount, created_at
FROM wallet_transactions
WHERE idempotency_key LIKE 'ggsoft:bet:%'
   OR idempotency_key LIKE 'ggsoft:win:%'
   OR idempotency_key LIKE 'ggsoft:refund:%'
ORDER BY created_at DESC
LIMIT 10;
```

## Game SQL (round lifecycle from type 4 end-round settle)

```sql
SELECT round_id, user_id, game_id, game_type, settled_amount, settled_at, reversed_at
FROM round_lifecycles
WHERE round_id = '<order_id from type 4 test round>'
LIMIT 1;
```

Expect: one row with `settled_amount` matching `req.Bet`; if type `4` omitted a positive `bet`, expect fallback to the stored type `1` bet state for the same `order_id`. `reversed_at` remains NULL because GGSoft cancel does not implement a Game reverse contract in this task.

## Missions consumer (downstream)

```sql
SELECT event_id, event_type, status, created_at
FROM daily_activity_consumer_events
WHERE event_type = 'turnover.settled'
ORDER BY created_at DESC
LIMIT 5;
```

## Runtime note

- The shared staging checklist from TASK-070 through TASK-072 still applies: Provider `GAME_API_URL` must target Game NodePort (`84.247.150.206:30553` in the current VPS setup), and `Games-Labs-Game` plus `Games-Labs-Missions` must share the same `RABBITMQ_URL` so `turnover.settled` reaches Missions.

## Regression checks

1. Send type `4` with `end_round=true`, positive `bet`, and successful wallet operation -> confirm `[ggsoft:settle] game SettleRound success` and `round_lifecycles.settled_amount = bet`.
2. Send type `1` first, then type `4 end_round=true` with `bet = 0` -> confirm `settled_amount` falls back to the stored type `1` bet state.
3. Force wallet credit/debit failure on type `4` -> confirm callback returns wallet error and no `[ggsoft:settle] game SettleRound` log for that order.
4. Send type `1`, `2`, `3`, or type `4 end_round=false` -> confirm wallet path behavior but no forward `SettleRound` log and no new `round_lifecycles` row.
