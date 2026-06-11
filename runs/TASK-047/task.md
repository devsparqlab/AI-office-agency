# TASK-047: Add DEV-only daily reset override

## Type
feature

## Priority
medium

## Parent / Epic
- Depends on: none
- Epic: Mission QA acceleration for Mobile and DEV

## Scope
### Target Services
- `Games-Labs-Missions`
  - Add a DEV-only configurable override for Daily reset cadence.
- `api-gateway`
  - Expose no new public behavior unless existing gateway wiring needs documentation changes.
- `docs`
  - Document the DEV-only behavior and expected QA caveats.

### Explicitly Out Of Scope
- Do not enable interval-based reset in staging or production.
- Do not change weekly, monthly, invite, or event reset semantics.
- Do not add a backoffice toggle UI in this phase.
- Do not silently replace the default Bangkok-midnight behavior.

## Description
After the narrow admin reset endpoint exists, add an optional DEV-only reset override for Daily missions so QA can simulate rapid natural reset behavior such as 10-minute or 15-minute windows when specifically needed for countdown and rollover UX testing.

The default behavior must remain `00:00 Asia/Bangkok`. The override must be explicitly enabled by configuration and must be clearly isolated from non-DEV environments.

## Acceptance Criteria
- [ ] Default behavior remains calendar-based reset at `00:00 Asia/Bangkok`.
- [ ] A DEV-only config/feature flag can switch Daily reset to a short interval policy.
- [ ] Config shape is explicit, e.g. reset mode plus interval minutes, and is ignored or rejected outside DEV/local.
- [ ] `GET /api/v1/quest/overview` Daily tab countdown reflects the override when enabled.
- [ ] Any Daily progress/read logic that depends on the current reset bucket uses the same override consistently.
- [ ] Focused tests cover default mode, interval mode, boundary rollover, and environment guarding.
- [ ] Docs explain that this is QA-only behavior and must not be enabled in production-like environments.

## Affected Files
- `Games-Labs-Missions/internal/services/mission_service.go` - update Daily bucket/reset helpers if needed.
- `Games-Labs-Missions/internal/services/quest_overview_service.go` - align Daily countdown with override.
- `Games-Labs-Missions/internal/config/*` and/or env loading - add DEV-only config.
- `Games-Labs-Missions/cmd/main.go` - wire config into services.
- `Games-Labs-Missions/internal/services/*test.go` - add reset policy tests.
- `Games-Labs-Missions/README.md` and/or `docs/*` - document DEV-only behavior and caveats.

## Plan
### Approach
Keep the production rule unchanged and layer a narrow DEV-only reset policy abstraction under Daily read/write helpers. The same policy must drive both countdown responses and Daily state bucketing to avoid QA confusion.

### Subtasks
1. Inspect all Daily helpers that currently assume Bangkok-midnight buckets and identify where a reset policy abstraction is needed.
2. Add DEV-only config/feature flag wiring with strict environment guardrails.
3. Update Daily countdown and bucket logic to use the same reset policy consistently.
4. Add tests for default mode, interval mode, rollover, and environment restrictions.
5. Document the QA-only nature and recommended usage.

### Risks
- **DEV/prod drift:** QA behavior could diverge too far from production semantics.
  - **Mitigation:** keep the feature off by default, DEV-only, and documented as a targeted test aid.
- **Inconsistent timers vs buckets:** countdown might not match actual progress rollover.
  - **Mitigation:** use one shared reset policy source for both reads and state bucketing.

## Assignment
- Primary: `dev-2`
- Parallel: `false`
- Reason: Mobile explicitly prefers the DEV-only time-window override first, and this task now becomes the primary QA unblocker.

## Next Action
Run `dev-2`, then hand off to `reviewer`.
