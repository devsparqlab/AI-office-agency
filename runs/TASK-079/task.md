# TASK-079: Wire Redemption Library Admin UI to API + Image Upload

## Short name
`redemption-library-api-and-upload`

## Type
feature

## Priority
medium

## Parent / Epic
- Parent: none
- Epic: Admin Redemption Management

## Status

Done. All six subtasks implemented and verified (Order build/vet/upload-tests,
api-gateway build/vet, backoffice typecheck clean, deploy YAML parses); reviewer
approved. The remaining step is the user's live operational smoke (deployed
backoffice + real S3/CloudFront end to end), which is ops, not a code deliverable.

## Background

`admin/manage/redemption/library` rendered from mock seed data + localStorage,
while the backing API already exists. The Order service exposes redemption and
tag admin endpoints (gRPC, transcoded to REST by api-gateway grpc-gateway):

- `GET/POST /api/v1/admin/redemptions` (+ `/{id}`) — Brand tab
- `GET/POST /api/v1/admin/redemptions-tags` (+ `/{id}`) — Collection Tag tab

`orderpb.Redemption{ id, name, tagIds, sortOrder, thumbnailUrl, status, createdAt }`
and `orderpb.Tag{ id, name, redemptionIds, status, createdAt }` are emitted as
camelCase JSON; logical errors arrive as HTTP 200 with `status.code != 200`.

Brand create/update needs a real `thumbnailUrl`. There is no upload pipeline
anywhere in the stack (the Game service only serves a read-only baked `assets/`
dir), so an S3-compatible upload vertical must be built. Decision: MinIO now,
AWS S3 later — store the object key and compose the public URL from
`S3_PUBLIC_BASE_URL`, keep the endpoint/path-style behind env, so the migration
is config-only with no DB rewrite.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `Games-Labs-backoffice` | Redemption library page: API reads, Collection Tag create/update, image uploader, Phase 2 brand create/update. |
| `Games-Labs-Order` | Owns redemption/tag endpoints (existing) and the new S3-compatible image upload endpoint. |
| `api-gateway` | Exposes the authed `/uploads` reverse-proxy route to the Order HTTP handler. |
| `ai-dev-office` | Stores task status, dev handoff, and verification evidence. |

### Affected files

- `Games-Labs-backoffice/app/pages/admin/manage/redemption/library/index.vue`
- `Games-Labs-backoffice/app/composables/useImageUpload.ts` (planned)
- `Games-Labs-Order/configs/config.go`
- `Games-Labs-Order/infrastructures/storage.go`
- `Games-Labs-Order/internal/core/handlers/adminorderhdl/adminorderhdl.go`
- `Games-Labs-Order/internal/core/handlers/adminorderhdl/upload_test.go`
- `Games-Labs-Order/cmd/main.go`
- `Games-Labs-Order/go.mod`, `Games-Labs-Order/go.sum`
- `Games-Labs-Order/k3s/deployment.yaml`, `Games-Labs-Order/k3s/configmap.yaml`
- `Games-Labs-Order/.github/workflows/deploy.yml`
- `api-gateway/gateway/http.go`
- `api-gateway/k3s/configmap.yaml`, `api-gateway/k3s/deployment.yaml`
- `ai-dev-office/runs/TASK-079/*`

### Explicitly out of scope

- Do not store base64/data URLs in the DB; `thumbnailUrl`/`logoUrl` are real URLs only.
- Brand `totalRedeem` has no API source and stays a placeholder (`-`).
- Presigned-URL upload is deferred; v1 is multipart POST through the gateway.
- MinIO/S3 cluster provisioning, bucket, and ingress are ops (user-owned).

## Acceptance criteria

