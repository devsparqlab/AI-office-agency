# TASK-076 — IDG cancel reverse-round verification

## Shared contract

```bash
cd shared-lib
go test ./proto/gamepb
```

Expected: pass; `gamepb` descriptor exposes `GameService.ReverseRound`.

## Game service

```bash
cd Games-Labs-Game
env GOPRIVATE='github.com/SparqLab/*' GONOSUMDB='github.com/SparqLab/*' GOPROXY=direct go test ./internal/core/handlers/gamehdl ./internal/core/services/gamesvc
env GOPRIVATE='github.com/SparqLab/*' GONOSUMDB='github.com/SparqLab/*' GOPROXY=direct GOWORK=off go build -mod=readonly ./...
```

Expected: pass; `gamehdl` serves `ReverseRound`, and `gamesvc` proves reverse events emit only once per round.

## Provider service

```bash
cd Games-Labs-Provider
env GOPRIVATE='github.com/SparqLab/*' GONOSUMDB='github.com/SparqLab/*' GOPROXY=direct go test ./internal/core/services/idg ./internal/handlers/idghdl
env GOPRIVATE='github.com/SparqLab/*' GONOSUMDB='github.com/SparqLab/*' GOPROXY=direct GOWORK=off go build -mod=readonly ./...
```

Expected: pass; `IDGCancel` calls `TryReverseRound` only after wallet refund succeeds, parses `executionTime` into `occurred_at`, and skips reverse when refund fails.

## Provider logs (after one cancel flow)

```bash
docker logs games-labs-provider-dev 2>&1 | grep -E 'idg:bet|idg:cancel|SettleRound|ReverseRound|GAME_API_URL' | tail -60
```

| Log pattern | Meaning |
| --- | --- |
| `GAME_API_URL configured; gameplay SettleRound/turnover publishing enabled` | Provider can reach Game |
| `[idg:bet] game SettleRound success round_id=<wagerId>` | Bet-time settle still works |
| `[idg:cancel] game ReverseRound success round_id=<wagerId>` | Cancel path reversed the previously settled round |
| `[idg:cancel] game ReverseRound ... err=` | Provider reached the reverse path but Game rejected or was unreachable |
| `[idg:cancel] skip ReverseRound` | Missing `GAME_API_URL` or invalid round/user/game input prevented reverse notification |

## Game SQL (same wager before/after cancel)

```sql
SELECT round_id, user_id, game_id, game_type, settled_amount, settled_at, reversed_at
FROM round_lifecycles
WHERE round_id = '<wagerId from test bet/cancel>'
LIMIT 1;
```

Expect: one row with `settled_at` populated from the original bet-time settlement and `reversed_at` populated after cancel. Repeated cancel callbacks must keep the same row and not create duplicates.

## Missions consumer (downstream reverse)

```sql
SELECT event_id, event_type, source_reference_id, created_at
FROM daily_activity_consumer_events
WHERE source_reference_id = '<wagerId from test bet/cancel>'
ORDER BY created_at DESC;
```

Expect: forward `turnover.settled` / `round.settled` from the bet flow and `turnover.reversed` / `round.reversed` after cancel.

## Regression checks

1. Place IDG bet -> confirm `[idg:bet] game SettleRound success` and `round_lifecycles.reversed_at IS NULL`.
2. Cancel the same wager with wallet refund success -> confirm `[idg:cancel] game ReverseRound success` and `round_lifecycles.reversed_at` becomes non-NULL.
3. Force wallet refund failure -> confirm callback returns mapped wallet error and no `[idg:cancel] game ReverseRound` success log for that wager.
4. Repeat the cancel callback for an already reversed wager -> confirm no duplicate `round_lifecycles` row and no duplicate reverse progress downstream.
