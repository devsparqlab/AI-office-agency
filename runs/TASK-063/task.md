# TASK-063: Golden Pass User Game Playability APIs

## Short name
`golden-pass-user-game-playability`

## Type
feature

## Priority
medium

## Parent / Epic
- Parent: `TASK-062`
- Epic: Store & Pass economy

## Background

`TASK-062` made Golden Pass access configurable and enforced it in launch flow.

The code delivered in this follow-up is broader than the original plan and should be
tracked as such:

- `ListGame` (`GET /api/v1/game`) is now a discoverability-first list:
  - guests see the full list without playability metadata,
  - authenticated users see the full list annotated with `is_playable` /
    `playability_reason`.
- `ListUserGame` (`GET /api/v1/game/my-games`) is the filtered personalized list:
  - authenticated users receive only games currently playable for their level /
    Golden Pass state.
- `ListCategory` remains a public catalog and is also annotated with playability
  metadata for authenticated users.
- `LaunchGame` remains the final enforcement point.

This task record is updated to match the code that actually shipped.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `shared-lib` | Extend `gamepb.Game` and `gamepb.CategoryGame` with optional `is_playable` / `playability_reason`, add `ListUserGame`, and regenerate generated artifacts |
| `Games-Labs-Game` | Keep `ListGame` and `ListCategory` discoverability-first with metadata, add filtered `ListUserGame`, and preserve `LaunchGame` enforcement |

### Explicitly out of scope

- `Games-Labs-Missions` behavior or config shape
- Mobile/UI implementation
- Changing `LaunchGame` enforcement semantics

## Product rules

### Discoverability metadata semantics (`ListGame` and `ListCategory`)

For each `Game` in `ListGame` and each `CategoryGame` in `ListCategory`:

- no authenticated user context:
  - `is_playable = null`
  - `playability_reason = null`
- authenticated and game can be played now:
  - `is_playable = true`
  - `playability_reason = null`
- authenticated and game is level-locked:
  - `is_playable = false`
  - `playability_reason = "level_locked"`

### Filtered personalized list semantics (`ListUserGame`)

- `ListUserGame` requires authenticated user context.
- It returns only games currently playable under the same level / Golden Pass rule.
- If authenticated user context is absent, the current implementation returns an empty list.

### Access rule

For authenticated evaluation, use the same rule as `TASK-062`:

```text
effective_max = max(user_level, min(user_level + level_offset, max_game_level))
```

Outcomes:

- `game.level == 0` is playable
- `game.level <= effective_max` is playable
- otherwise locked with `playability_reason = "level_locked"`

### Fail-safe behavior

- no user context on `ListGame` / `ListCategory`: return `null` metadata
- user level lookup fails on `ListGame` / `ListCategory`: return `null` metadata, do not fail the response
- Missions Golden Pass/config lookup fails: evaluate against normal user level only
- do not hide or remove games from `ListGame` / `ListCategory`
- `ListUserGame` remains the filtered line; user lookup failure follows its endpoint error path

## Shared-lib publish/bump rule

This task introduced new cross-service proto fields in `shared-lib`.

Per `/Users/earth/Documents/GitHub/AGENTS.md`:

1. implement `shared-lib` proto and generated artifacts first
2. stop and ask the user to publish / bump `shared-lib`
3. only then continue with downstream `Games-Labs-Game` changes
4. do not use a committed `replace` directive in consumer `go.mod`

## Key files

- `shared-lib/proto/gamepb/game.proto`
- `shared-lib/proto/gamepb/game.pb.go`
- `shared-lib/proto/gamepb/game.pb.gw.go`
- `shared-lib/proto/gamepb/game_grpc.pb.go`
- `shared-lib/proto/gamepb/game.swagger.json`
- `shared-lib/proto/gamepb/swagger.pb.go`
- `Games-Labs-Game/internal/models/game.go`
- `Games-Labs-Game/internal/models/category.go`
- `Games-Labs-Game/internal/core/ports/services.go`
- `Games-Labs-Game/internal/core/services/gamesvc/service.go`
- `Games-Labs-Game/internal/core/services/gamesvc/level_access.go`
- `Games-Labs-Game/internal/core/handlers/gamehdl/grpc.go`
- `Games-Labs-Game/README.md`

## Acceptance criteria

### shared-lib

- [x] `gamepb.Game` includes optional `is_playable` and `playability_reason`
- [x] `gamepb.CategoryGame` includes optional `is_playable` and `playability_reason`
- [x] `ListUserGame` is exposed at `GET /api/v1/game/my-games`
- [x] generated gamepb artifacts are updated
- [x] `shared-lib` tests pass

### Games-Labs-Game

- [x] `ListGame` still returns the discoverability list and does not filter locked games out
- [x] `ListCategory` still returns the public catalog and does not filter locked games out
- [x] guest/unauthenticated `ListGame` / `ListCategory` requests return `null` playability metadata
- [x] authenticated `ListGame` / `ListCategory` requests evaluate playability with the same Golden Pass rule as `LaunchGame`
- [x] `ListUserGame` returns only playable games for the authenticated user
- [x] level-locked games return `is_playable = false` and `playability_reason = "level_locked"`
- [x] user lookup failure does not fail `ListGame` / `ListCategory` and returns `null` metadata
- [x] Missions config/pass failure falls back to normal user-level evaluation only
- [x] `LaunchGame` behavior remains unchanged
- [x] `go.mod` uses a published `shared-lib` version with no committed `replace`

### Docs / verification

- [x] `Games-Labs-Game/README.md` now reflects the delivered `ListGame` / `ListUserGame` / `ListCategory` split accurately
- [ ] focused service/handler tests for `ListGame`, `ListUserGame`, and `ListCategory` are still missing from the current tree

## Risks

| Risk | Mitigation |
| --- | --- |
| FE interprets `null` as locked | Document `null` as “not evaluated” and keep boolean false only for evaluated lock states |
| `ListGame`, `ListUserGame`, and `ListCategory` drift from each other | Reuse the same Golden Pass state/helper path and document the split explicitly |
| Consumer changes proceed before published shared-lib exists | Treat publish/bump as a mandatory stop between shared-lib and Game work |
| Task artifacts describe the wrong endpoint semantics | Keep TASK-063 aligned to delivered behavior and record remaining gaps explicitly |

## Assignment

- Primary: `dev-2`
- Parallel: `false`

## Next action

`done`: TASK-063 now reflects shipped behavior. Remaining follow-up is focused service/handler test coverage and any external API docs that should mention `/api/v1/game/my-games`.