- [x] Brand tab loads from `GET /api/v1/admin/redemptions` with pending/error states.
- [x] Collection Tag tab loads from `GET /api/v1/admin/redemptions-tags`.
- [x] Collection Tag create/update calls the tags API and preserves `redemptionIds`.
- [x] `status` is mapped as `status === true ? Active : Inactive` (no default-Active bug).
- [x] localStorage holds only the manual arrange order; list data comes from the API.
- [x] Order service exposes a `POST /uploads` multipart endpoint behind admin auth.
- [x] Upload validates type (png/jpeg/webp) by sniffing, enforces a 5MB limit, and returns `{ key, url }`.
- [x] Storage is S3-compatible with endpoint/path-style/public-base via env (MinIO→S3 = config only).
- [x] api-gateway exposes an authed `/uploads` route proxied to the Order HTTP handler.
- [x] Brand modal uploads via the gateway and sends a real `thumbnailUrl` (no data URL).
- [x] Brand create/update wired to `POST /api/v1/admin/redemptions[/{id}]` (Phase 2).
- [x] Order deployment/configmap/secret and the deploy workflow wire `S3_*` from GitHub Secrets (uploads disabled until `S3_BUCKET` is set).

## Technical plan

1. **Phase 1 (backoffice, done)** — API helper/types/mappers, parallel reads on
   mount, server-side search/date, Collection Tag create/update via API, reduce
   localStorage to arrange-only, pending/error UI. Gate Brand create/update with a
   toast until upload lands.
2. **Order upload (done)** — `infrastructures.InitStorage` (aws-sdk-go-v2,
   configurable endpoint/path-style), `S3_*` config, `adminorderhdl.UploadHTTP`
   (auth, sniff, 5MB, key `redemptions/{uuid}.{ext}`, returns `{key,url}`),
   register `/uploads` on the Order HTTP mux, focused tests.
3. **Gateway (next)** — add an authed `/uploads` group (outside `/api` to avoid the
   gin catch-all conflict) proxied to `OrderHTTPURL()`; add `order-http-url` to the
   configmap pointing at the Order HTTP port.
4. **Frontend uploader (next)** — `useImageUpload` posting multipart to
   `{gateway}/uploads`; replace the brand modal FileReader→data URL flow.
5. **Phase 2 (next)** — wire `submitBrand` to create/update redemptions with the
   uploaded URL; map the singular `redemptions` object from the response.

## Subtasks

| Order | ID | Agent | Description | Status |
| --- | --- | --- | --- | --- |
| 1 | `phase1-backoffice` | `dev` | Reads + Collection Tag CRUD + helper/error states | done |
| 2 | `order-upload` | `dev` | S3-compatible storage + `UploadHTTP` + tests | done |
| 3 | `gateway-upload-route` | `dev` | Authed `/uploads` proxy + `order-http-url` config | done |
| 4 | `frontend-uploader` | `dev` | `useImageUpload` + brand modal wiring | done |
| 5 | `phase2-brand-crud` | `dev` | Brand create/update against the redemptions API | done |
| 6 | `order-deploy-wiring` | `dev` | Wire `S3_*` env through Order deployment/configmap/secret + deploy workflow | done |

## Risks

| Risk | Mitigation |
| --- | --- |
| MinIO host URL baked into DB forces a data migration when moving to S3. | Store the object key only; compose the public URL from `S3_PUBLIC_BASE_URL`. |
| gin catch-all `/api/*filepath` conflicts with a static upload route. | Register `/uploads` as a separate top-level group (like `/assets`, `/health`). |
| grpc-gateway cannot transcode multipart uploads. | Upload is a manual Order HTTP handler reached via gateway reverse-proxy, not gRPC. |
| Brand create/update ships before a real upload URL exists. | Keep `submitBrand` gated with a toast until Phases 3–4 land. |

## Assignment

- Primary: `dev`
- Parallel: `false`

Reason: cross-service feature (backoffice UI, Order backend, gateway routing,
ops infra) that must stay ordered because Brand create/update depends on the
upload chain.

## Next action

All five subtasks are implemented and locally verified. Run `reviewer`, then live
smoke against MinIO + the dev gateway once storage is provisioned (user ops).
