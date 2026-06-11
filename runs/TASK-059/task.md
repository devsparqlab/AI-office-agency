# TASK-059: Claim Endpoint Alignment

## Type
refactor

## Priority
low

## Parent / Epic
- Parent: `TASK-049`
- Epic: Mobile Missions integration

## Scope
### Target Services
- `Games-Labs-Missions`
  - Align daily claim endpoint contract and docs.
- `api-gateway` / docs
  - Update public API documentation if endpoint strategy changes.

## Description
Resolve long-term confusion between `POST /api/v1/missions/claim-daily` and the documented/generic `claim-reward` path. Decide whether to keep, alias, deprecate, or migrate endpoint usage.

## Acceptance Criteria
- [ ] Product/backend decides canonical Daily Activity claim path.
- [ ] Docs no longer describe conflicting daily claim behavior.
- [ ] Mobile migration impact is documented.
- [ ] Backward compatibility is preserved or deprecation plan is explicit.

## Assignment
- Primary: `dev`
- Parallel: `false`

## Next Action
Start after Mobile integration is stable and endpoint usage is observed.
