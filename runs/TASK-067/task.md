# TASK-067: Check-In Calendar Missions Runtime

## Short name
`check-in-calendar-runtime`

## Type
feature

## Priority
high

## Parent / Epic
- Parent: `TASK-066`
- Epic: Check-In Calendar and Consecutive Bonus

## Status

Blocked until `TASK-066` is complete and the user has published and bumped
`github.com/SparqLab/shared-lib` in `Games-Labs-Missions`.

## Background

`TASK-066` defines the shared-lib Missions contract for Mobile's Monthly
Check-In Calendar and Consecutive Bonus feature. This task implements the
runtime behavior in `Games-Labs-Missions` after the shared contract is available.

Mobile needs backend-provided data for:

- per-day calendar status: `completed`, `today`, `upcoming`, `missed`, or `broken`
- per-day reward amount/type
- D3/D7/D15/D31 milestone reward values and statuses such as `inactive`,
  `claimable`, and `claimed`
- restore quote and restore response fields for missed/broken days
- Backoffice configuration for campaign, daily reward, milestone reward, and
  restore settings

Current Missions state is aggregate-only. `MonthlyChallenge` has
`logins_count`, `total_days`, `reward_claimed`, and `last_login_date`; it does
not store per-day truth. `UserStreak` has only `current_streak`, `last_date`,
and `is_broken`. Restore pricing currently uses in-memory `restoredCounts`, so
it is not durable across process restarts.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `Games-Labs-Missions` | Owns persistence, runtime check-in state, milestone claim logic, restore quote/debit logic, Backoffice config, handlers, routes, gRPC dispatch, and tests. |
| `shared-lib` | Dependency only; must already contain the published contract from `TASK-066`. |
| `Games-Labs-Wallet` | Existing wallet credit/debit integration is reused; no wallet service contract changes are planned. |

### Affected files

- `Games-Labs-Missions/go.mod`
- `Games-Labs-Missions/go.sum`
- `Games-Labs-Missions/migrations/023_check_in_calendar.sql`
- `Games-Labs-Missions/internal/models/models.go`
- `Games-Labs-Missions/internal/repositories/mission_repo.go`
- `Games-Labs-Missions/internal/repositories/mission_repo_test.go`
- `Games-Labs-Missions/internal/services/mission_service.go`
- `Games-Labs-Missions/internal/services/check_in_calendar_service.go`
- `Games-Labs-Missions/internal/services/check_in_calendar_service_test.go`
- `Games-Labs-Missions/internal/services/mission_service_test.go`
- `Games-Labs-Missions/internal/handlers/mission_handler.go`
- `Games-Labs-Missions/internal/handlers/adminhdl/admin_handler.go`
- `Games-Labs-Missions/internal/handlers/mission_handler_test.go`
- `Games-Labs-Missions/internal/handlers/adminhdl/admin_handler_test.go`
- `Games-Labs-Missions/internal/routes/apiv1.go`
- `Games-Labs-Missions/internal/grpc/missiongrpc/server.go`
- `Games-Labs-Missions/internal/grpc/missiongrpc/server_test.go`
- `Games-Labs-Missions/internal/services/quest_overview_service.go`
- `Games-Labs-Missions/internal/services/quest_overview_service_test.go`

### Explicitly out of scope

- Do not modify `shared-lib` contract fields in this task. If the contract is
  insufficient, stop and send the work back to PM.
- Do not add local duplicate proto/contract types that belong in `shared-lib`.
- Do not change Mobile/Frontend code.
- Do not update Postman collections; that is tracked by `TASK-068`.

## Acceptance criteria

- [ ] `Games-Labs-Missions` depends on the published `shared-lib` version from `TASK-066` with no local `replace` directive committed.
- [ ] Migration `023_check_in_calendar.sql` creates durable tables for campaigns, milestones, restore config, check-in day ledger, milestone claims, and restore ledger.
- [ ] Repository methods read/write active campaign config, month day ledgers, milestone claims, and restore ledger entries with idempotency-safe constraints.
- [ ] `GET /api/v1/missions/check-in/calendar` returns backend-derived day statuses, rewards, consecutive milestone statuses, and restore quote data.
- [ ] `POST /api/v1/missions/check-in` records today's check-in ledger once per Bangkok day while preserving existing monthly challenge behavior.
- [ ] `POST /api/v1/missions/check-in/milestones/{day}/claim` credits configured milestone rewards at most once per user/campaign/milestone.
- [ ] `GET /api/v1/missions/streak/restore/quote` returns durable restore availability, price, usage, and reason/status fields.
- [ ] `POST /api/v1/missions/streak/restore` debits the configured restore price and records a durable restore ledger entry.
- [ ] Backoffice check-in config read/update endpoints persist campaign, daily reward, milestone, and restore settings.
- [ ] `GET /api/v1/quest/overview` remains backward compatible and exposes either a compact check-in summary or `calendar_endpoint` reference.
- [ ] Focused repository, service, handler, gRPC dispatch, and quest overview tests cover success, duplicate, not-eligible, and config-disabled paths.
- [ ] `go test ./...` passes in `Games-Labs-Missions`.
- [ ] `GOWORK=off go build -mod=readonly ./...` passes in `Games-Labs-Missions`, or the exact environment limitation is documented.

