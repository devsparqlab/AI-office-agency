# TASK-053: Enable ROUND_COUNT Daily Missions

## Type
feature

## Priority
high

## Parent / Epic
- Parent: `TASK-052`
- Epic: Mobile Missions integration

## Scope
### Target Services
- `Games-Labs-Missions`
  - Verify and enable `ROUND_COUNT_GAME` and `ROUND_COUNT_GAME_TYPE` Daily Activities after Game round events are wired.
- `docs`
  - Add QA flow for game-based daily missions.

## Description
After real `round.settled` events are flowing, enable game-based Daily Activities configured by exact `game_id` or `game_type`. There is still no “any game” condition in this phase.

## Acceptance Criteria
- [ ] `ROUND_COUNT_GAME` progresses only for matching `game_id`.
- [ ] `ROUND_COUNT_GAME_TYPE` progresses only for matching `game_type`.
- [ ] No `ROUND_COUNT_ANY` or any-game behavior is introduced.
- [ ] Mobile sees progress/status changes through `quest/overview`.
- [ ] QA docs include launch/settle/progress/claim flow.

## Assignment
- Primary: `dev-2`
- Parallel: `false`

## Next Action
Start after `TASK-052`.
