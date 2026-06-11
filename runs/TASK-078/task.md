# TASK-078: Add Restored Check-In Day Flag

## Short name
`check-in-restored-day-flag`

## Type
feature

## Priority
medium

## Parent / Epic
- Parent: `TASK-067`
- Epic: Check-In Calendar and Consecutive Bonus

## Status

Pending shared-lib contract update and downstream Missions implementation.

## Background

Mobile needs to render a distinct UI for dates that were completed by streak
restore. Today, `GET /api/v1/missions/check-in/calendar` returns restored dates
with the same `status: "completed"` as normal check-ins, so clients cannot
distinguish them.

The existing Missions runtime already stores enough source data:

- normal check-in day ledgers use `source = "check_in"`
- restored day ledgers use `source = "restore"`
- `ListCheckInDayLedgers` loads `source` into `models.CheckInDayLedger`

Add a backward-compatible boolean field in `days[]`:

```json
{
  "status": "completed",
  "is_restored": true
}
```

## Scope

### Target services

| Service | Role |
| --- | --- |
| `shared-lib` | Owns the Missions proto contract and generated gateway/swagger artifacts. |
| `Games-Labs-Missions` | Builds the calendar response and maps model data to the gRPC/proto response. |
| `api-gateway` | Exposes generated gateway docs and keeps Postman examples aligned for external clients. |
| `docs` | Keeps duplicate top-level Postman/API collection copy aligned when present. |
| `ai-dev-office` | Stores task status, handoff, and verification evidence. |

### Affected files

- `shared-lib/proto/missionspb/missions.proto`
- `shared-lib/proto/missionspb/missions.pb.go`
- `shared-lib/proto/missionspb/missions.pb.gw.go`
- `shared-lib/proto/missionspb/missions_grpc.pb.go`
- `shared-lib/proto/missionspb/missions.swagger.json`
- `Games-Labs-Missions/internal/models/models.go`
- `Games-Labs-Missions/internal/services/check_in_calendar_service.go`
- `Games-Labs-Missions/internal/services/check_in_calendar_service_test.go`
- `Games-Labs-Missions/internal/grpc/missiongrpc/server.go`
- `Games-Labs-Missions/internal/grpc/missiongrpc/server_test.go`
- `Games-Labs-Missions/README.md`
- `api-gateway/docs/Games-Labs-APIs.postman_collection.json`
- `docs/Games-Labs-APIs.postman_collection.json`
- `ai-dev-office/runs/TASK-078/verification-evidence.md`
- `ai-dev-office/runs/TASK-078/dev-2-output.yaml`

### Explicitly out of scope

- Do not change calendar status values; restored dates must remain
  `status: "completed"`.
- Do not add a database migration; the existing `check_in_day_ledgers.source`
  column is sufficient.
- Do not change restore pricing, restore eligibility, milestone claim logic, or
  `restore_quote`.
- Do not modify Mobile/Frontend code in this task.

## Acceptance criteria

- [ ] `CheckInCalendarDay` in the shared Missions proto includes a
  backward-compatible `bool is_restored` field using a new field number.
- [ ] Generated shared-lib protobuf, gateway, and swagger artifacts are updated
  from the proto; generated files are not manually edited.
- [ ] `Games-Labs-Missions` includes `is_restored` in each calendar day JSON
  response.
- [ ] Calendar days backed by `check_in_day_ledgers.source = "restore"` return
  `status: "completed"` and `is_restored: true`.
- [ ] Normal check-in completed days return `status: "completed"` and
  `is_restored: false`.
- [ ] Missed, broken, today, and upcoming days return `is_restored: false`.
- [ ] gRPC mapping preserves the same `is_restored` value in
  `missionspb.CheckInCalendarDay`.
- [ ] Focused service and gRPC tests cover restored and normal completed day
  behavior.
- [ ] README and both Postman collection copies document the new field without
  changing existing client expectations.
- [ ] `go.mod` files do not contain local `replace github.com/SparqLab/shared-lib
  => ../shared-lib`, and any dependency bump is tidied with matching `go.sum`.

