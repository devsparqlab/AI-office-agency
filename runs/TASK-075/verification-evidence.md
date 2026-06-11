# TASK-075 — AFB gameplay turnover reference verification

## Unit tests

```bash
cd Games-Labs-Provider
go test ./internal/core/services/afb
go test ./...
```

Expected: all pass; `afb` package covers payout `valid_turnover` primary, transaction `valid_turnover` fallback, max debit-magnitude fallback, zero/no-turnover behavior, wallet failure skip, and payout-only `SettleRound` semantics.

## Provider logs (after one AFB payout round)

```bash
docker logs games-labs-provider-dev 2>&1 | grep -E 'afb:payout|SettleRound|GAME_API_URL' | tail -40
```

| Log pattern | Meaning |
| --- | --- |
| `GAME_API_URL configured; gameplay SettleRound/turnover publishing enabled` | Provider can reach Game |
| `[afb:payout] game SettleRound success round_id=<round_id>` | AFB payout settled gameplay turnover after wallet transactions succeeded |
| `[afb:payout] skip SettleRound` | Missing `GAME_API_URL` or invalid round/user/game input prevented settlement notification |
| Bet-only wallet rows without payout log | QA should not expect Daily turnover yet; AFB advances only from payout-time settlement |

## Wallet SQL (AFB payout-side ledger recorded)

```sql
SELECT idempotency_key, type, amount, created_at
FROM wallet_transactions
WHERE idempotency_key LIKE 'afb:bet:%'
   OR idempotency_key LIKE 'afb:win:%'
ORDER BY created_at DESC
LIMIT 10;
```

## Game SQL (round lifecycle from payout settle)

```sql
SELECT round_id, user_id, game_id, game_type, settled_amount, settled_at, reversed_at
FROM round_lifecycles
WHERE round_id = '<round_id from payout test round>'
LIMIT 1;
```

Expect: one row with `settled_amount` matching payout `valid_turnover`; if payout-level `valid_turnover` is zero, expect fallback to the highest transaction `valid_turnover`, then the largest debit magnitude from payout transactions.

## Missions consumer (downstream)

```sql
SELECT event_id, event_type, status, created_at
FROM daily_activity_consumer_events
WHERE event_type = 'turnover.settled'
ORDER BY created_at DESC
LIMIT 5;
```

## Runtime note

- The shared staging checklist from TASK-070 through TASK-073 still applies: Provider `GAME_API_URL` must target Game NodePort (`84.247.150.206:30553` in the current VPS setup), and `Games-Labs-Game` plus `Games-Labs-Missions` must share the same `RABBITMQ_URL` so `turnover.settled` reaches Missions.

## Regression checks

1. Send payout with positive top-level `valid_turnover` and successful wallet transactions -> confirm `[afb:payout] game SettleRound success` and `round_lifecycles.settled_amount = valid_turnover`.
2. Send payout with zero top-level `valid_turnover` but positive transaction `valid_turnover` -> confirm `settled_amount` falls back to the largest transaction `valid_turnover`.
3. Send payout with no `valid_turnover` values but debit transaction(s) -> confirm `settled_amount` falls back to the largest debit magnitude.
4. Force wallet payout failure -> confirm callback returns error and no `[afb:payout] game SettleRound` log for that round.
5. Produce only `afb:bet:*` wallet rows without payout -> confirm no new `round_lifecycles` row and no Daily turnover progress yet.
