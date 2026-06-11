# TASK-081: Add Redemption Item Update API and Wire Backoffice Edit

## Short name
`redemption-item-update-api`

## Type
feature

## Priority
high

## Parent / Epic
- Parent: `TASK-080`
- Epic: Admin Redemption Management

## Status

Done (2026-06-11, reviewer-approved). UpdateRedemptionItem shipped end to end:
shared-lib rpc `POST /api/v1/admin/redemption-items/{id}` (63ce30d), Order
service/repo/handler + tests (7be0ea3), api-gateway exposes the route (origin pins
63ce30d) — all on origin/main. Backoffice `items/edit/[id].vue` loads/saves via the
API with per-kind image upload, matching-create localized Struct encoding, and a
tolerant merge-read. Remaining is operational: the user commits/pushes the one
backoffice file and runs live smoke. The original task description follows.

Create the backend contract and downstream wiring needed for
`admin/manage/redemption/items/edit/:id` to save real updates. TASK-080 gates the
frontend Save action because the current admin order API only has item
create/list/get. This task owns the missing update API and the Backoffice edit
integration.

## PM Contract

```yaml
task:
  id: TASK-081
  title: Add Redemption Item Update API and Wire Backoffice Edit
  short_name: redemption-item-update-api
  parent: TASK-080
  epic: Admin Redemption Management
  type: feature
  priority: high
  created_at: '2026-06-08'
```

## Scope

### Target services

| Service | Reason |
| --- | --- |
| `shared-lib` | Add the cross-service admin order proto contract and generated gateway/swagger artifacts for item update. |
| `Games-Labs-Order` | Implement service validation, repository update transaction, handler mapping, and tests. |
| `api-gateway` | Bump/use the published shared-lib version so the generated HTTP route is exposed through the gateway. |
| `Games-Labs-backoffice` | Make `items/edit/[id].vue` load/save through real APIs and upload image files before saving. |
| `ai-dev-office` | Store task status and handoff artifacts. |

### Affected files

| Path | Action | Description |
| --- | --- | --- |
| `shared-lib/proto/admin/adminorderpb/adminorder.proto` | modify | Add `UpdateRedemptionItem` RPC and request/response messages. |
| `shared-lib/proto/admin/adminorderpb/*` | modify | Regenerate protobuf, grpc-gateway, and swagger artifacts. |
| `Games-Labs-Order/internal/core/handlers/adminorderhdl/adminorderhdl.go` | modify | Add handler method and request/response mapping. |
| `Games-Labs-Order/internal/core/services/ordersvc/service.go` | modify | Add update validation and service method. |
| `Games-Labs-Order/internal/core/repositories/redemption.go` | modify | Add transactional update SQL and code replacement. |
| `Games-Labs-Order/internal/core/ports/*.go` | modify | Add update method to service/repository interfaces. |
| `Games-Labs-Order/internal/core/services/ordersvc/service_test.go` | modify | Cover validation and update behavior. |
| `Games-Labs-Order/go.mod` / `go.sum` | modify | Bump shared-lib after it is published; no local `replace`. |
| `api-gateway/go.mod` / `go.sum` | modify | Bump shared-lib after it is published; no local `replace`. |
| `Games-Labs-backoffice/app/pages/admin/manage/redemption/items/edit/[id].vue` | modify | Save updates via the new API instead of localStorage. |
| `Games-Labs-backoffice/app/pages/admin/manage/redemption/items.vue` | modify | Ensure edit navigation passes only route intent and list refreshes from API. |
| `Games-Labs-backoffice/app/composables/useImageUpload.ts` | reuse/modify if needed | Upload changed images through `/uploads` before update. |

## Description

The Backoffice redemption item edit page currently loads and saves through
`useRedemptionItemsStorage`, while the backend exposes only
`POST /api/v1/admin/redemption-item`, `GET /api/v1/admin/redemption-items`, and
`GET /api/v1/admin/redemption-items/{id}`. Add the missing admin item update
contract and implementation, then wire the edit page so clicking Update persists
the edited item through the API and survives reload.

The contract change starts in `shared-lib`; downstream services must not invent
local replacement request/response types. Publish/bump shared-lib before
consumer service changes. Never commit `replace github.com/SparqLab/shared-lib =>
../shared-lib`.

## Public API / Contract

Add an admin order RPC:

```proto
rpc UpdateRedemptionItem(UpdateRedemptionItemRequest) returns (UpdateRedemptionItemResponse) {
  option (google.api.http) = {
    put: "/api/v1/admin/redemption-items/{id}"
    body: "*"
  };
}
```

`UpdateRedemptionItemRequest` should include `id` plus the same editable payload
shape as `CreateRedemptionItemRequest`:

- `name`
- `redemption_id`
- `tag_ids`
- `level_id`
- `thumbnail_url`
- `logo_url`
- `start_date`
- `end_date`
- `is_end_date`
- `point`
- `languages`
- `details`
- `conditions`
- `code`
- `is_barcode`
- `is_qr`
- `is_text`
- `time_limit`
- `is_quota_limit_per_day`
- `player_quota_condition_1`
- `player_quota_condition_2`
- `player_quota_condition_3`
- `limit_day_per_player_1`
- `limit_day_per_player_2`
- `limit_day_per_player_3`
- `status`

Response:

```proto
message UpdateRedemptionItemResponse {
  basepb.StatusResponse status = 1;
  orderpb.RedemptionItem redemption_item = 2;
}
```

