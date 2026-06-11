# TASK-070 — IDG bet-debit turnover verification

## Unit tests

```bash
cd Games-Labs-Provider
go test ./internal/core/services/idg ./internal/handlers/idghdl
go test ./...
```

Expected: all pass; `idg` package covers bet-time `SettleRound`, debit failure skip, win no double-settle, cancel no settle.

## Provider logs (after one IDG bet round)

```bash
docker logs games-labs-provider-dev 2>&1 | grep -E 'idg:bet|idg:cancel|SettleRound|GAME_API_URL' | tail -40
```

| Log pattern | Meaning |
| --- | --- |
| `GAME_API_URL configured; gameplay SettleRound/turnover publishing enabled` | Provider can reach Game |
| `[idg:bet] game SettleRound success round_id=<wagerId>` | Bet-debit path settled turnover |
| `[idg:bet] skip SettleRound` | Missing `GAME_API_URL` or invalid round/user/game |
| `[idg:cancel] wallet refund ok but Game ReverseRound not wired` | Cancel refunded wallet but turnover not reversed |

## Wallet SQL (bet debit recorded)

```sql
SELECT idempotency_key, type, amount, created_at
FROM wallet_transactions
WHERE idempotency_key LIKE 'idg:bet:%'
ORDER BY created_at DESC
LIMIT 5;
```

## Game SQL (round lifecycle from bet-time settle)

```sql
SELECT round_id, user_id, game_id, settled_amount, settled_at, reversed_at
FROM round_lifecycles
WHERE round_id = '<wagerId from test bet>'
LIMIT 1;
```

Expect: one row with `settled_amount` matching bet `amount`, `reversed_at` NULL until reverse RPC exists.

## Missions consumer (downstream)

```sql
SELECT event_type, created_at
FROM daily_activity_consumer_events
WHERE event_type = 'turnover.settled'
ORDER BY created_at DESC
LIMIT 5;
```

## Runtime closure note

- Post-task staging validation confirmed the code path was correct, but two runtime config drifts initially blocked end-to-end turnover:
- Provider `GAME_API_URL` was pointed at `games-labs-game-service:50053` from the VPS Docker runtime, which could not resolve the in-cluster DNS name; switching to Game NodePort `84.247.150.206:30553` fixed `SettleRound`.
- `Games-Labs-Game` and `Games-Labs-Missions` were pointed at different RabbitMQ brokers (`amqps://...mq.ap-southeast-1.on.aws:5671/` vs `amqp://admin:...@84.247.150.206:5672/`), so `turnover.settled` was published and consumed on different buses. Aligning both services to the same broker restored `daily_activity_consumer_events` and `quest/overview` progress.
- Final staging signal: fresh gameplay rounds created `round_lifecycles` rows and Daily quest turnover progressed in Mobile/`quest/overview`.

## Staging blocker — cancel / reverse

- `Games-Labs-Game` implements `ReverseRound` in service/repo but **no** `ReverseRound` gRPC in `shared-lib/proto/gamepb`.
- `Games-Labs-Provider` cannot reverse bet-time turnover on `IDGCancel` until `gameadt.TryReverseRound` (or equivalent) ships.
- **Do not enable bet-time IDG turnover in staging/production** until cancel reversal is wired or product accepts over-count risk on canceled wagers.

## Regression checks

1. Place bet → confirm `[idg:bet] game SettleRound success` and `round_lifecycles` row.
2. Win same wager → confirm **no** second `[idg:*] game SettleRound` for same `round_id`.
3. Cancel flow (optional) → wallet credit succeeds; log shows reverse-not-wired; `round_lifecycles.reversed_at` stays NULL.
