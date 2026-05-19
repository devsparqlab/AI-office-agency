# TASK-055: Daily Grouping / Parent Mission

## Metadata

| Field | Value |
| ----- | ----- |
| **Short name** | `daily-parent-groups` |
| **Parent** | TASK-049 |
| **Epic** | Mobile Missions integration |
| **Type** | feature |
| **Priority** | medium |
| **Primary agent** | dev-2 |
| **Parallel** | false |

## Scope

### Target services

| Service | Reason |
| ------- | ------ |
| `Games-Labs-Missions` | Owns `daily_activities`, consumer-driven progress, `GET /api/v1/quest/overview`, `POST /api/v1/missions/claim-daily`, admin `/api/v1/admin/activities`, migrations. |

### Likely affected files (verify during implementation)

| Path | Action | Notes |
| ---- | ------ | ----- |
| `Games-Labs-Missions/migrations/*.sql` | create | New group + membership (+ optional parent claim) tables; forward-compatible indexes and FKs to `daily_activities`. |
| `Games-Labs-Missions/internal/models/models.go` | modify | Types for groups, nested overview payload, parent progress/claim flags. |
| `Games-Labs-Missions/internal/repositories/mission_repo.go` | modify | Load group definitions; join progress for children; parent aggregates; claim persistence for parents. |
| `Games-Labs-Missions/internal/services/mission_service.go` | modify | Parent eligibility derives from children (`IsComplete` / claim rules unchanged per child); new parent claim branch + wallet/idempotency. |
| `Games-Labs-Missions/internal/services/quest_overview_service.go` | modify | Daily tab: emit grouped structure (parent nodes + child items), preserving backward-compatible fields where feasible. |
| `Games-Labs-Missions/internal/services/quest_overview_service_test.go` | modify | Coverage for grouped Daily tab JSON. |
| `Games-Labs-Missions/internal/handlers/mission_handler.go` | modify | Extend claim request handling if parent uses same or new endpoint (see plan). |
| `Games-Labs-Missions/internal/routes/apiv1.go` | modify | Register admin routes for groups if split from activities. |
| `Games-Labs-Missions/internal/handlers/mission_handler.go` (admin) | modify | CRUD/list for daily groups + membership (or documented alternative). |
| `Games-Labs-Missions/README.md` | modify | Schema, overview JSON shape, admin/config story. |
| `api-gateway/docs/Games-Labs-APIs.postman_collection.json` | modify | Example `quest/overview` + claim payloads for grouped dailies (optional but recommended). |

### Contract note

- `shared-lib/proto/missionspb/missions.proto`: `GetQuestOverview` returns `google.protobuf.Struct` — **no proto edit required** for JSON shape changes; still update docs and coordinate Mobile on response schema.
- `Games-Labs-Missions/internal/grpc/missiongrpc/server.go` dispatches HTTP → same payloads apply via gateway.

## Description

Introduce a **first-class Daily parent/group** concept backed by a **new relational group table** (not columns on `daily_activities`). Each parent declares an ordered set of **child activity IDs** that remain ordinary `daily_activities` rows.

- **Child behavior**: Unchanged event-driven progress (`daily_activity_consumer_events` / `daily_activity_progress`) and existing claim semantics (`POST /api/v1/missions/claim-daily` per child activity id).
- **Parent progress**: Derived only from children — e.g. completed children count vs total configured children (`0/N`, `1/N`, …). Definition of “completed” must match existing daily completion rules used for `IsComplete` / `CanClaim` styling (typically threshold met for the Bangkok day window).
- **Parent reward**: Separate configurable reward; **parent claim is distinct** from child claims (separate persistence and idempotency keys).
- **Mobile**: `GET /api/v1/quest/overview` Daily tab returns a structure that encodes parent rows and nested/active children so clients **do not** reconstruct grouping locally.

Example mapping (product): parent `play-2-games` → children `play-slot-once`, `play-fishing-once`.

## Product / UX (frozen inputs)

- Parent card above children; parent uses navigation CTA metadata where applicable; children keep normal Go/claim flows.
- Visual parity on Weekly screens may mirror UX **outside backend scope for this task** unless TASK-049 explicitly requires Weekly backend grouping (flag as follow-up).

## Acceptance criteria

