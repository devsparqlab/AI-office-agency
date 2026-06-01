# Turnover Rollout Runbook

This is the canonical runtime reference for the gameplay turnover rails introduced under `TASK-069` and its provider follow-ups.

Use this runbook after any deploy that can affect:

- `Games-Labs-Provider` gameplay settlement / reverse hooks
- `Games-Labs-Game` round lifecycle ingestion or player-activity publish
- `Games-Labs-Missions` player-activity consumption
- shared-lib `gamepb` contract bumps that touch `SettleRound` / `ReverseRound`

## Canonical runtime truth

### Provider -> Game

- `Games-Labs-Provider` DEV runtime is currently Docker on VPS.
- `Games-Labs-Game` runtime is currently k8s.
- Provider must reach Game through the external gRPC NodePort:
  - `GAME_API_URL=84.247.150.206:30553`
- `GAME_API_URL` must be raw `host:port` only, not `http://...` or `https://...`.

### Game -> Missions event bus

- `Games-Labs-Game` publishes `player.activity.v1` events.
- `Games-Labs-Missions` consumes those events for Daily progress.
- Game and Missions must use the exact same `RABBITMQ_URL`.
- A broker mismatch can look like:
  - `round_lifecycles` rows exist
  - Provider logs show `SettleRound success` or `ReverseRound success`
  - but `daily_activity_consumer_events` stays empty or stale

### Mission truth

- Daily turnover must come from `turnover.settled` / `turnover.reversed`
- Never use `spend.settled` as a substitute for gameplay turnover

## Deploy workflow ownership

### Provider

- Workflow: `Games-Labs-Provider/.github/workflows/dev.yml`
- Runtime owner:
  - `GAME_API_URL` comes from repo secret/variable in Provider deploy workflow
  - deploy target is VPS Docker

### Game

- Workflow: `Games-Labs-Game/.github/workflows/deploy.yml`
- Runtime owner:
  - k8s ConfigMap/Secret gets `RABBITMQ_URL`
  - runtime should fail early if `RABBITMQ_URL` is missing

### Missions

- Workflow: `Games-Labs-Missions/.github/workflows/deploy.yml`
- Runtime owner:
  - k8s Secret gets `RABBITMQ_URL`
  - this value must match Game exactly

## Standard verification sequence

Run the helper:

```bash
./ai-dev-office/scripts/verify-turnover-rollout.sh --user-id <user-id> --round-id <round-id>
```

Or run the steps manually below.

### 1. Provider env + logs

```bash
docker exec games-labs-provider-dev printenv GAME_API_URL
docker logs games-labs-provider-dev 2>&1 | grep -E 'GAME_API_URL configured|game adapter init failed|SettleRound|ReverseRound' | tail -80
```

Expected:

- `GAME_API_URL` resolves to `84.247.150.206:30553`
- fresh provider rounds show `SettleRound success`
- IDG cancel reversals show `ReverseRound success`

### 2. Game / Missions broker alignment

```bash
kubectl exec deploy/games-labs-game -- printenv RABBITMQ_URL
kubectl exec deploy/games-labs-missions -- printenv RABBITMQ_URL
```

Expected:

- both values are identical

### 3. RabbitMQ queue / binding sanity

```bash
docker exec rabbitmq rabbitmqctl list_queues name messages consumers
docker exec rabbitmq rabbitmqctl list_bindings | grep player.activity
```

Expected:

- `player.activity.missions` queue exists
- queue has consumers
- binding from `amq.topic` to `player.activity.missions` uses routing key `player.activity.v1`

### 4. Game DB proof

```sql
SELECT round_id, user_id, game_id, game_type, settled_amount, settled_at, reversed_at
FROM round_lifecycles
WHERE round_id = '<round-id>'
LIMIT 1;
```

Expected:

- `settled_at` exists after a successful settle path
- `reversed_at` exists after a successful reverse path

### 5. Missions DB proof

```sql
SELECT event_id, event_type, source_reference_id, created_at
FROM daily_activity_consumer_events
WHERE source_reference_id = '<round-id>'
ORDER BY created_at DESC;
```

Expected:

- settle path gives `round.settled` and `turnover.settled`
- reverse path gives `round.reversed` and `turnover.reversed`

### 6. User-facing proof

Verify:

- `GET /api/v1/quest/overview?user_id=<user-id>` reflects fresh turnover progress
- after an IDG cancel reverse, progress decreases appropriately

## IDG cancel reverse proof path

This is the highest-value correctness proof because it exercises both settle and reverse rails.

1. Place a fresh IDG bet
2. Confirm:
   - Provider log: `[idg:bet] game SettleRound success`
   - `round_lifecycles.settled_at` is populated
   - Missions sees `turnover.settled`
3. Cancel the same wager with refund success
4. Confirm:
   - Provider log: `[idg:cancel] game ReverseRound success`
   - `round_lifecycles.reversed_at` is populated
   - Missions sees `turnover.reversed`
   - `quest/overview` progress decreases

## Shared-lib release / bump discipline

After any shared-lib contract change affecting turnover rails:

1. publish `shared-lib`
2. bump downstream `go.mod`
3. run:

```bash
go mod tidy
GOWORK=off go build -mod=readonly ./...
```

for each affected downstream service

Do not leave local `replace github.com/SparqLab/shared-lib => ...` in committed `go.mod`.

## Known deferred items

These remain intentionally out of scope for this hardening pass:

- Sigma real-wallet E2E rollout
- historical backfill for old rounds/events
- production monitoring / alerting automation

Those should be handled as dedicated follow-up tasks.
