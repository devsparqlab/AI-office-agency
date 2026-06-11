# TASK-079 Verification Evidence

## Phase 1 — backoffice (`Games-Labs-backoffice`)

Tooling: no typecheck script in the repo; installed `typescript` + `vue-tsc`
with `--no-save` (manifests unchanged) and ran the Nuxt typecheck.

- `node_modules/.bin/nuxi prepare` → types generated (pre-existing route-name
  warning only, unrelated to this change).
- `node_modules/.bin/nuxi typecheck` → **0 errors** referencing
  `app/pages/admin/manage/redemption/library/index.vue`.
  - All reported errors belong to pre-existing files: `useAdminTabs.ts`,
    `admin/[...path].vue`, `games/index.vue`, `promotion/coupon/edit/[id].vue`,
    `missions.vue`, `orders.vue`, `users.vue`, `wallets.vue`.
- `git status --short` → only `index.vue` modified; `package.json` /
  `package-lock.json` untouched.

Not run (no credentials in this environment): live smoke against
`dev-api-gateway.gameslabs.app` (open page, create/edit tag, reload). Left to the
user.

## Order service — image upload (`Games-Labs-Order`)

- `go get github.com/aws/aws-sdk-go-v2/{config,credentials,service/s3}@latest`
  then `go mod tidy` → added aws-sdk-go-v2 v1.41.x line; `go.mod`/`go.sum` updated.
- `go build ./...` → passed (exit 0).
- `go vet ./...` → passed (exit 0).
- `gofmt -l configs/config.go infrastructures/storage.go
  internal/core/handlers/adminorderhdl/adminorderhdl.go cmd/main.go` → no output
  (all formatted).
- `go test ./internal/core/handlers/adminorderhdl/... -run TestUploadHTTP -v`:

  ```
  --- PASS: TestUploadHTTP_PNG_OK
  --- PASS: TestUploadHTTP_Forbidden
  --- PASS: TestUploadHTTP_NotConfigured
  --- PASS: TestUploadHTTP_UnsupportedType
  --- PASS: TestUploadHTTP_MissingFile
  ok  github.com/SparqLab/games-lab/game-api/internal/core/handlers/adminorderhdl
  ```

Coverage: happy path (PNG → 200, key `redemptions/*.png`, composed url, `Put`
called with `image/png`, stored bytes match), missing permission → 403, uploader
nil → 503, non-image → 415, missing file field → 400.

## Gateway — upload route (`api-gateway`)

- Added an authed `/uploads` group (separate top-level group so it does not
  collide with the gin `/api/*filepath` catch-all): `Auth` → `RequireAdminAPIAccess`
  → `InjectTrustedIdentityHeaders` → `SimpleProxy(config.OrderHTTPURL())`.
- Identity chain: `Auth` sets `role`/`permissions` in the gin context →
  `ProxyRequest` re-injects them as request headers → Order `RequireStaffHTTP`
  reads them. No extra wiring needed.
- `order-http-url: http://games-labs-order-service:8087` added to the configmap;
  `ORDER_HTTP_URL` mapped in the deployment (optional). The Order k8s Service
  already exposes HTTP port 8087 (`name: http`, nodePort 30807) and probes
  `/health` on 8087, so no Order manifest change is needed. Note: the runtime
  `PORT` is 8087 (deployment override), not the Go default 8086 — the configmap
  uses 8087.
- `go build ./...` → passed. `go vet ./gateway/...` → passed. `gofmt -l` → clean.
- `go test ./gateway/... ./middleware/...` → passed (gateway has no test files).

## Frontend — uploader + Phase 2 brand CRUD (`Games-Labs-backoffice`)

- `composables/useImageUpload.ts`: multipart POST `file` to `{gateway}/uploads`
  with the bearer header and **no** `Content-Type` (browser sets the boundary);
  returns the public `url`.
- Brand modal `onBrandLogoFile` now uploads and stores the returned URL in
  `brandForm.logoUrl` with pending/error UI; the FileReader→data URL path is gone,
  so no base64 can reach the API/DB.
- `submitBrand` wired to `POST /api/v1/admin/redemptions` (create) and
  `/redemptions/{id}` (update), sending `thumbnailUrl`, preserving `tagIds` on
  update, and mapping the singular `redemptions` object from the response.
- Save and the file input are disabled while uploading/submitting.
- `nuxi typecheck` → **0 errors** in `redemption/library/index.vue` and
  `composables/useImageUpload.ts` (18 pre-existing errors remain in unrelated files).

Not run (no MinIO/credentials here): live upload + brand create/edit against the
dev gateway. Left to the user once storage is provisioned.

## Order deploy wiring — S3 env (`Games-Labs-Order`)

- `k3s/deployment.yaml`: 7 `S3_*` env vars — `S3_ENDPOINT/REGION/BUCKET/FORCE_PATH_STYLE/PUBLIC_BASE_URL`
  from the `games-labs-order-config` configMap, `S3_ACCESS_KEY/S3_SECRET_KEY` from the
  `games-labs-order-secret` secret. All `optional: true`, so the pod starts before the
  values exist (uploads stay disabled until `S3_BUCKET` is set).
- `k3s/configmap.yaml`: added `s3-endpoint/s3-region/s3-bucket/s3-force-path-style/s3-public-base-url`
  (placeholders; real values injected by the workflow).
- `.github/workflows/deploy.yml`: maps the `S3_*` GitHub Secrets, defaults `S3_REGION=us-east-1`
  and `S3_FORCE_PATH_STYLE=true`, adds the five S3 config keys to the `games-labs-order-config`
  configmap and `s3-access-key`/`s3-secret-key` to the `games-labs-order-secret` secret.
- Key names verified consistent end to end: deployment refs ↔ configmap/secret keys ↔ workflow
  `--from-literal` ↔ `S3_*` env ↔ the `config.go` `envconfig` struct tags.
- `ruby -ryaml YAML.load_file` on all three files → all parse OK.

User-owned to go live: provision MinIO (bucket + ingress), set the `S3_*` GitHub Secrets
(`S3_BUCKET`, `S3_ENDPOINT`, `S3_PUBLIC_BASE_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`), redeploy.

## Design conformance (MinIO → S3)

- `Put`/`PublicURL` behind an `Uploader` interface; only `S3_*` env changes
  between MinIO and S3 (`S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`).
- `PublicURL` composes `S3_PUBLIC_BASE_URL` + `/` + key; the key is the stable
  reference, so moving storage needs no DB migration.
- No bucket/host string is baked into stored values.
