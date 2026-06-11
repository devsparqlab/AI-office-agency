# TASK-044: Polish Event detail contract for UI actions

## Type
feature

## Priority
medium

## Parent / Epic
- Depends on: `TASK-041` Event read APIs.
- Epic: Quest phase 2.1 event completion

## Scope
### Target Services
- `shared-lib`
  - Update Event detail response contract only if additive fields are needed.
- `Games-Labs-Missions`
  - Ensure Event detail payload covers the current detail screen and `Go` action mapping cleanly.
- `docs`
  - Update Postman examples to match the final detail response shape.

### Explicitly Out Of Scope
- Do not add new Event reward claim persistence in this task; `TASK-043` owns Collect write-path work.
- Do not redesign Quest overview aggregation.
- Do not implement client-side deeplink routing logic inside backend.

## Description
Polish `GET /api/v1/missions/events/{event_id}` so Mobile/Frontend can render the detail screen cleanly and route `Go` actions without ad hoc mapping. This task should close any remaining contract gaps around top-level detail metadata, per-item action state, and target-routing hints.

## Acceptance Criteria
- [ ] Event detail response cleanly supports the current detail UI: title, remaining/reset, reward, achievement progress, sub-items, and per-item state.
- [ ] If needed, additive fields exist for routing/action metadata such as `game_id`, `provider_game_id`, `deeplink`, `action_type`, or equivalent agreed keys.
- [ ] Per-item states support FE rendering for `Go`, `Done`, and locked/inactive states predictably.
- [ ] Response shape remains backward-compatible and documented.
- [ ] Focused tests cover populated detail payload plus fallback/default mapping.
- [ ] Postman collection includes an updated detail example.

## Affected Files
- `shared-lib/proto/missionspb/missions.proto` - modify only if additive fields are required.
- `shared-lib/proto/missionspb/*` generated artifacts - regenerate only if proto changes.
- `Games-Labs-Missions/internal/services/event_service.go` - refine detail mapping.
- `Games-Labs-Missions/internal/services/*test.go` - add detail-shape coverage.
- `Games-Labs-Missions/internal/handlers/*test.go` - add detail response coverage if needed.
- `docs/Games-Labs-APIs.postman_collection.json` - update detail example.

## Plan
### Approach
Keep this as a contract-polish task. Reuse the existing Event read service and add only the minimum additive fields and mapping needed for the detail screen and `Go` routing.

### Subtasks
1. Compare current Event detail response against the Mobile detail screen fields.
2. Add only the minimum additive fields needed for action routing and item state clarity.
3. Update service mapping and tests.
4. Refresh Postman example with the final detail payload.

### Risks
- **Contract drift:** Ad hoc fields can become inconsistent across list/detail/overview.
  - **Mitigation:** Keep additions minimal and document the final shape clearly.
- **Over-scoping into frontend routing logic:** Backend should expose targets, not own navigation behavior.
  - **Mitigation:** Restrict changes to data fields only.

## Assignment
- Primary: `dev`
- Parallel: `false`
- Reason: Contract and mapping polish with lower risk than claim write-path.

## Next Action
Run `dev`, then hand off to `reviewer`.
