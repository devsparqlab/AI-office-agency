# TASK-088: Wire Collection Tag Column in Redemption Library List

## Short name
`redemption-library-collection-tag-column`

## Type
feature

## Priority
medium

## Parent / Epic
- Parent: `TASK-081`
- Epic: Admin Redemption Management

## Status

In progress. The Backoffice redemption library list page
(`admin/manage/redemption/library`) gained a new "Collection Tag" column in the
table header, but the body cell was a copy-paste placeholder rendering `row.status`
(plus a leftover `console.log` debug expression). Populate the column with real
collection-tag data from the already-loaded API lists and render it as chips in the
same visual style as the redemption items list (`admin/manage/redemption/items`,
`tagChipClass` cycling palette).

## Scope

### Target services

| Service | Reason |
| --- | --- |
| `Games-Labs-backoffice` | Wire the new Collection Tag column to API data and fix the table structure. |
| `ai-dev-office` | Track task status. |

### Affected files

| Path | Action | Description |
| --- | --- | --- |
| `Games-Labs-backoffice/app/pages/admin/manage/redemption/library/index.vue` | modify | Resolve collection-tag names and render chips; fix colgroup/colspan; remove debug log. |

## Description

The library list already fetches both `GET /api/v1/admin/redemptions` (brands, each
with `tagIds`) and `GET /api/v1/admin/redemptions-tags` (collection tags, id+name)
on mount. The new column needs no new request — it resolves names client-side:

- **Brand tab**: map each brand row's `tagIds` → tag names (via the loaded tags
  list) and render them as chips. Unresolved ids are dropped; empty renders `—`.
- **Collection Tag tab**: the row *is* a tag, so render its own name as one chip.

Chips match the items list exactly (`tagChipClass(i)` cycling
`bg-primary-300 text-primary-800` palette, `rounded-r12 px-2 py-0.5 text-xs`).

Structural fixes the placeholder left behind:
- `colgroup` had 7 `<col>` for 8 columns → add the 8th and rebalance widths.
- Empty-state row `colspan="7"` → `colspan="8"`.
- Remove the `{{ console.log(...) }}` debug expression in the Status cell.

## Acceptance Criteria

- [ ] Collection Tag column renders linked tag-name chips for Brand rows.
- [ ] Collection Tag column renders the tag's own name chip on the Collection Tag tab.
- [ ] Chip style matches `admin/manage/redemption/items` (`tagChipClass`).
- [ ] `colgroup` has 8 cols; empty-state `colspan` is 8; min-width updated.
- [ ] Debug `console.log` removed from the Status cell.
- [ ] No new API request added; data comes from the existing mount-time fetches.

## Verification

- `cd Games-Labs-backoffice && npx nuxi typecheck` (page is clean; pre-existing
  errors elsewhere unchanged).
- Manual: open `admin/manage/redemption/library`, Brand tab shows each brand's
  collection-tag chips; Collection Tag tab shows the tag name chip; empty rows show
  `—`; column header/body alignment is correct.

## Assignment

- Primary: `dev`
- Parallel: `false`

## Next Action

User commits/pushes the one backoffice file and runs a live smoke check.
