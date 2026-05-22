# Golden Pass ListCategory Playability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional playability metadata to `ListCategory` so authenticated clients can tell whether each catalog game is currently playable without changing the endpoint into a filtered catalog.

**Architecture:** Extend `shared-lib` `gamepb.CategoryGame` with optional playability fields, then thread optional `userID` through `Games-Labs-Game` `ListCategory` so the handler can annotate every returned game using the same Golden Pass access logic already used by `List` and `LaunchGame`. Keep guest behavior public and non-personalized by returning `null` metadata when user context is absent or cannot be evaluated.

**Tech Stack:** Go 1.25, gRPC, grpc-gateway/OpenAPI generation in `shared-lib`, Games-Labs-Game service/handler tests.

---

### Task 1: Extend the shared-lib `gamepb` contract

**Files:**
- Modify: `shared-lib/proto/gamepb/game.proto`
- Modify: `shared-lib/proto/gamepb/game.pb.go`
- Modify: `shared-lib/proto/gamepb/game.pb.gw.go`
- Modify: `shared-lib/proto/gamepb/game_grpc.pb.go`
- Modify: `shared-lib/proto/gamepb/game.swagger.json`
- Modify: `shared-lib/proto/gamepb/swagger.pb.go`

- [ ] **Step 1: Add optional playability fields to `CategoryGame`**

Update `shared-lib/proto/gamepb/game.proto` so `CategoryGame` includes:

```proto
message CategoryGame {
  string id = 1;
  string game_id = 2;
  int32 sort_order = 3;
  google.protobuf.Timestamp created_at = 4;
  google.protobuf.Timestamp updated_at = 5;
  string category_id = 6;
  string game_name = 7;
  string game_image_url = 8;
  optional bool is_playable = 9;
  optional string playability_reason = 10;
}
```

- [ ] **Step 2: Regenerate shared-lib artifacts**

Run: `make buf`  
Expected: regenerated `gamepb` protobuf, gRPC, gateway, and swagger artifacts include the new fields.

- [ ] **Step 3: Run shared-lib verification**

Run: `go test ./...` in `shared-lib`  
Expected: PASS

- [ ] **Step 4: Stop and wait for published shared-lib**

Do not continue into downstream service changes yet. Per workspace `AGENTS.md`, new cross-service proto/types in `shared-lib` must be published and bumped before consumer changes proceed.

- [ ] **Step 5: Commit shared-lib-only change**

```bash
git -C /Users/earth/Documents/GitHub/shared-lib add proto/gamepb/game.proto proto/gamepb/game.pb.go proto/gamepb/game.pb.gw.go proto/gamepb/game_grpc.pb.go proto/gamepb/game.swagger.json proto/gamepb/swagger.pb.go
git -C /Users/earth/Documents/GitHub/shared-lib commit -m "feat(shared-lib): add category game playability metadata"
```

### Task 2: Bump Games-Labs-Game to the published shared-lib version

**Files:**
- Modify: `Games-Labs-Game/go.mod`
- Modify: `Games-Labs-Game/go.sum`

- [ ] **Step 1: Update consumer module version**

After the user publishes `shared-lib`, bump `Games-Labs-Game` to the published version:

Run: `GOPRIVATE="github.com/SparqLab/*" GONOSUMDB="github.com/SparqLab/*" go get github.com/SparqLab/shared-lib@<published-version>` in `Games-Labs-Game`  
Expected: `go.mod` and `go.sum` point at the published module version and contain no `replace`.

- [ ] **Step 2: Tidy the module**

Run: `GOPRIVATE="github.com/SparqLab/*" GONOSUMDB="github.com/SparqLab/*" go mod tidy` in `Games-Labs-Game`  
Expected: dependency graph is clean and consistent.

### Task 3: Thread optional user-aware playability through Games-Labs-Game

**Files:**
- Modify: `Games-Labs-Game/internal/models/category.go`
- Modify: `Games-Labs-Game/internal/core/ports/services.go`
- Modify: `Games-Labs-Game/internal/core/services/gamesvc/service.go`
- Modify: `Games-Labs-Game/internal/core/services/gamesvc/level_access.go`
- Modify: `Games-Labs-Game/internal/core/handlers/gamehdl/grpc.go`

- [ ] **Step 1: Add playability metadata to the internal category model**

Extend `CategoryGame` in `internal/models/category.go` with optional response metadata:

```go
type CategoryGame struct {
	ID                uuid.UUID
	CategoryID        uuid.UUID
	GameID            uuid.UUID
	GameName          string
	GameImageURL      string
	SortOrder         int32
	CreatedAt         time.Time
	UpdatedAt         time.Time
	IsPlayable        *bool
	PlayabilityReason *string
}
```

- [ ] **Step 2: Make `ListCategory` accept optional user context explicitly**

Change the service interface in `internal/core/ports/services.go` from:

```go
ListCategory(ctx context.Context) ([]models.CategoryWithGames, error)
```

to:

```go
ListCategory(ctx context.Context, userID string) ([]models.CategoryWithGames, error)
```

Use empty string to mean guest/unauthenticated, matching the existing `List` convention.

- [ ] **Step 3: Add a helper that annotates category games once per request**

In `internal/core/services/gamesvc/service.go`, update `ListCategory` to:

- fetch `ListActiveCategoriesWithGames` exactly as today,
- return untouched games with nil metadata when `userID == ""`,
- fetch user level once when `userID != ""`,
- compute Golden Pass state once per request,
- annotate each `CategoryGame` using a helper such as:

```go
func annotateCategoryGames(list []models.CategoryWithGames, userLevel int64, cfg *missionspb.GoldenPassConfigResponse, hasGoldenPass bool) []models.CategoryWithGames
```

