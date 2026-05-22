# Golden Pass ListCategory Playability Design

## Goal

Keep `ListCategory` as a public catalog while giving FE/Mobile enough information to show whether each game is currently playable for an authenticated user.

## Background

`TASK-062` made Golden Pass access configurable and enforced it in `Games-Labs-Game` for authenticated `List` and `LaunchGame`.

Current behavior after `TASK-062`:

- `List(search, category, userID)` is user-aware and filters inaccessible games out.
- `LaunchGame` is user-aware and enforces the same level and Golden Pass access rule.
- `ListCategory` is still public catalog data and returns active categories with games without user-aware access metadata.

This leaves FE/Mobile with a UX gap:

- public catalog screens can show games that the user cannot currently launch,
- but the client cannot reliably know which games are locked without duplicating backend rules.

## Product decision

Chosen direction:

- Keep `ListCategory` as a public catalog.
- Do not hide locked games from the catalog.
- Add optional per-game playability metadata so authenticated clients can render locked/playable state.
- Keep `LaunchGame` as the final enforcement point.

## Approaches considered

### 1. Make `ListCategory` fully user-filtered

Return only currently accessible games for authenticated users.

Why not chosen:

- changes the behavior of an existing catalog endpoint,
- makes category contents vary per user,
- removes discoverability of locked games,
- couples catalog browsing to entitlement evaluation more tightly than needed.

### 2. Keep catalog public and only enforce on `LaunchGame`

Return the same catalog for everyone and provide no extra metadata.

Why not chosen:

- simplest backend shape,
- but FE/Mobile would only discover lock state after a launch attempt,
- poor UX and encourages clients to re-implement access logic.

### 3. Keep catalog public and add playability metadata

Return all games as today, but annotate each game with current playability when user context is available.

Why chosen:

- preserves catalog behavior and discoverability,
- gives FE/Mobile enough signal to show lock/playable UI,
- keeps the source of truth in backend logic,
- keeps `LaunchGame` as final enforcement.

## API behavior

`ListCategory` remains the same high-level endpoint and still returns all active categories with their games.

New behavior:

- If request has no authenticated user context:
  - each game returns `is_playable = null`
  - each game returns `playability_reason = null`
- If request has authenticated user context:
  - backend evaluates the same access rule already used by `List` and `LaunchGame`
  - each game returns:
    - `is_playable = true` when the user may launch it now
    - `is_playable = false` when the user may not launch it now
    - `playability_reason = "level_locked"` when the current known reason is level gating

This response is informational only. `LaunchGame` still performs the authoritative runtime check.

## Proposed response shape

Add fields to `gamepb.CategoryGame` in shared-lib:

```proto
message CategoryGame {
  string id = ...;
  string category_id = ...;
  string game_id = ...;
  string game_name = ...;
  string game_image_url = ...;
  int32 sort_order = ...;
  google.protobuf.Timestamp created_at = ...;
  google.protobuf.Timestamp updated_at = ...;
  optional bool is_playable = ...;
  optional string playability_reason = ...;
}
```

Semantics:

- `is_playable == nil` means "not evaluated"
- `is_playable == true` means "evaluated and playable"
- `is_playable == false` means "evaluated and not playable"
- `playability_reason == nil` means "no specific reason available"
- `playability_reason == "level_locked"` means "blocked by current level / Golden Pass entitlement rule"

No enum is required for the first version because only one explicit reason is needed today.

## Access evaluation rule

For authenticated requests, evaluate playability using the same helper path as `List` and `LaunchGame`:

- read user level,
- check `HasActivePass(user_id, "golden_pass")`,
- read `GetGoldenPassConfig` through the same cached adapter path,
- compute:

```text
effective_max = max(user_level, min(user_level + level_offset, max_game_level))
```

- compare the game's `level` against `effective_max`

Rule outcomes:

- `game.level == 0` is playable
- `game.level <= effective_max` is playable
- otherwise not playable with reason `level_locked`

Fail-safe:

- if there is no authenticated user context, return `null` metadata
- if user-level lookup fails, return `null` metadata rather than a false lock
- if Missions pass/config lookup fails, treat Golden Pass bonus as unavailable but still evaluate against normal `user_level`

This mirrors current `LaunchGame` safety while avoiding misleading locked states caused only by missing runtime context.

## Service design

### shared-lib

Update `gamepb` proto for `ListCategoryResponse.CategoryWithGames.Games` item fields:

- add `optional bool is_playable`
- add `optional string playability_reason`

Regenerate protobuf/grpc-gateway artifacts as required by the repo.

### Games-Labs-Game service

Current `ListCategory(ctx)` signature has no user context parameter beyond request `context.Context`.

Recommended change:

- keep the method name `ListCategory`
- derive optional user identity from request context in the gRPC handler, the same way authenticated handlers already do elsewhere
- thread the optional `userID` into service evaluation without changing the public endpoint contract shape

Implementation options:

1. extend the service method signature to `ListCategory(ctx context.Context, userID string)`
2. keep the signature and let the service read user identity from context

Recommendation:

- prefer explicit `userID string` threading for clarity and easier testing,
- use empty string to mean unauthenticated, matching the existing `List` pattern.

Service behavior:

- fetch catalog categories/games exactly as today,
- if `userID == ""`, map new proto fields to nil,
- if `userID != ""`, compute per-game playability using shared helpers.

To avoid duplication, factor the access evaluation into a helper reusable by:

- `List`
- `LaunchGame`
- `ListCategory` playability annotation

The helper should produce:

- effective max play level,
- boolean playable for a required level,
- optional reason string when not playable.

### Handler behavior

`gamehdl.ListCategory` should:

- attempt to extract authenticated user id from context,
- pass empty string when absent,
- map optional fields onto the protobuf response.

The endpoint remains usable for guests without requiring auth.

## Testing

### shared-lib

- proto regeneration succeeds
- generated code contains the new optional fields

### Games-Labs-Game

Add focused tests for:

- guest request:
  - catalog still returns all games
  - `is_playable` and `playability_reason` are nil
- authenticated user without Golden Pass:
  - lower/equal level games return playable
  - higher level games return false with `level_locked`
- authenticated user with Golden Pass:
  - games unlocked by configured offset/cap return playable
  - games above effective max return false with `level_locked`
- Missions config failure:
  - category response still returns
  - playability falls back to normal user-level rule, not unknown
- user lookup failure:
  - category response still returns
  - playability metadata is nil to avoid false negatives

Also verify that `LaunchGame` behavior is unchanged by this follow-up.

## Docs

Update:

- `shared-lib` generated artifacts if swagger changes
- `Games-Labs-Game/README.md` to explain that `ListCategory` is a public catalog with optional playability metadata
- Postman/docs only if this endpoint is documented there today

## Risks

### Guest vs authenticated ambiguity

If FE treats `null` like `false`, users may see false lock states.

Mitigation:

- document `null` as "not evaluated"
- have FE/Mobile explicitly branch on three states: `true`, `false`, `null`

### Duplicated access logic

If `ListCategory` gets a separate implementation path, it may drift from `List` and `LaunchGame`.

Mitigation:

- share the same access helper and Golden Pass state logic

### Added per-game evaluation cost

`ListCategory` can return many games.

Mitigation:

- compute user level and Golden Pass state once per request,
- reuse that state across all games in the response.

## Recommended follow-up task scope

One focused task is enough:

- shared-lib proto update for `CategoryGame`
- Games-Labs-Game handler/service/helper/test updates
- docs refresh

No Missions changes are needed for this follow-up because `TASK-062` already provides the required Golden Pass config and pass-state backend surfaces.
