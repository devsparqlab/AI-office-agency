# TASK-057 Verification Evidence

Captured by Codex manual session on 2026-05-19 Asia/Bangkok after shared-lib commit
`ba6f85de79c23c5c08a1a8bedfc46099ef08cc57` was merged and all guarded services
were bumped to `github.com/SparqLab/shared-lib v0.0.0-20260519035946-ba6f85de79c2`.

## Dependency Guard

Command:

```bash
GOPRIVATE="github.com/SparqLab/*" GONOSUMDB="github.com/SparqLab/*" ./ai-dev-office/scripts/check-service-dependencies.sh
```

Result:

```text
[PASS] dependency guard passed for services: Games-Labs-Missions Games-Labs-Logs Games-Labs-Game Games-Labs-Order Games-Labs-User Games-Labs-Auth api-gateway Games-Labs-Wallet
```

## Tests

Commands passed:

```bash
cd shared-lib && go test ./...
cd Games-Labs-Wallet && go test ./...
cd Games-Labs-Missions && go test ./...
cd Games-Labs-Order && go test ./...
cd Games-Labs-Game && go test ./...
```

Notes:

- Initial `Games-Labs-Missions` run exposed two stale sqlmock expectations in
  `internal/services/daily_activity_consumer_test.go`.
- The tested behavior was correct: `ApplyDailyActivityForward` always checks for
  pending reverse events, even when the forward event is ignored due to no
  matching activity.
- The two tests were updated to expect that empty pending-reverse query.
- `Games-Labs-Missions/internal/services` then passed, followed by full
  `Games-Labs-Missions go test ./...`.

## Builds

Command passed:

```bash
for d in shared-lib Games-Labs-Wallet Games-Labs-Missions Games-Labs-Order Games-Labs-Game; do (cd "$d" && go build ./...); done
```

Result: exit code 0.
