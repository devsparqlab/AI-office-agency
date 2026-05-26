# TASK-068: Check-In Calendar Docs And Consumer Handoff

## Short name
`check-in-calendar-docs-handoff`

## Type
feature

## Priority
medium

## Parent / Epic
- Parent: `TASK-066`
- Epic: Check-In Calendar and Consecutive Bonus

## Status

Blocked until `TASK-067` implements the runtime behavior.

## Background

After `TASK-066` defines the contract and `TASK-067` implements
`Games-Labs-Missions`, API consumers need synchronized docs, Postman examples,
and a concise Mobile/Backoffice handoff. The feature is not ready for Mobile
until docs show the actual runtime request/response behavior.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `Games-Labs-Missions` | Source README/API behavior documentation. |
| `api-gateway` | Gateway Postman collection copy and Swagger visibility. |
| `docs` | Duplicate top-level Postman/API collection copy when present. |
| `ai-dev-office` | Durable handoff/evidence artifacts for the workstream. |

### Affected files

- `Games-Labs-Missions/README.md`
- `api-gateway/docs/Games-Labs-APIs.postman_collection.json`
- `docs/Games-Labs-APIs.postman_collection.json`
- `ai-dev-office/runs/TASK-068/verification-evidence.md`
- `ai-dev-office/runs/TASK-068/dev-2-output.yaml`

### Explicitly out of scope

- Do not change `shared-lib` contract.
- Do not change Missions runtime behavior.
- Do not modify Mobile/Frontend code.

## Acceptance criteria

- [ ] `Games-Labs-Missions/README.md` documents the Mobile calendar read, check-in, milestone claim, restore quote, restore action, and Backoffice config flows.
- [ ] Request and response examples include per-day status/reward, D3/D7/D15/D31 milestone status/reward, restore price, and request bodies.
- [ ] `api-gateway/docs/Games-Labs-APIs.postman_collection.json` includes the new Mobile and Backoffice check-in endpoints.
- [ ] `docs/Games-Labs-APIs.postman_collection.json` is updated with the same endpoint examples when the duplicate file exists.
- [ ] Both Postman collection copies parse as valid JSON.
- [ ] Handoff guidance explicitly says Mobile should render from backend status/reward fields and must not infer calendar/milestone state client-side.
- [ ] Verification evidence records the exact commands used and confirms the docs match the runtime endpoints from `TASK-067`.

## Technical plan

1. Read the final `TASK-067` implementation and generated swagger to capture the
   actual endpoint names, request bodies, and response fields.
2. Update `Games-Labs-Missions/README.md` with Mobile and Backoffice examples.
3. Update both Postman collection copies, keeping duplicate files aligned.
4. Parse both JSON collections to verify they are valid.
5. Write `verification-evidence.md` with docs sync evidence and consumer handoff.

## Subtasks

| Order | ID | Agent | Description | Owned files | Parallel safe |
| --- | --- | --- | --- | --- | --- |
| 1 | `read-runtime-contract` | `dev-2` | Inspect TASK-067 runtime code/swagger and list final endpoint examples. | `ai-dev-office/runs/TASK-068/verification-evidence.md` | false |
| 2 | `missions-readme-docs` | `dev-2` | Update Missions README with Mobile and Backoffice flows. | `Games-Labs-Missions/README.md` | false |
| 3 | `postman-sync` | `dev-2` | Update gateway and duplicate Postman collections with aligned endpoint examples. | `api-gateway/docs/Games-Labs-APIs.postman_collection.json`, `docs/Games-Labs-APIs.postman_collection.json` | false |
| 4 | `docs-verification` | `dev-2` | Parse JSON collections and record handoff evidence. | `ai-dev-office/runs/TASK-068/verification-evidence.md`, `ai-dev-office/runs/TASK-068/dev-2-output.yaml` | false |

## Risks

| Risk | Mitigation |
| --- | --- |
| Docs drift from the implemented runtime shape. | Start from TASK-067 code/swagger, not the earlier plan. |
| Only one Postman collection copy gets updated. | Treat both collection copies as in scope and parse both. |
| Mobile infers state client-side despite backend contract. | Include explicit handoff wording that backend status/reward fields are authoritative. |

## Assignment

- Primary: `dev-2`
- Parallel: `false`

Reason: docs must be synchronized against final runtime behavior and duplicate
collection files should be updated together.

## Next action

Blocked. Run after `TASK-067` passes review.
