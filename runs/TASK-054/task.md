# TASK-054: Add Daily Activity UI Metadata

## Type
feature

## Priority
medium

## Parent / Epic
- Parent: `TASK-049`
- Epic: Mobile Missions integration

## Scope
### Target Services
- `Games-Labs-Missions`
  - Add Mobile display metadata to Daily Activity config and `quest/overview`.

## Description
Allow Mobile to render Daily items without hardcoded ordering, icons, CTA labels, or routes by adding backend-configurable UI metadata.

## Acceptance Criteria
- [ ] Daily Activities support `sort_order`.
- [ ] Daily Activities support icon/image metadata.
- [ ] Daily Activities support deeplink/action metadata where product confirms.
- [ ] `quest/overview` returns metadata backward-compatibly.
- [ ] Admin/backoffice can set metadata.

## Assignment
- Primary: `dev-2`
- Parallel: `false`

## Next Action
Start after P0/P1 API behavior is stable.
