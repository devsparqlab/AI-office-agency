# TASK-049: Mobile Missions API Ready

## Type
feature

## Priority
high

## Parent / Epic
- Epic: Mobile Missions integration
- Source plan: `/Users/earth/.cursor/plans/mobile_missions_api_ready_eb1e9853.plan.md`

## Scope
### Target Services
- `Games-Labs-Missions`
  - Make the existing Daily Activities API mobile-ready for `GET /api/v1/quest/overview`, optional `GET /api/v1/missions/progress`, and `POST /api/v1/missions/claim-daily`.
  - Add Phase 1A seed data for staging/mobile integration.
  - Add Phase 1B admin/backoffice configuration support for dynamic Daily Activities.
- `docs`
  - Document the mobile integration flow, endpoint roles, status mapping, staging QA steps, and Phase 2 gaps.

### Explicitly Out Of Scope
- Do not wire `Games-Labs-Game` `SettleRound` in Phase 1.
- Do not add `ROUND_COUNT_*` seeded missions in Phase 1.
- Do not add Diamonds spend mission support in Phase 1; `SPEND_AMOUNT` means THB spend only.
- Do not add complete-all-daily bonus support in Phase 1.
- Do not change mobile endpoint paths in Phase 1.
- Do not make Mobile manually update mission progress or mission status.

## Description
Mobile must be able to render the Missions screen from backend data instead of mock data while using the existing API paths. Phase 1A unblocks staging/mobile integration by filtering legacy Daily Activity rows, enriching Daily tab payloads, validating daily claims server-side, adding safe seed data for turnover and THB spend missions, and documenting the integration flow. Phase 1B completes production readiness by letting admin/backoffice configure the same Daily Activity fields dynamically instead of relying on SQL seed data.

`GET /api/v1/quest/overview?user_id={id}` remains the primary mobile screen API. `GET /api/v1/missions/progress?user_id={id}` remains optional/debug and should use the same Daily Activity source data. `POST /api/v1/missions/claim-daily` is only for claiming rewards after backend event progress makes an item claimable.

## Acceptance Criteria
- [ ] `GET /api/v1/quest/overview?user_id={id}` remains the primary mobile endpoint and includes mobile-ready Daily items without changing the path.
- [ ] `GET /api/v1/missions/progress?user_id={id}` remains optional/debug and returns the same filtered Daily Activity set used by overview.
- [ ] User-facing Daily Activity reads filter rows with `active = TRUE AND condition_type IS NOT NULL`, so legacy rows such as `login`, `play_game`, and `share_fb` do not appear.
- [ ] Overview Daily tab items include `description`, `condition_type`, and condition scope metadata when present, while keeping existing fields backward compatible.
- [ ] `POST /api/v1/missions/claim-daily` loads current-day progress and rejects inactive, incomplete, already claimed, or non-claimable activities before reserving idempotency or crediting a wallet.
- [ ] Claim handler maps incomplete/already-claimed business conflicts to HTTP `409` and inactive activities to HTTP `410`.
- [ ] Phase 1A migration seeds `TURNOVER_AMOUNT` and `SPEND_AMOUNT` Daily Activities for staging/mobile integration.
- [ ] `SPEND_AMOUNT` seed/config labels and docs clearly represent THB spend, not Diamonds.
- [ ] Phase 1B admin/backoffice paths can persist and return Daily Activity condition fields: `description`, `condition_type`, `threshold`, `threshold_unit`, `game_id`, `game_type`, and `spend_currency`.
- [ ] Admin/backoffice validation enforces condition-type requirements, including scope requirements for round-count mission types even though round mission wiring remains out of scope.
- [ ] README documents mobile flow, endpoint roles, status-to-button mapping, backend-event progress ownership, staging QA checklist, and Phase 2 gaps.
- [ ] Focused tests cover repository filtering/enrichment, overview pass-through, claim guard behavior, handler status codes, seed registration where practical, and admin config persistence/validation.
- [ ] `go test ./...` passes in `Games-Labs-Missions`, or any skipped verification is documented with a valid reason.

