# TASK-052: Wire Game Round Settlement Events

## Type
feature

## Priority
high

## Parent / Epic
- Parent: `TASK-049`
- Epic: Mobile Missions integration

## Scope
### Target Services
- `Games-Labs-Game`
  - Wire actual round settlement flow to `SettleRound` and `player.activity.v1` publishing.
- `Games-Labs-Provider`
  - Inspect provider callback settlement sources if needed.
- `shared-lib`
  - Use existing player activity event contract only; avoid contract changes unless PM approves.

## Description
Make game-play missions possible by ensuring real provider/game settlement flows publish canonical `round.settled` events with `round_count=1`, `game_id`, and `game_type`. `/game/launch` must remain non-progress.

## Acceptance Criteria
- [ ] Real settlement path calls Game service `SettleRound` or equivalent.
- [ ] `round_lifecycles` is persisted idempotently.
- [ ] `player.activity.v1` `round.settled` event is published with required metadata.
- [ ] Duplicate settlement does not incorrectly double-publish progress.
- [ ] Tests cover the wired settlement path.

## Assignment
- Primary: `dev-2`
- Parallel: `false`

## Next Action
Start after P0 staging verification tasks.