## Technical plan

1. Confirm `shared-lib` has been published and bump `Games-Labs-Missions` to the
   approved version. Run `go mod tidy` and keep `go.mod` plus `go.sum` together.
2. Add the durable check-in calendar migration with strict uniqueness:
   `(user_id, checkin_date)` for day ledgers, `(user_id, campaign_id, milestone_day)`
   for milestone claims, and idempotency keys for claim/restore side effects.
3. Add models for campaign config, daily reward, calendar day, consecutive bonus,
   milestone card, restore quote, restore result, and calendar response.
4. Add repository methods and sqlmock coverage before service implementation.
5. Implement `check_in_calendar_service.go` as the focused owner for status
   derivation, milestone eligibility, restore pricing, and response composition.
6. Update existing check-in and restore paths to use durable ledgers while keeping
   existing monthly/streak behavior backward compatible.
7. Add public and Backoffice handlers, routes, and gRPC dispatch mappings to match
   the `shared-lib` contract.
8. Add a compact quest overview integration without embedding the entire calendar
   unless Product explicitly requests a single heavy overview payload.
9. Verify tests and readonly build.

## Subtasks

| Order | ID | Agent | Description | Owned files | Parallel safe |
| --- | --- | --- | --- | --- | --- |
| 1 | `shared-lib-bump` | `dev-2` | Bump `Games-Labs-Missions` to the published `shared-lib` contract version and tidy module files. | `Games-Labs-Missions/go.mod`, `Games-Labs-Missions/go.sum` | false |
| 2 | `check-in-persistence` | `dev-2` | Add migrations, models, repository methods, and repository tests. | `Games-Labs-Missions/migrations/023_check_in_calendar.sql`, `Games-Labs-Missions/internal/models/models.go`, `Games-Labs-Missions/internal/repositories/mission_repo.go`, `Games-Labs-Missions/internal/repositories/mission_repo_test.go` | false |
| 3 | `check-in-service` | `dev-2` | Implement calendar composition, check-in ledger updates, milestone claim logic, restore quote/debit logic, and service tests. | `Games-Labs-Missions/internal/services/mission_service.go`, `Games-Labs-Missions/internal/services/check_in_calendar_service.go`, `Games-Labs-Missions/internal/services/check_in_calendar_service_test.go`, `Games-Labs-Missions/internal/services/mission_service_test.go` | false |
| 4 | `check-in-handlers` | `dev-2` | Add Mobile and Backoffice handlers, routes, gRPC dispatch, and handler/dispatch tests. | `Games-Labs-Missions/internal/handlers/mission_handler.go`, `Games-Labs-Missions/internal/handlers/adminhdl/admin_handler.go`, `Games-Labs-Missions/internal/routes/apiv1.go`, `Games-Labs-Missions/internal/grpc/missiongrpc/server.go`, handler and gRPC tests | false |
| 5 | `quest-overview-summary` | `dev-2` | Add backward-compatible quest overview check-in summary or calendar endpoint reference. | `Games-Labs-Missions/internal/services/quest_overview_service.go`, `Games-Labs-Missions/internal/services/quest_overview_service_test.go` | false |
| 6 | `runtime-verification` | `dev-2` | Run Missions tests/build verification and write implementation output. | `ai-dev-office/runs/TASK-067/dev-2-output.yaml` | false |

## Risks

| Risk | Mitigation |
| --- | --- |
| `shared-lib` is not published or the module pin is unavailable. | Keep task blocked until the user provides the published version; do not use a committed `replace`. |
| Existing monthly/streak consumers depend on current response shapes. | Preserve existing endpoints and add fields additively where possible. |
| Restore semantics become too broad. | Phase 1 restores the latest missed/broken day only; arbitrary day repair requires explicit PM re-scope. |
| Wallet side effects double-credit or double-debit. | Use deterministic idempotency keys and durable unique constraints. |

## Assignment

- Primary: `dev-2`
- Parallel: `false`

Reason: this is cross-cutting service runtime work touching persistence,
business logic, handlers, routes, gRPC dispatch, module dependencies, and tests.

## Next action

Blocked. Run after `TASK-066` is done and the user has published/bumped
`github.com/SparqLab/shared-lib`.