## Affected Files
- `Games-Labs-Missions/README.md`
- `Games-Labs-Missions/internal/models/models.go`
- `Games-Labs-Missions/internal/repositories/mission_repo.go`
- `Games-Labs-Missions/internal/repositories/mission_repo_test.go`
- `Games-Labs-Missions/internal/services/mission_service.go`
- `Games-Labs-Missions/internal/services/mission_service_test.go`
- `Games-Labs-Missions/internal/services/quest_overview_service.go`
- `Games-Labs-Missions/internal/services/quest_overview_service_test.go`
- `Games-Labs-Missions/internal/handlers/mission_handler.go`
- `Games-Labs-Missions/internal/handlers/mission_handler_test.go`
- `Games-Labs-Missions/internal/routes/apiv1.go`
- `Games-Labs-Missions/migrations/018_seed_daily_activities_v1.sql`
- `Games-Labs-Missions/migrations/run.go`

## Plan
### Approach
Implement sequentially inside `Games-Labs-Missions` because Phase 1A and Phase 1B share models, repository methods, service methods, handlers, tests, migrations, and README contract language. Start with the user-facing read model so Mobile sees only real event-backed Daily Activities, then enrich overview, tighten claim validation before idempotency reservation, seed staging-ready turnover/spend activities, and finally expand admin/backoffice CRUD/config support.

### Subtasks
1. **Phase 1A docs baseline**
   - Update `Games-Labs-Missions/README.md` with the mobile integration section, endpoint roles, status-to-button mapping, backend-event progress ownership, `SPEND_AMOUNT` THB wording, staging checklist, and Phase 2 gaps.
2. **Daily Activity model and repository read model**
   - Extend `DailyActivity` with description, condition type, condition scope, and condition threshold/unit fields needed by progress, overview, and admin.
   - Update `ListDailyActivityProgress` to select those fields and filter `active = TRUE AND condition_type IS NOT NULL`.
   - Add repository tests proving legacy rows are hidden and mobile-ready rows are returned with condition metadata.
3. **Quest overview Daily tab enrichment**
   - Add condition metadata fields to `QuestOverviewItem` or nested scope types as needed.
   - Pass Daily Activity description, condition type, and scope through `buildDailyTab`.
   - Add tests that preserve existing fields and assert the new metadata is present.
4. **Daily claim guard and HTTP business status mapping**
   - Make `ClaimDailyMission` load current-day Daily Activity progress for the requested `mission_id`, apply the same claimability rules as progress, and reject inactive/incomplete/already-claimed states before `markIdempotency`.
   - Update `ClaimDaily` handler mapping for `409` and `410`.
   - Add unit tests for pre-target claim rejection, successful claimable reward, already-claimed behavior, inactive behavior, and idempotency reservation ordering.
5. **Phase 1A staging seed**
   - Add `migrations/018_seed_daily_activities_v1.sql` with one `TURNOVER_AMOUNT` row and one `SPEND_AMOUNT` THB row.
   - Ensure seed labels do not imply Diamonds spend and no `ROUND_COUNT_*` rows are seeded.
   - Ensure the migration is picked up by embedded migration loading.
6. **Phase 1B admin/backoffice dynamic config**
   - Expand admin create/update/list/detail/activate/deactivate/delete behavior as needed to match the existing README contract and persist all Daily Activity condition fields.
   - Add validation by `condition_type` and keep active/deactivate semantics safe for user-facing progress.
   - Add handler, service, and repository tests for admin config fields and validation.
7. **Final verification**
   - Run formatting as needed.
   - Run `go test ./...` in `Games-Labs-Missions`.
   - Confirm no `Games-Labs-Game` `SettleRound`, Diamonds spend, round mission seed, or complete-all-daily bonus work was added.

### Risks
- **Shared-file contention:** Phase 1A and Phase 1B touch the same model, repository, service, handler, route, and README files.
  - **Mitigation:** keep the task sequential and assign it to one `dev-2` lane.
- **Claim idempotency can mask invalid claims if reserved too early.**
  - **Mitigation:** require claimability validation before `markIdempotency` and add a focused test for this ordering.
- **README already documents richer admin endpoints than current routes expose.**
  - **Mitigation:** Phase 1B should reconcile implementation with the documented contract or explicitly update docs if a route remains intentionally deferred.
- **Mobile may confuse THB spend with Diamonds spend.**
  - **Mitigation:** enforce THB wording in seed names, admin validation/help text, and README.
- **Round-based activity types exist in templates but Game settlement is not wired.**
  - **Mitigation:** validate config shape where needed, but do not seed or wire round missions until Phase 2.

## Assignment
- Primary: `dev-2`
- Parallel: `false`
- Reason: This is a cross-cutting Missions backend contract, persistence, handler, migration, test, and documentation task with shared files across all subtasks.

## Next Action
Run `./ai-dev-office/run-agent.sh TASK-049 dev-2 codex` to implement the PM-approved breakdown.
