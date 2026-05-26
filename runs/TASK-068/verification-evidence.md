# TASK-068 Verification Evidence

Date: 2026-05-26
Agent: dev-2

## Runtime source of truth

TASK-067 reviewer output says the runtime implementation is approved and verified:

```bash
sed -n '1,180p' ai-dev-office/runs/TASK-067/reviewer-output.yaml
```

Relevant result:

- `review_verdict: approved`
- `GOCACHE=/private/tmp/codex-gocache GOMODCACHE=/private/tmp/codex-gomodcache go test ./...` passed for `Games-Labs-Missions`
- `GOCACHE=/private/tmp/codex-gocache GOMODCACHE=/private/tmp/codex-gomodcache GOWORK=off go build -mod=readonly ./...` exited 0

## Runtime endpoint match

Commands used:

```bash
rg -n '(/api/v1/missions/check-in/calendar|/api/v1/missions/check-in/milestones/\{day\}/claim|/api/v1/missions/streak/restore/quote|/api/v1/admin/check-in/config)' shared-lib/proto/missionspb/missions.proto shared-lib/proto/missionspb/missions.swagger.json Games-Labs-Missions/internal/routes/apiv1.go Games-Labs-Missions/internal/handlers/mission_handler.go Games-Labs-Missions/internal/handlers/adminhdl/admin_handler.go
sed -n '80,160p' shared-lib/proto/missionspb/missions.proto
sed -n '416,555p' shared-lib/proto/missionspb/missions.proto
sed -n '180,270p' Games-Labs-Missions/internal/handlers/mission_handler.go
sed -n '483,535p' Games-Labs-Missions/internal/handlers/mission_handler.go
sed -n '398,438p' Games-Labs-Missions/internal/handlers/adminhdl/admin_handler.go
sed -n '1,460p' Games-Labs-Missions/internal/services/check_in_calendar_service.go
```

Confirmed runtime endpoints and handlers:

- `POST /api/v1/missions/check-in` -> `MissionHandler.CheckIn`
- `GET /api/v1/missions/check-in/calendar` -> `MissionHandler.GetCheckInCalendar`
- `POST /api/v1/missions/check-in/milestones/{day}/claim` -> `MissionHandler.ClaimCheckInMilestone`
- `GET /api/v1/missions/streak/restore/quote` -> `MissionHandler.GetRestoreStreakQuote`
- `POST /api/v1/missions/streak/restore` -> `MissionHandler.RestoreStreak`
- `GET /api/v1/admin/check-in/config` -> `AdminHandler.HandleGetCheckInConfig`
- `PUT /api/v1/admin/check-in/config` -> `AdminHandler.HandleUpdateCheckInConfig`

Confirmed response/request fields from code and proto:

- Calendar response: `month`, `timezone`, `today`, `reset_in_seconds`, `days`, `milestones`, `restore_quote`
- Day fields: `day`, `date`, `status`, `reward`, `can_restore`, `restore_reason`
- Milestone fields: `day`, `status`, `reward`, `claimed_at`
- Milestone claim body: `user_id`, optional `idempotency_key`; `Idempotency-Key` header is also supported
- Restore quote fields: `available`, `status`, `reason`, `price`, `currency`, `restores_used`, `max_restores_per_month`, `next_restore_number`, `restored_date`
- Restore body: `user_id`, optional `idempotency_key`; `Idempotency-Key` header is also supported
- Backoffice config update body: top-level `config` with `campaign`, `daily_reward`, `milestones`, and `restore`

## Docs and Postman sync

Commands used:

```bash
rg -n "GET /api/v1/missions/check-in/calendar|POST /api/v1/missions/check-in/milestones/\{day\}/claim|GET /api/v1/missions/streak/restore/quote|PUT /api/v1/admin/check-in/config|Mobile should render|must not infer" Games-Labs-Missions/README.md
node -e "for (const p of ['api-gateway/docs/Games-Labs-APIs.postman_collection.json','docs/Games-Labs-APIs.postman_collection.json']) { JSON.parse(require('fs').readFileSync(p,'utf8')); console.log(p+': valid JSON'); }"
node -e "const fs=require('fs'); const targets=['/api/v1/missions/check-in','/api/v1/missions/check-in/calendar','/api/v1/missions/check-in/milestones/3/claim','/api/v1/missions/streak/restore/quote','/api/v1/missions/streak/restore','/api/v1/admin/check-in/config']; for (const p of ['api-gateway/docs/Games-Labs-APIs.postman_collection.json','docs/Games-Labs-APIs.postman_collection.json']) { const j=JSON.parse(fs.readFileSync(p,'utf8')); const found=[]; function walk(items){for(const it of items||[]){ if(it.item) walk(it.item); else { const raw=it.request?.url?.raw||''; for (const t of targets) if(raw.includes(t)) found.push(it.request.method+' '+raw); } }} walk(j.item); console.log('\\n'+p); for (const t of targets) console.log(t+': '+found.filter(x=>x.includes(t)).length); }"
```

Results:

- `Games-Labs-Missions/README.md` now documents Mobile calendar read, check-in, milestone claim, restore quote, restore action, and Backoffice config flows.
- Both Postman collection copies parse as valid JSON.
- Both Postman collection copies include the Mobile check-in/calendar/milestone/restore endpoints and Backoffice check-in config endpoints.
- Examples include per-day `status` and `reward`, D3/D7/D15/D31 milestone `status` and `reward`, restore `price`, restore `currency`, and request bodies.

## Consumer handoff

Mobile should render the check-in calendar from backend-owned fields only:

- Use day `status`, `reward`, `can_restore`, and `restore_reason` for each calendar cell.
- Use milestone `status` and `reward` for D3, D7, D15, and D31 milestone controls.
- Use `restore_quote.available`, `price`, `currency`, `restored_date`, and restore counters for restore UI.
- Do not infer calendar state, missed days, consecutive counts, milestone state, or restore pricing client-side.

Backoffice should update check-in campaign configuration through `PUT /api/v1/admin/check-in/config` with the runtime `config` body shape. The runtime normalizes missing defaults, but docs examples include all key fields to avoid consumer ambiguity.
