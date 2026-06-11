# TASK-066: Check-In Calendar Shared-Lib Contract

## Short name
`check-in-calendar-contract`

## Type
feature

## Priority
high

## Parent / Epic
- Parent: none
- Epic: Check-In Calendar and Consecutive Bonus

## Background

Mobile/Frontend needs backend-provided data for a Monthly Check-In Calendar and
Consecutive Check-In Bonus experience:

- per-day calendar status: `completed`, `today`, `upcoming`, `missed`, or `broken`
- per-day reward amount/type
- D3/D7/D15/D31 milestone reward values and status: `inactive`, `claimable`, `claimed`
- restore quote and restore response fields for missed/broken days
- Backoffice configuration for campaign, daily reward, milestone reward, and restore settings

Current Missions source is aggregate-only:

- `MonthlyChallenge` stores `logins_count`, `total_days`, `reward_claimed`, and
  `last_login_date`; it does not store per-day calendar truth.
- `UserStreak` stores `current_streak`, `last_date`, and `is_broken`.
- `MissionService.RestoreStreak` prices restores from in-memory `restoredCounts`,
  so pricing is not durable across process restarts.
- `MissionConfig` and existing admin config endpoints do not define check-in
  campaign, milestone, or restore config.

Per `AGENTS.md`, new cross-service proto/types belong in `shared-lib` first.
Downstream `Games-Labs-Missions`, `api-gateway`, and docs implementation must wait
until the user publishes and bumps `github.com/SparqLab/shared-lib`.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `shared-lib` | Add the typed Missions proto contract, HTTP annotations, generated protobuf/gateway code, and swagger artifacts. |
| `Games-Labs-Missions` | Follow-up only; no downstream implementation in this task until shared-lib is published and bumped. |
| `api-gateway` | Follow-up only; docs/Postman sync happens after the Missions behavior exists. |

### Affected files

- `shared-lib/proto/missionspb/missions.proto`
- `shared-lib/proto/missionspb/missions.pb.go`
- `shared-lib/proto/missionspb/missions_grpc.pb.go`
- `shared-lib/proto/missionspb/missions.pb.gw.go`
- `shared-lib/proto/missionspb/swagger.pb.go`
- `shared-lib/proto/missionspb/missions.swagger.json`

### Explicitly out of scope

- Do not implement Missions persistence, service logic, handlers, or routes.
- Do not add local duplicate request/response types in `Games-Labs-Missions`.
- Do not modify Mobile or Frontend code.
- Do not update Postman examples before the runtime behavior exists.

## Contract requirements

Add typed request/response messages for:

- Mobile calendar read:
  - `GET /api/v1/missions/check-in/calendar?user_id={id}&month=YYYY-MM`
  - includes `month`, `timezone`, `today`, `reset_in_seconds`, day cards,
    consecutive milestone cards, and restore quote summary.
- Milestone claim:
  - `POST /api/v1/missions/check-in/milestones/{day}/claim`
  - body includes `user_id` and optional `idempotency_key`.
- Restore quote:
  - `GET /api/v1/missions/streak/restore/quote?user_id={id}`
  - returns availability, price, usage, and reason/status fields.
- Restore response:
  - existing `POST /api/v1/missions/streak/restore` should have typed request and
    response available for downstream migration.
- Backoffice check-in config:
  - `GET /api/v1/admin/check-in/config`
  - `PUT /api/v1/admin/check-in/config`
  - config must cover campaign status/month/timezone, daily reward, milestone
    rewards for D3/D7/D15/D31, restore price ladder/currency, and max restores per month.

Prefer typed proto messages over `google.protobuf.Struct` for new APIs. Preserve
existing APIs and avoid breaking existing generated service methods unless the change
is explicitly backward compatible.

## Acceptance criteria

