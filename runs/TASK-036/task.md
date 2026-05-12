# TASK-036: Fix Postman Collection missing request bodies

## Scope
- `docs/Games-Labs-APIs.postman_collection.json`

## Description
Several endpoints in the `docs/Games-Labs-APIs.postman_collection.json` Postman collection are missing appropriate JSON request bodies (currently sending empty `{}` or misconfigured variables), leading to backend validation errors. 

The developer needs to update the collection JSON by adding sample request body structures that conform to the target APIs. The backend is expecting the following fixes:

1. **First register**: Add sample payload
2. **Claim daily**: Include `{"mission_id": "{{mission_id}}"}`
3. **Watch ad**: Add sample payload
4. **Claim mission boost**: Add sample payload
5. **Topup bonus**: Add sample payload
6. **Streak check-in**: Include `{"user_id": "{{user_id}}"}`
7. **Restore streak**: Include `{"user_id": "{{user_id}}"}`
8. **Join tournament**: Include `{"tournament_id": "{{tournament_id}}"}`
9. **Add turnover**: Add sample payload
10. **Redeem**: Include `{"idempotency_key": "{{idempotency_key}}"}`
11. **Purchase**: Add sample payload
12. **Exchange**: Add sample payload
13. **Buy pass**: Include `{"user_id": "{{user_id}}", "pass_id": "{{pass_id}}"}`
14. **Buy avatar**: Include `{"user_id": "{{user_id}}", "avatar_id": "{{avatar_id}}"}`
15. **Claim generic reward**: `mission_id` needs to use `{{mission_id}}` variable or a real UUID, not the hardcoded string `daily_mission_001` which causes a UUID parsing error on the backend.

Review `shared-lib/proto/` definitions (especially for missions and store) to ensure the provided sample parameters accurately map to the gRPC request payloads transformed by gRPC-Gateway.

## Acceptance Criteria
- [ ] Postman collection contains appropriate JSON bodies for "First register", "Watch ad", "Claim mission boost", "Topup bonus", "Add turnover", "Purchase", "Exchange".
- [ ] Claim daily includes `mission_id`.
- [ ] Streak check-in and Restore streak include `user_id`.
- [ ] Join tournament includes `tournament_id`.
- [ ] Redeem includes `idempotency_key`.
- [ ] Buy pass includes `user_id` and `pass_id`.
- [ ] Buy avatar includes `user_id` and `avatar_id`.
- [ ] Claim generic reward replaces the hardcoded `daily_mission_001` with `{{mission_id}}`.

## Plan
### Approach
We will manually update the JSON strings representing raw Request bodies inside `docs/Games-Labs-APIs.postman_collection.json`. The syntax inside Postman requires `"raw": "{\n  \"field\": \"{{variable}}\"\n}"`.

### Subtasks
- **Subtask 1**: Update `docs/Games-Labs-APIs.postman_collection.json` with the required fields and missing payloads for all mentioned APIs.
- **Subtask 2**: Verify that the JSON file remains valid syntax.

### Risks
- **Risk**: Incorrect JSON escaping in the collection file.
  - **Mitigation**: Double-check the escaping (e.g. `\"`) inside the `"raw": "..."` blocks.

## Complexity
low