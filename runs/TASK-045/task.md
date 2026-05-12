# TASK-045: Verify Event UX consistency across list, detail, and overview

## Type
feature

## Priority
medium

## Parent / Epic
- Depends on: `TASK-043` and `TASK-044`.
- Epic: Quest phase 2.1 event completion

## Scope
### Target Services
- `Games-Labs-Missions`
  - Verify and tighten consistency across Event list, Event detail, and Quest overview projections.
- `docs`
  - Refresh summary examples where needed.

### Explicitly Out Of Scope
- Do not introduce new reward engines.
- Do not add new tabs or redesign overview ordering.
- Do not move business logic out of existing Event/Overview services unless a clear bug requires it.

## Description
Close the loop after Event claim and detail polish by verifying that the same Event state reads consistently across:
- Event list
- Event detail
- Quest overview v2 event tab

This task is for final UX/API consistency and any light glue fixes needed so FE/Mobile see the same event state everywhere.

## Acceptance Criteria
- [ ] Event list/detail/overview project the same event state semantics for progress, claimable, claimed, remaining time, and active/upcoming/expired status.
- [ ] After a successful claim, list/detail/overview reflect the updated state consistently.
- [ ] Any light glue fixes stay within existing Event/Overview service boundaries.
- [ ] Focused consistency tests pass.
- [ ] Postman summary/examples are updated if visible response semantics changed.

## Affected Files
- `Games-Labs-Missions/internal/services/event_service.go` - adjust state projection only if needed.
- `Games-Labs-Missions/internal/services/quest_overview_service.go` - adjust event tab composition only if needed.
- `Games-Labs-Missions/internal/services/*test.go` - add consistency coverage.
- `Games-Labs-Missions/internal/handlers/*test.go` - add response consistency coverage if needed.
- `docs/Games-Labs-APIs.postman_collection.json` - refresh examples if semantics changed.

## Plan
### Approach
Treat this as a consistency pass, not a new feature build. Verify the same underlying event state is projected coherently through every read surface the UI touches.

### Subtasks
1. Compare Event state fields across list, detail, and overview.
2. Add focused tests for post-claim and time-window consistency.
3. Make only small glue fixes required to keep outputs aligned.
4. Refresh docs/examples if semantics changed.

### Risks
- **Semantic drift between screens:** FE may show conflicting event states.
  - **Mitigation:** Add explicit consistency assertions across projections.
- **Scope creep into new logic:** This should not become a redesign task.
  - **Mitigation:** Limit changes to glue and projection consistency only.

## Assignment
- Primary: `dev-2`
- Parallel: `false`
- Reason: Final cross-surface consistency pass after Event claim and detail work are complete.

## Next Action
Run after `TASK-043` and `TASK-044` are done, then hand off to `reviewer`.
