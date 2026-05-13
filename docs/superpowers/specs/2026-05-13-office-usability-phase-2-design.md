# Office Usability Phase 2 Design

## Goal

Add three lightweight operator commands that make the office easier to use before and after agent runs.

## Scope

Phase 2 adds:

- `./run-agent.sh intake "<request>"`: preview a PM-ready task id, short name, type, priority, known scope, unknowns, and recommended next command.
- `./run-agent.sh verify <TASK-ID>`: recommend verification commands from task scope and latest artifacts.
- `./run-agent.sh cleanup`: report validation failures and obvious routing/dependency inconsistencies.

All three commands are non-mutating in phase 2. They do not create task files, run tests, repair YAML, or change status.

## Behavior

`intake` uses deterministic heuristics:

- next task id is one greater than existing numeric `TASK-NNN` runs/tasks,
- type is inferred from words such as bug, error, docker, ci, refactor, docs, or feature,
- priority is `critical` for outage/security/data-loss language, `high` for failure/blocking language, otherwise `medium`,
- service hints come from known repository service names in the request,
- missing details become concise unknowns.

`verify` reads `task.md`, `pm-output.yaml`, and latest agent outputs. It recommends targeted commands for Go, proto, Docker/CI, dependency guard, docs-only work, and always includes runtime YAML validation.

`cleanup` scans `runs/*`, reuses `validate-yaml.rb`, reports failed validation, blocked tasks whose dependencies are done or missing, and tasks whose current agent does not fit the current phase.

## Testing

Add one integration test that creates temporary task runs and checks all three commands. The test must verify missing-task handling and confirm commands stay read-only.
