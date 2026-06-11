# TASK-041: Add Event production mission APIs

## Type
feature

## Priority
high

## Parent / Epic
- Depends on: `TASK-038` Quest overview Phase 1.
- Epic: Quest overview phase 2

## Scope
### Target Services
- `shared-lib`
  - Add public `missionspb` contracts for event listing and event detail.
- `Games-Labs-Missions`
  - Own active event listing, event detail, eligibility/progress/reward state, and time-window filtering.
- `docs`
  - Add event endpoints to the Postman collection.

### Explicitly Out Of Scope
- Do not integrate event into `/api/v1/quest/overview`; TASK-042 owns overview v2 integration.
- Do not build full admin create/update event management unless existing config patterns make it trivial.
- Do not add event claim in this task unless the data model is already ready and reviewer can verify it safely.

## Description
Replace the Event placeholder with production read APIs:

- `GET /api/v1/missions/events?user_id=...`
- `GET /api/v1/missions/events/{event_id}?user_id=...`

Responses must expose user-specific status including `claimable`, `claimed`, and `progress`. Event claim may be added in this card only if the model is ready; otherwise leave claim for Phase 2.1.

## Acceptance Criteria
- [ ] `shared-lib/proto/missionspb/missions.proto` has additive event list and detail RPCs with grpc-gateway annotations.
- [ ] Generated `missionspb` artifacts are regenerated.
- [ ] Active event window uses deterministic `start_at` / `end_at` handling.
- [ ] `GET /api/v1/missions/events` returns only eligible/current events by default, with status per user.
- [ ] `GET /api/v1/missions/events/{event_id}` returns detail with `claimable`, `claimed`, and `progress`.
- [ ] Inactive and expired events are handled predictably.
- [ ] Timezone handling is covered by tests.
- [ ] Minimal read config path exists, even if create/update admin APIs are deferred.
- [ ] Postman collection includes event list/detail requests.

## Optional Claim Scope
`POST /api/v1/missions/events/{event_id}/claim` may be included only if:
- event reward state already has a safe persistence model,
- duplicate claim protection is implemented,
- tests cover re-claim behavior.

If those conditions are not met, document claim as deferred to Phase 2.1.

## Affected Files
- `shared-lib/proto/missionspb/missions.proto` - modify contract.
- `shared-lib/proto/missionspb/*` generated artifacts - regenerate.
- `Games-Labs-Missions/internal/repositories/*` - add/modify event config/progress read boundary.
- `Games-Labs-Missions/internal/services/event_service.go` - create event domain service.
- `Games-Labs-Missions/internal/handlers/event_handler.go` - create HTTP handler.
- `Games-Labs-Missions/internal/routes/apiv1.go` - register routes.
- `Games-Labs-Missions/internal/grpc/missiongrpc/server.go` - dispatch gRPC methods.
- `Games-Labs-Missions/cmd/main.go` - wire repositories/services/handlers.
- `Games-Labs-Missions/internal/services/*test.go` - add event tests.
- `Games-Labs-Missions/internal/handlers/*test.go` - add event handler tests.
- `docs/Games-Labs-APIs.postman_collection.json` - add Postman requests.

## Plan
### Approach
Implement Event read APIs first and keep claim optional. Model active windows and user-specific status clearly so Overview v2 can compose event tab later.

### Subtasks
1. Inspect existing Missions config/repository patterns for event-like data.
2. Update `missionspb.proto` and regenerate generated artifacts.
3. Implement event config/progress read boundary.
4. Implement event service list/detail behavior with active-window filtering.
5. Add HTTP handler, route registration, gRPC dispatch, and main wiring.
6. Add tests for active, inactive, expired, and timezone behavior.
7. Add Postman requests and run focused verification.

### Risks
- **Timezone drift:** Event availability must match backend expectations.
  - **Mitigation:** Use deterministic time source/boundary and test it.
- **Claim overreach:** Event claim may need more persistence design.
  - **Mitigation:** Keep claim optional and defer if not safely modelled.

## Assignment
- Primary: `dev-2`
- Parallel: `false`
- Reason: Time-windowed domain logic and optional claim behavior are higher risk.

## Next Action
Run `dev-2`, then hand off to `reviewer`.