1. **Schema**: Migrations add group storage (parent metadata + child membership FK to `daily_activities`). Children remain rows in `daily_activities`; parents are not hack-rows in that table.
2. **Child invariants**: No change to consumer/event application logic for children; existing integration tests patterns still apply for child progression.
3. **Parent progress**: For each active parent and user/day, backend exposes `current`/`target` (or equivalent) where target = configured child count and current = children satisfying completion for that day — aligned with `applyDailyActivityStatuses` / repo progress.
4. **Quest overview**: `GET /api/v1/quest/overview` Daily tab includes a documented JSON shape with explicit parent nodes and nested child activity payloads (same per-item fields as today’s items where applicable). Mobile can render without inferring groups from flat lists.
5. **Parent claim**: When all children are complete for the day (per product rules), parent becomes claimable; claiming credits parent reward once per day (or per configured limit), persists claim, respects wallet + mission idempotency patterns consistent with `ClaimDailyMission`.
6. **Progress API**: `GET /api/v1/missions/progress` either includes grouped daily structure **or** documents why overview alone is sufficient — pick one approach and document; prefer consistency with overview.
7. **Admin / backoffice story**: Written spec in `Games-Labs-Missions/README.md` (or linked doc): CRUD/list operations, validation (no duplicate membership, cycle prevention N/A for tree depth 1), activation flags, ordering; implemented admin HTTP endpoints **or** explicit interim “seed + SQL-only” path with ticket for UI.
8. **Tests**: Table-driven tests for overview grouping and parent progress; claim tests for parent happy-path and guardrails (not claimable until children done, double-claim, inactive parent).

## Technical plan

### Approach

1. **Model**: e.g. `daily_activity_groups` (parent id, display fields mirroring TASK-054 metadata pattern as needed, reward, currency, `active`, `sort_order`, …) and `daily_activity_group_members` (`group_id`, `activity_id`, `sort_order`, UNIQUE(`group_id`,`activity_id`)).
2. **Parent completion**: Compute from loaded `DailyActivity` progress slice — count children where `IsComplete` (or stricter if product requires “claimable” state only; document choice).
3. **Overview**: Extend `QuestOverviewItem` or Daily tab structure with optional `children []QuestOverviewItem` **or** a discriminated `kind` field (`activity` | `group`) — prefer backward-compatible additive JSON (existing clients ignore unknown fields).
4. **Claim**: Either extend `claim-daily` to accept `group_id` when `mission_id` references a parent, **or** add `POST /api/v1/missions/claim-daily-group` — choose one, document in README and Postman.
5. **Admin**: REST handlers parallel to `/api/v1/admin/activities` for groups and membership maintenance.

### Subtasks (ordered)

| Order | ID | Agent | Description | Owned files (primary) |
| ----- | -- | ----- | ----------- | ---------------------- |
| 1 | `055-schema-repo` | dev-2 | Migrations + repository reads for groups/members; seed-friendly constraints. | `Games-Labs-Missions/migrations/`, `Games-Labs-Missions/internal/repositories/mission_repo.go`, `Games-Labs-Missions/internal/models/models.go` |
| 2 | `055-progress-parent-state` | dev-2 | Compute parent aggregates from existing child progress; optional `MissionProgress` / list APIs updates. | `Games-Labs-Missions/internal/services/mission_service.go`, `Games-Labs-Missions/internal/repositories/mission_repo.go`, tests |
| 3 | `055-quest-overview-shape` | dev-2 | Implement grouped Daily tab in `QuestOverviewService`; JSON tests. | `Games-Labs-Missions/internal/services/quest_overview_service.go`, `quest_overview_service_test.go` |
| 4 | `055-parent-claim` | dev-2 | Parent claim persistence + wallet credit + handler/route + grpc parity via mux. | `Games-Labs-Missions/internal/services/mission_service.go`, `Games-Labs-Missions/internal/handlers/mission_handler.go`, `Games-Labs-Missions/internal/routes/apiv1.go` |
| 5 | `055-admin-docs` | dev-2 | Admin endpoints + README admin/config narrative + Postman examples. | `Games-Labs-Missions/internal/handlers/*`, `Games-Labs-Missions/README.md`, `api-gateway/docs/*.postman_collection.json` |

### Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| JSON breaking change for Mobile | Additive fields / new array alongside legacy flat list for one release, or version gate — align with TASK-049 owners. |
| Ambiguity “complete” vs “claimed” for parent unlock | Lock rule in README (likely all children `IsComplete`; clarify if claimed required). |
| Daily mission cap interaction | Parent reward must interact cleanly with `DailyMissionDailyCap` / `RecordMission`; mirror existing daily activity accounting. |
| Weekly screen mentions grouping | Treat as UX-only or separate task unless scope expands. |

### Estimated complexity

**High** (schema, aggregation, new claim path, overview contract, admin surface).

## Assignment rationale

Cross-cutting changes across migrations, services, handlers, and external JSON consumers → **dev-2**, sequential subtasks.

## References (code)

- Overview Daily tab: `Games-Labs-Missions/internal/services/quest_overview_service.go` (`buildDailyTab`).
- Daily claim: `Games-Labs-Missions/internal/services/mission_service.go` (`ClaimDailyMission`, `claimableDailyActivity`).
- Routes: `Games-Labs-Missions/internal/routes/apiv1.go`.
- Gateway RPC: `shared-lib/proto/missionspb/missions.proto` (`GetQuestOverview`).
