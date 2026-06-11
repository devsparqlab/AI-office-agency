# TASK-074 — Sigma gameplay turnover verification

## Unit tests

```bash
cd Games-Labs-Provider
go test ./internal/core/services/sigma
go test ./...
```

Expected: all pass; `sigma` package covers end-round settle hooks, debit turnover mapping, zero-debit behavior, `roundId`/`txId` selection, and `Cancel` no-settlement behavior.

## Provider logs (local hook validation)

```bash
docker logs games-labs-provider-dev 2>&1 | grep -E 'sigma:debit-n-credit|sigma:credit|sigma:arcade-settle|SettleRound|GAME_API_URL' | tail -40
```

| Log pattern | Meaning |
| --- | --- |
| `GAME_API_URL configured; gameplay SettleRound/turnover publishing enabled` | Provider can reach Game |
| `[sigma:debit-n-credit] game SettleRound success round_id=<roundId or txId>` | `DebitAndCredit` with `isEndRound=true` forwarded turnover |
| `[sigma:credit] game SettleRound success round_id=<roundId or txId>` | `Credit` with `isEndRound=true` forwarded turnover |
| `[sigma:arcade-settle] game SettleRound success round_id=<roundId or txId>` | `ArcadeSettle` forwarded turnover |
| No `[sigma:cancel] game SettleRound` row | Cancel path did not send forward turnover |

## Runtime deferral note

- Sigma service hook validation is **local-only** in this task.
- `Games-Labs-Provider/internal/core/services/sigma/service.go` still uses `walletOp(...)` as a stub that returns balance `0` without a real wallet integration.
- Because of that stubbed wallet path, TASK-074 does **not** claim full staging/production E2E readiness even though the forward settlement hooks and turnover mapping are locally verified.

## Game / Missions SQL (only after a future real-wallet rollout)

```sql
SELECT round_id, user_id, game_id, game_type, settled_amount, settled_at, reversed_at
FROM round_lifecycles
WHERE round_id = '<roundId or txId from Sigma test round>'
LIMIT 1;
```

```sql
SELECT event_id, event_type, status, created_at
FROM daily_activity_consumer_events
WHERE event_type = 'turnover.settled'
ORDER BY created_at DESC
LIMIT 5;
```

Expected in a future real-wallet rollout: `settled_amount = tx.debit`, one row per end-round event, and no forward row from `Cancel`.

## Regression checks

1. Send `DebitAndCredit` with positive `debit` and `isEndRound=true` -> confirm local test seam records `SettleRound`.
2. Send `DebitAndCredit` or `Credit` with `isEndRound=false` -> confirm no forward settle.
3. Send `ArcadeSettle` -> confirm local test seam records `SettleRound`.
4. Send `Cancel` -> confirm no forward settle.
5. Keep README/evidence explicit that Sigma E2E remains deferred until wallet path is real.