- [ ] `shared-lib/proto/missionspb/missions.proto` defines typed request/response messages for check-in calendar, day reward/status, consecutive milestone status, milestone claim, restore quote, restore response, and admin check-in config.
- [ ] gRPC-Gateway annotations expose the agreed Mobile endpoints for calendar read, milestone claim, restore quote, and restore action.
- [ ] gRPC-Gateway annotations expose the agreed Backoffice endpoints for check-in config read/update.
- [ ] Generated `shared-lib/proto/missionspb/*.pb.go`, `*.pb.gw.go`, `*_grpc.pb.go`, `swagger.pb.go`, and `missions.swagger.json` are regenerated from proto, not manually edited.
- [ ] The generated swagger includes the new Mobile and Backoffice paths.
- [ ] `go test ./...` passes in `shared-lib`, or the implementation output documents the exact environment limitation.
- [ ] The dev output explicitly stops before downstream Missions changes and records that the user must publish/bump `github.com/SparqLab/shared-lib` before `Games-Labs-Missions` implementation starts.

## Technical plan

1. Inspect the existing Missions service contract in `shared-lib/proto/missionspb/missions.proto`
   and preserve current method compatibility.
2. Add reusable typed messages for reward, calendar day card, consecutive bonus,
   milestone card, restore quote, restore result, and admin config.
3. Add new `MissionsService` RPCs with grpc-gateway annotations:
   - `GetCheckInCalendar`
   - `ClaimCheckInMilestone`
   - `GetRestoreStreakQuote`
   - typed restore request/response path for `RestoreStreak` or an additive typed
     companion method if changing the existing method would break consumers
   - `AdminGetCheckInConfig`
   - `AdminUpdateCheckInConfig`
4. Regenerate all Missions proto artifacts using the existing `shared-lib` generation
   workflow.
5. Run `go test ./...` in `shared-lib`.
6. Document the publish/bump stop condition in `dev-2-output.yaml`.

## Subtasks

| Order | ID | Agent | Description | Owned files | Parallel safe |
| --- | --- | --- | --- | --- | --- |
| 1 | `missions-proto-contract` | `dev-2` | Add typed messages and RPC declarations with gateway annotations to `missions.proto`. | `shared-lib/proto/missionspb/missions.proto` | false |
| 2 | `missions-proto-generation` | `dev-2` | Regenerate Missions protobuf, gRPC, gateway, and swagger artifacts from the updated proto. | `shared-lib/proto/missionspb/*.pb.go`, `shared-lib/proto/missionspb/*.pb.gw.go`, `shared-lib/proto/missionspb/swagger.pb.go`, `shared-lib/proto/missionspb/missions.swagger.json` | false |
| 3 | `shared-lib-verification` | `dev-2` | Run shared-lib verification and record the downstream publish/bump blocker. | `ai-dev-office/runs/TASK-066/dev-2-output.yaml` | false |

## Risks

| Risk | Mitigation |
| --- | --- |
| Changing existing `Struct` methods breaks current Missions or gateway consumers. | Prefer additive methods for new APIs; only migrate an existing method to typed input/output if generated consumers remain compatible or the downstream migration is explicitly sequenced. |
| Downstream agents start implementing local duplicate types before shared-lib is published. | Keep `Games-Labs-Missions` implementation out of scope and record the publish/bump blocker in the task and dev output. |
| Status names drift from Mobile expectation. | Define enum/string contract values exactly: day statuses `completed`, `today`, `upcoming`, `missed`, `broken`; milestone statuses `inactive`, `claimable`, `claimed`, `expired`; campaign statuses `inactive`, `active`, `ended`. |
| Swagger or gateway artifacts are stale. | Regenerate artifacts and verify the new paths exist in `missions.swagger.json`. |

## Assignment

- Primary: `dev-2`
- Parallel: `false`

Reason: this is cross-service contract work with dependency sequencing. The first
executable scope is limited to `shared-lib`, but the contract shape blocks multiple
downstream services.

## Follow-up tasks

- `TASK-067` should implement `Games-Labs-Missions` persistence, service logic,
  handlers, routes, and gRPC dispatch after the user publishes and bumps
  `github.com/SparqLab/shared-lib`.
- `TASK-068` should sync `api-gateway` docs/Postman and Mobile/Backoffice examples
  after the runtime behavior exists.

## Next action

`dev-2`: implement the `shared-lib` contract only, regenerate artifacts, verify
`shared-lib`, then stop for user publish/bump before downstream work.
