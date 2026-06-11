# TASK-078 Verification Evidence

## 2026-06-08 shared-lib contract

Status: complete for shared-lib contract.

Completed:

- Added `bool is_restored = 7;` to
  `shared-lib/proto/missionspb/missions.proto` `CheckInCalendarDay`.
- Regenerated shared-lib artifacts with `make buf`.
- Verified shared-lib with `go test ./...`.
- Spec compliance subagent review approved the shared-lib contract change.
- Code quality subagent review approved the shared-lib contract change.

Changed shared-lib files:

- `proto/missionspb/missions.proto`
- `proto/missionspb/missions.pb.go`
- `proto/missionspb/missions.swagger.json`
- `proto/missionspb/swagger.pb.go`

Evidence commands reported by worker/reviewers:

- `make buf`
- `go test ./...`
- `git diff --check`
- `rg -n "is_restored|isRestored|IsRestored" proto/missionspb`

Result:

- Shared-lib was published as
  `v0.0.0-20260608082044-b8a073833ca9`.

## 2026-06-08 downstream implementation

Status: in review.

Completed:

- Bumped `Games-Labs-Missions` and `api-gateway` to shared-lib
  `v0.0.0-20260608082044-b8a073833ca9`.
- Confirmed no `replace github.com/SparqLab/shared-lib => ../shared-lib`
  directive exists in downstream `go.mod` files.
- Added `models.CheckInCalendarDay.IsRestored` with JSON field
  `is_restored`.
- Set `IsRestored` only when the matched check-in day ledger has
  `Source == "restore"`.
- Preserved restored day `status: "completed"` semantics.
- Mapped the flag through `missionCheckInCalendarToPB` to
  `missionspb.CheckInCalendarDay.IsRestored`.
- Added focused service and gRPC tests.
- Updated `Games-Labs-Missions/README.md`,
  `api-gateway/docs/Games-Labs-APIs.postman_collection.json`, and
  `docs/Games-Labs-APIs.postman_collection.json`.

TDD red evidence:

- `go test ./internal/services -run 'TestGetCheckInCalendarMarksRestoredLedgerDays'`
  failed before implementation because `models.CheckInCalendarDay` had no
  `IsRestored` field.
- `go test ./internal/grpc/missiongrpc -run 'TestMissionCheckInCalendarToPBMapsRestoredDayFlag'`
  failed before implementation because `models.CheckInCalendarDay` had no
  `IsRestored` field.

Verification commands:

- `go test ./internal/services ./internal/grpc/missiongrpc`
  in `Games-Labs-Missions`: passed.
- `go test ./...` in `Games-Labs-Missions`: passed.
- `GOWORK=off go build -mod=readonly ./...` in `Games-Labs-Missions`: passed.
- `go test ./...` in `api-gateway`: passed.
- `GOWORK=off go build -mod=readonly ./...` in `api-gateway`: passed.
- `node -e 'JSON.parse(...)'` for both Postman collection copies: passed.
- `git diff --check` in `Games-Labs-Missions` and `api-gateway`: passed.

