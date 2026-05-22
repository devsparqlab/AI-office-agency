# TASK-063: Golden Pass Category Playability Metadata

## Short name
`golden-pass-category-playability`

## Type
feature

## Priority
medium

## Parent / Epic
- Parent: `TASK-062`
- Epic: Store & Pass economy

## Background

`TASK-062` made Golden Pass access configurable and enforced it in authenticated `List` and `LaunchGame`.

Current post-`TASK-062` behavior:

- `List` hides games that are not currently playable for the authenticated user.
- `LaunchGame` enforces the same level / Golden Pass rule at runtime.
- `ListCategory` still behaves as a public catalog and returns games without any access metadata.

Product decision for this follow-up:

- Keep `ListCategory` as a public catalog.
- Do not filter locked games out.
- Add per-game playability metadata for authenticated requests so FE/Mobile can show lock/playable state.
- When user context is absent, return `unknown/null` playability metadata.
- `LaunchGame` remains the final enforcement point.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `shared-lib` | Extend `gamepb.CategoryGame` with optional `is_playable` and `playability_reason`; regenerate generated artifacts |
| `Games-Labs-Game` | Annotate `ListCategory` games using the same Golden Pass access rule already used by `List` and `LaunchGame`; preserve public catalog behavior |

### Explicitly out of scope

- `Games-Labs-Missions` behavior or config shape
- Filtering games out of `ListCategory`
- New endpoint creation
- Mobile/UI implementation
- Changing `LaunchGame` enforcement semantics

## Product rules

### Playability metadata semantics

For each `CategoryGame` in `ListCategory`:

- no authenticated user context:
  - `is_playable = null`
  - `playability_reason = null`
- authenticated and game can be played now:
  - `is_playable = true`
  - `playability_reason = null`
- authenticated and game is level-locked:
  - `is_playable = false`
  - `playability_reason = "level_locked"`

### Access rule

For authenticated users, use the same rule as `TASK-062`:

```text
effective_max = max(user_level, min(user_level + level_offset, max_game_level))
```

Outcomes:

- `game.level == 0` is playable
- `game.level <= effective_max` is playable
- otherwise locked with `playability_reason = "level_locked"`

### Fail-safe behavior

- no user context: return `null` metadata
- user level lookup fails: return `null` metadata, do not fail catalog response
- Missions Golden Pass/config lookup fails: evaluate against normal user level only
- do not hide or remove games from the category response

## Shared-lib publish/bump rule

This task introduces new cross-service proto fields in `shared-lib`.

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
- `Games-Labs-Game/internal/models/category.go`
- `Games-Labs-Game/internal/core/ports/services.go`
- `Games-Labs-Game/internal/core/services/gamesvc/service.go`
- `Games-Labs-Game/internal/core/services/gamesvc/level_access.go`
- `Games-Labs-Game/internal/core/handlers/gamehdl/grpc.go`
- `Games-Labs-Game/internal/core/services/gamesvc/service_golden_pass_test.go`
- `Games-Labs-Game/README.md`

## Acceptance criteria

### shared-lib

- [x] `gamepb.CategoryGame` includes optional `is_playable` and `playability_reason`
- [x] generated gamepb artifacts are updated
- [x] `shared-lib` tests pass

### Games-Labs-Game

- [x] `ListCategory` still returns the public catalog and does not filter locked games out
- [x] guest/unauthenticated request returns `null` playability metadata
- [x] authenticated request evaluates playability with the same Golden Pass rule as `List` / `LaunchGame`
- [x] level-locked games return `is_playable = false` and `playability_reason = "level_locked"`
- [x] user lookup failure does not fail the endpoint and returns `null` playability metadata
- [x] Missions config/pass failure falls back to normal user-level evaluation only
- [x] `LaunchGame` behavior remains unchanged
- [x] `go.mod` uses a published `shared-lib` version with no committed `replace`

### Docs / verification

- [x] `Games-Labs-Game/README.md` documents public-catalog plus optional playability metadata semantics
- [x] tests cover guest, authenticated no-pass, authenticated Golden Pass, and failure paths

## Risks

| Risk | Mitigation |
| --- | --- |
| FE interprets `null` as locked | Document `null` as “not evaluated” and keep boolean false only for evaluated lock states |
| `ListCategory` drifts from `List`/`LaunchGame` rules | Reuse the same Golden Pass state/helper path |
| Consumer changes proceed before published shared-lib exists | Treat publish/bump as a mandatory stop between shared-lib and Game work |

## Assignment

- Primary: `dev-2`
- Parallel: `false`

## Next action

`dev-2`: update `shared-lib` proto + generated artifacts first, then stop for shared-lib publish/bump before proceeding into `Games-Labs-Game`.