## Acceptance Criteria

- [ ] `shared-lib` defines and generates `UpdateRedemptionItem` with HTTP `PUT /api/v1/admin/redemption-items/{id}`.
- [ ] `Games-Labs-Order` validates `id`, `redemption_id`, `tag_ids`, dates/quota/code fields consistently with create.
- [ ] Updating a redemption item persists all editable fields and replaces `redemption_item_codes` from the submitted `code[]` in one transaction.
- [ ] `GET /api/v1/admin/redemption-items/{id}` returns updated values after a successful update.
- [ ] `api-gateway` exposes the new route after shared-lib bump.
- [ ] `items/edit/[id].vue` loads the item via API and clicking Update sends the new API request.
- [ ] Changed thumbnail/banner files are uploaded through `/uploads` before save; saved item stores URLs, not data URLs.
- [ ] Existing TASK-080 list/create flows still build and are not regressed.
- [ ] No `replace github.com/SparqLab/shared-lib => ../shared-lib` remains in committed `go.mod` files.

## Plan

### Approach

Implement sequentially. Start with `shared-lib` contract and generated artifacts,
publish/bump it, then update backend consumers and finally Backoffice. Keep
frontend field mapping aligned with existing `orderpb.RedemptionItem` names.

### Subtasks

| Order | ID | Agent | Description | Owned files | Parallel safe |
| --- | --- | --- | --- | --- | --- |
| 1 | `shared-lib-contract` | `dev-2` | Add `UpdateRedemptionItem` proto contract, generate artifacts, and prepare publish/bump handoff. | `shared-lib/proto/admin/adminorderpb/*` | false |
| 2 | `order-update-service` | `dev-2` | Bump shared-lib in `Games-Labs-Order`, add ports/service validation/handler/repository transaction and tests. | `Games-Labs-Order/internal/**`, `Games-Labs-Order/go.mod`, `Games-Labs-Order/go.sum` | false |
| 3 | `gateway-shared-lib-bump` | `dev-2` | Bump shared-lib in `api-gateway` and verify the new generated gateway route is available. | `api-gateway/go.mod`, `api-gateway/go.sum`, `api-gateway/gateway/http.go` if needed | false |
| 4 | `backoffice-edit-save` | `dev-2` | Wire `items/edit/[id].vue` to GET/PUT APIs and upload image files before update. | `Games-Labs-backoffice/app/pages/admin/manage/redemption/items/edit/[id].vue`, `Games-Labs-backoffice/app/pages/admin/manage/redemption/items.vue`, `Games-Labs-backoffice/app/composables/useImageUpload.ts` if needed | false |
| 5 | `verification-handoff` | `dev-2` | Run focused backend/frontend verification and document any remaining API gaps. | `ai-dev-office/runs/TASK-081/*` | false |

### Risks

| Risk | Mitigation |
| --- | --- |
| shared-lib contract cannot be consumed until published | Stop after shared-lib generation and ask user to publish/bump before downstream changes, per AGENTS.md. |
| API boolean `status` cannot represent UI `Draft` | Persist only Active/Inactive for real API saves; remove or gate Draft in update flow unless a later contract adds enum status. |
| `redemption_item_codes` replacement may partially update data | Use one repository transaction for item row update and code delete/insert. |
| Backoffice currently passes data in query params | Load source-of-truth item by id and keep query params only for `purpose=view|edit`. |

## Assignment

- Primary: `dev-2`
- Parallel: `false`

Reason: This is cross-service contract work. `shared-lib/**`, `.proto`, generated
files, and `go.mod/go.sum` are shared or sequential files, so parallel execution
would create avoidable merge and dependency risk.

## Verification

- `cd shared-lib && make proto` or the repo's existing proto generation command.
- `cd Games-Labs-Order && go test ./internal/core/services/ordersvc ./internal/core/handlers/adminorderhdl ./internal/core/repositories`
- `cd Games-Labs-Order && GOWORK=off go build -mod=readonly ./...`
- `cd api-gateway && GOWORK=off go build -mod=readonly ./...`
- `cd Games-Labs-backoffice && npm run build`
- Manual smoke through gateway:
  - create redemption item
  - get item by id
  - update item through `PUT /api/v1/admin/redemption-items/{id}`
  - get item again and confirm persisted fields
  - open `admin/manage/redemption/items/edit/:id`, update, reload, confirm values remain

## Context Sources

```yaml
context_sources:
  github:
    branch: ""
    pr: ""
  socraticode:
    status: used
    queries:
      - codebase_status projectPath=d:\\llm
    relevant_symbols:
      - shared-lib/proto/admin/adminorderpb/adminorder.proto
      - Games-Labs-Order/internal/core/handlers/adminorderhdl/adminorderhdl.go
      - Games-Labs-backoffice/app/pages/admin/manage/redemption/items.vue
      - Games-Labs-backoffice/app/pages/admin/manage/redemption/items/edit/[id].vue
      - Games-Labs-backoffice/app/composables/useImageUpload.ts
    notes: Remote index was green; source files were verified directly before task creation.
blockers: []
```

## Artifacts

- `ai-dev-office/runs/TASK-081/task.md`
- `ai-dev-office/runs/TASK-081/status.yaml`

## Next Action

Run `dev-2` on TASK-081 after confirming shared-lib publish/bump workflow is
available for this branch.
