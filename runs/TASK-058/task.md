# TASK-058: Turnover Scoped By Game

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
  - Add turnover-by-game or turnover-by-game-type conditions if events provide reliable metadata.
- `Games-Labs-Order`
  - Verify turnover events carry `game_id`/`game_type` where needed.

## Description
Support missions like “collect turnover on game X” or “collect SLOT turnover” by adding scoped turnover condition types after verifying event metadata quality.

## Acceptance Criteria
- [ ] Turnover event metadata reliability is verified.
- [ ] New condition types are defined, for example `TURNOVER_GAME` and `TURNOVER_GAME_TYPE`.
- [ ] Mapper applies turnover only when scope matches.
- [ ] Backoffice/admin validation enforces required scope fields.
- [ ] Tests cover scoped and non-matching events.

## Assignment
- Primary: `dev-2`
- Parallel: `false`

## Next Action
Start after product confirms scoped turnover requirements.