## Technical plan

1. Update `shared-lib/proto/missionspb/missions.proto` by adding
   `bool is_restored = 7;` to `CheckInCalendarDay`.
2. Regenerate shared-lib protobuf, gateway, and swagger artifacts with the
   repo-approved proto generation path.
3. Publish or otherwise make the updated shared-lib version available, then
   bump `Games-Labs-Missions` and any required gateway dependency to that
   version. Per AGENTS.md, downstream service work must wait for this contract
   publish/bump step.
4. Add `IsRestored bool 'json:"is_restored"'` to
   `models.CheckInCalendarDay`.
5. In `GetCheckInCalendar`, set `IsRestored` from the matched ledger source:
   true only when the day has a ledger and `ledger.Source == "restore"`.
6. Update `missionCheckInCalendarToPB` to map the model field to
   `missionspb.CheckInCalendarDay.IsRestored`.
7. Add focused tests for normal completed, restored completed, and non-completed
   day values.
8. Update Missions README and both Postman collection copies with the new
   `is_restored` field and validate JSON.
9. Run build/test verification and record exact evidence.

## Subtasks

| Order | ID | Agent | Description | Owned files | Parallel safe |
| --- | --- | --- | --- | --- | --- |
| 1 | `shared-lib-contract` | `dev-2` | Add `is_restored` to the shared Missions proto and regenerate shared-lib artifacts. | `shared-lib/proto/missionspb/missions.proto`, `shared-lib/proto/missionspb/missions.pb.go`, `shared-lib/proto/missionspb/missions.pb.gw.go`, `shared-lib/proto/missionspb/missions_grpc.pb.go`, `shared-lib/proto/missionspb/missions.swagger.json` | false |
| 2 | `publish-and-bump-shared-lib` | `dev-2` | Publish or select the updated shared-lib version, then bump downstream modules without committing local replace directives. | `Games-Labs-Missions/go.mod`, `Games-Labs-Missions/go.sum`, `api-gateway/go.mod`, `api-gateway/go.sum` | false |
| 3 | `missions-runtime` | `dev-2` | Populate `is_restored` from `check_in_day_ledgers.source` and map it through gRPC. | `Games-Labs-Missions/internal/models/models.go`, `Games-Labs-Missions/internal/services/check_in_calendar_service.go`, `Games-Labs-Missions/internal/grpc/missiongrpc/server.go` | false |
| 4 | `tests` | `dev-2` | Add focused service/gRPC tests for restored and normal completed day behavior. | `Games-Labs-Missions/internal/services/check_in_calendar_service_test.go`, `Games-Labs-Missions/internal/grpc/missiongrpc/server_test.go` | false |
| 5 | `docs-handoff` | `dev-2` | Update README/Postman examples and write verification evidence. | `Games-Labs-Missions/README.md`, `api-gateway/docs/Games-Labs-APIs.postman_collection.json`, `docs/Games-Labs-APIs.postman_collection.json`, `ai-dev-office/runs/TASK-078/verification-evidence.md`, `ai-dev-office/runs/TASK-078/dev-2-output.yaml` | false |

## Risks

| Risk | Mitigation |
| --- | --- |
| Downstream service changes are attempted before the shared contract is published. | Keep shared-lib proto/generation and publish/bump as the first ordered subtasks. Stop downstream implementation until the user confirms the shared-lib version is available. |
| Mobile interprets `is_restored` as a replacement for `status`. | Document that restored dates still use `status: "completed"` and the boolean is only a display hint. |
| A missing ledger source from older or in-memory paths creates false positives. | Default `is_restored` to false unless the persisted ledger source is exactly `restore`. |
| Postman or README examples drift from runtime behavior. | Update both collection copies and validate JSON after edits. |

## Assignment

- Primary: `dev-2`
- Parallel: `false`

Reason: this is a cross-service contract change involving shared proto,
generated artifacts, dependency bumping, runtime mapping, tests, and docs. The
work must stay ordered because shared-lib contract publication gates downstream
implementation.

## Next action

Run `dev-2` after the shared-lib contract update can be published/bumped.