The helper should:

- set `IsPlayable = ptr(true)` when `canPlayGameAtLevel(...)` is true,
- set `IsPlayable = ptr(false)` and `PlayabilityReason = ptr("level_locked")` when false,
- preserve nil metadata only for guest or user-level lookup failure paths.

- [ ] **Step 4: Keep fail-safe behavior aligned with the approved design**

Inside `ListCategory`:

- if user lookup fails, return the catalog with nil metadata rather than failing the request,
- if Missions config/pass lookup fails, evaluate against normal user level only,
- do not filter games out of categories.

- [ ] **Step 5: Map the new fields in the gRPC handler**

In `internal/core/handlers/gamehdl/grpc.go`:

- read `userid` from request metadata using the same pattern already used by `ListGame`,
- call `h.gs.ListCategory(ctx, userID)`,
- map `IsPlayable` and `PlayabilityReason` into `gamepb.CategoryGame`,
- leave them unset when the internal model field is nil.

Example mapping:

```go
cg := &gamepb.CategoryGame{
  Id: ...,
  CategoryId: ...,
  GameId: ...,
  GameName: ...,
  GameImageUrl: ...,
  SortOrder: ...,
  CreatedAt: ...,
  UpdatedAt: ...,
}
if items[i].Games[j].IsPlayable != nil {
  cg.IsPlayable = items[i].Games[j].IsPlayable
}
if items[i].Games[j].PlayabilityReason != nil {
  cg.PlayabilityReason = items[i].Games[j].PlayabilityReason
}
```

### Task 4: Add focused tests for guest, level-lock, and Golden Pass annotation

**Files:**
- Modify: `Games-Labs-Game/internal/core/services/gamesvc/service_golden_pass_test.go`
- Modify: `Games-Labs-Game/internal/core/handlers/gamehdl/grpc.go` or add a new `grpc_test.go` beside it if a focused handler test is cleaner
- Modify: `Games-Labs-Game/README.md`

- [ ] **Step 1: Add a guest `ListCategory` service test**

Create or extend a test that verifies:

- all category games are still returned,
- `IsPlayable == nil`,
- `PlayabilityReason == nil`.

- [ ] **Step 2: Add an authenticated no-pass test**

Verify that with `userLevel = 5` and no Golden Pass:

- level 0 and level <= 5 games get `IsPlayable = true`,
- higher-level games get `IsPlayable = false`,
- locked games get `PlayabilityReason = "level_locked"`.

- [ ] **Step 3: Add an authenticated Golden Pass test**

Verify that with `userLevel = 5`, Golden Pass active, and config `{offset: 11, cap: 16}`:

- games up to level 16 are marked playable,
- games above 16 are marked locked.

- [ ] **Step 4: Add a user lookup failure test**

Verify that if user level cannot be fetched:

- category response still returns,
- all playability fields remain nil.

- [ ] **Step 5: Add a handler test for metadata-to-proto mapping**

Verify that:

- `userid` metadata is passed through to `ListCategory`,
- nil internal fields become absent proto optionals,
- set internal fields appear in the protobuf response.

- [ ] **Step 6: Update README**

Document in `Games-Labs-Game/README.md`:

- `ListCategory` remains a public catalog,
- playability metadata is optional and only evaluated for authenticated requests,
- `null` means “not evaluated,” not “locked,”
- `LaunchGame` remains the enforcement point.

### Task 5: Run verification and record the handoff

**Files:**
- Modify: `Games-Labs-Game/go.mod`
- Modify: `Games-Labs-Game/go.sum`
- Modify: `Games-Labs-Game/README.md`
- Modify: `ai-dev-office/runs/TASK-063/dev-2-output.yaml`
- Modify: `ai-dev-office/runs/TASK-063/reviewer-output.yaml`
- Modify: `ai-dev-office/runs/TASK-063/status.yaml`

- [ ] **Step 1: Run focused verification**

Run in `Games-Labs-Game`:

```bash
go test ./...
```

Expected: PASS

- [ ] **Step 2: Re-check consumer module policy**

Run:

```bash
rg -n "replace .*shared-lib|github.com/SparqLab/shared-lib" /Users/earth/Documents/GitHub/Games-Labs-Game/go.mod
```

Expected:

- published `github.com/SparqLab/shared-lib` version is pinned,
- no `replace` directive is present.

- [ ] **Step 3: Update AI Dev Office runtime files**

Record:

- what changed,
- the exact shared-lib version used,
- `go test ./...` evidence,
- that guest `null` semantics and authenticated lock semantics were verified.

- [ ] **Step 4: Commit downstream change**

```bash
git -C /Users/earth/Documents/GitHub/Games-Labs-Game add go.mod go.sum internal/models/category.go internal/core/ports/services.go internal/core/services/gamesvc/service.go internal/core/services/gamesvc/level_access.go internal/core/handlers/gamehdl/grpc.go internal/core/services/gamesvc/service_golden_pass_test.go README.md
git -C /Users/earth/Documents/GitHub/Games-Labs-Game commit -m "feat(game): annotate category playability"
```

## Self-review

- Spec coverage: the plan covers contract updates, explicit publish/bump sequencing, service/handler annotation logic, guest `null` semantics, authenticated `level_locked` semantics, docs, and verification.
- Placeholder scan: no `TODO` or “implement later” steps remain; all risky parts name exact files and commands.
- Type consistency: the plan consistently uses `optional bool is_playable`, `optional string playability_reason`, internal `*bool` / `*string` metadata, and the existing Golden Pass helpers from `TASK-062`.

Plan complete and saved to `/Users/earth/Documents/GitHub/ai-dev-office/docs/superpowers/plans/2026-05-21-golden-pass-list-category-playability.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
