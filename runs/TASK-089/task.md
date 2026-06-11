# TASK-089: Parameterized Redemption Item Create Wizard (E-Voucher / Gift)

## Short name
`redemption-create-wizard-kind`

## Type
feature

## Priority
medium

## Parent / Epic
- Parent: `TASK-080`
- Epic: Admin Redemption Management

## Status

In progress. The redemption item list is splitting into **E-Voucher** and **Gift**
tabs, and the two create flows diverge:

- **E-Voucher** — 4 steps: Basic Info · Condition · Code (import) · Setting
  (display type + time limit + quota *computed from uploaded codes*).
- **Gift** — 2 steps: Basic Info (with inline manual quota) · Condition.

Per the agreed design, build ONE wizard component parameterized by a `kind` prop
(not two separate modals), since the flows share ~70-80% (basic-info core,
condition, image upload, quota field group). Only the step set and quota source
differ.

This task delivers the component scaffold first. Wiring it into the list (remove
the inline modal, add the E-Voucher/Gift tabs) is a follow-up — the list page work
is deferred at the user's request.

## Scope

### Affected files

| Path | Action | Description |
| --- | --- | --- |
| `Games-Labs-backoffice/app/components/RedemptionItemCreateModal.vue` | add | Parameterized create wizard (kind: evoucher \| gift). |
| `Games-Labs-backoffice/app/pages/admin/manage/redemption/items.vue` | modify (follow-up) | Replace inline create modal with the component; add tabs. |

## Create contract (existing)

`POST /api/v1/admin/redemption-item` (snake_case body): name, redemption_id,
tag_ids[], level_id, thumbnail_url, logo_url, start_date, end_date, is_end_date,
point, languages[], details[], conditions[], code[], is_barcode, is_qr, is_text,
time_limit, is_quota_limit_per_day, player_quota_condition_1, limit_day_per_player_1,
status.

## Backend gaps (flagged, not blocking the UI)

- No `type` field → E-Voucher vs Gift is not persisted (same as B6 `typeLabel`).
  The list tabs cannot truly filter by kind until the API returns a type.
- No `total_quota` field → Gift's manual Total Quota has nowhere to go;
  E-Voucher quota is implied by `code[].length`.
- No field for a separate "Limit per Player" (only `limit_day_per_player_1`).

## Acceptance Criteria

- [ ] One component renders both flows by `kind` (gift = 2 steps, evoucher = 4 steps).
- [ ] Shared Basic Info / Condition / quota-field markup written once.
- [ ] E-Voucher: code import (demo .csv/.txt parse) + dedupe modal + code list;
      Total Quota in Setting = code count (read-only).
- [ ] Gift: manual Total Quota in Basic Info; no Code/Setting steps.
- [ ] Submits to POST /redemption-item; emits `created`; image upload via /uploads.
- [ ] `nuxi typecheck` clean for the new component.

## Verification

- `cd Games-Labs-backoffice && npx nuxi typecheck` (new component clean).
- Manual (after wiring): open Create New E-Voucher → 4 steps; Create New Gift → 2 steps.

## Assignment

- Primary: `dev`
- Parallel: `false`

## Next Action

Build the component scaffold; review structure; then wire into items.vue + add tabs.
