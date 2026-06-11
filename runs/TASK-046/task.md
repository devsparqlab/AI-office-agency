# TASK-046: Add admin force-reset for daily missions per user

## Type
feature

## Priority
high

## Parent / Epic
- Parent: `TASK-042`
- Epic: Mission QA acceleration for Mobile and DEV

## Scope
### Target Services
- `shared-lib`
  - Add additive admin missions contract for daily reset by user.
- `Games-Labs-Missions`
  - Implement admin write path to clear current-day daily mission state for one user safely.
- `api-gateway`
  - Expose the new admin route through the gateway if required by current registration pattern.
- `docs`
  - Add the admin request to the Postman collection with a recommended DEV-only usage note.

### Explicitly Out Of Scope
- Do not change the product reset policy away from `00:00 Asia/Bangkok`.
- Do not add a generic bulk reset for all users.
- Do not change weekly, monthly, invite, or event reset semantics.
- Do not introduce a backoffice UI in this task.

## Description
Mobile QA currently has to wait for the natural Bangkok-midnight reset to repeat Daily mission scenarios. Add an admin-only endpoint that force-resets the current-day Daily mission state for a single user so QA can rerun Daily flows immediately on DEV.

Expected shape:

`POST /api/v1/admin/missions/daily/reset`

Request body:

```json
{
  "user_id": "..."
}
```

The endpoint should clear only Daily-related per-user current-day state and should be safe to call repeatedly.

## Acceptance Criteria
- [ ] `shared-lib/proto/missionspb/missions.proto` has an additive admin RPC and grpc-gateway annotation for `POST /api/v1/admin/missions/daily/reset`.
- [ ] Generated `missionspb` artifacts are regenerated.
- [ ] `Games-Labs-Missions` implements a repository-backed reset path for one user's current Daily state.
- [ ] Reset clears Daily activity progress/claim state and related Daily counters used by `GET /api/v1/missions/progress` and `GET /api/v1/quest/overview`.
- [ ] Reset does not alter weekly, monthly, invite, or event state.
- [ ] Repeated reset calls return a stable success response and do not corrupt state.
- [ ] Focused tests cover success, idempotent repeat reset, missing user_id validation, and non-impact on non-daily domains.
- [ ] `docs/Games-Labs-APIs.postman_collection.json` includes the admin request and a suggested DEV QA flow.

## Affected Files
- `shared-lib/proto/missionspb/missions.proto` - modify contract.
- `shared-lib/proto/missionspb/*` generated artifacts - regenerate.
- `Games-Labs-Missions/internal/repositories/*` - add/modify daily reset repository methods.
- `Games-Labs-Missions/internal/services/mission_service.go` - implement admin reset behavior.
- `Games-Labs-Missions/internal/handlers/admin_handler.go` and/or `mission_handler.go` - add admin handler.
- `Games-Labs-Missions/internal/routes/apiv1.go` - register admin route.
- `Games-Labs-Missions/internal/grpc/missiongrpc/server.go` - dispatch admin reset RPC.
- `Games-Labs-Missions/cmd/main.go` - wire dependencies if needed.
- `Games-Labs-Missions/internal/services/*test.go` - add reset tests.
- `Games-Labs-Missions/internal/handlers/*test.go` - add handler tests.
- `docs/Games-Labs-APIs.postman_collection.json` - add Postman request.

## Plan
### Approach
Add a narrow admin-only write path that clears the current Bangkok-day Daily bucket for one user without touching other mission domains. Prefer explicit repository methods over ad hoc table mutations in handlers.

### Subtasks
1. Inspect the current Daily progress persistence surfaces and identify all Daily-only counters/claim state that must be reset together.
2. Update `missionspb.proto` and regenerate generated artifacts.
3. Implement repository and service methods for per-user Daily reset with repeat-safe semantics.
4. Add admin handler, route, gRPC dispatch, and any gateway wiring needed.
5. Add focused tests for validation, repeat reset, and non-impact on weekly/monthly/event data.
6. Add Postman request plus a recommended Mobile QA test sequence.

### Risks
- **Partial reset:** forgetting one Daily state bucket could produce inconsistent QA results.
  - **Mitigation:** enumerate all Daily-owned state touched by `missions/progress` and `quest/overview` before implementation and verify with tests.
- **Over-reset:** accidentally touching weekly/monthly/event state would be high-risk.
  - **Mitigation:** keep repository methods narrow and add explicit non-impact tests.

## Assignment
- Primary: `dev-2`
- Parallel: `false`
- Reason: Cross-cutting Daily state reset touches persistence and contract boundaries.

## Next Action
Run `dev-2`, then hand off to `reviewer`.
