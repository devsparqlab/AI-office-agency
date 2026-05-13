# Office Usability Phase 1 Design

## Goal

Make AI Dev Office easier to operate day to day without changing the core orchestration model.

## Scope

Phase 1 includes three focused changes:

- Add a read-only `status` command to `run-agent.sh`.
- Align documentation with the active Codex-first v2 runtime.
- Add lightweight skill guide documents for future `office-intake`, `office-verify`, and `office-cleanup` work.

Phase 1 does not implement the full intake, verification planner, or cleanup automations as executable commands.

## User Experience

Users should be able to run:

```bash
./ai-dev-office/run-agent.sh status
./ai-dev-office/run-agent.sh status TASK-047
```

The command should show the current task phase, current agent, readiness, blocked dependencies, next suggested command, and validation state. The all-task view should sort task ids naturally enough for the existing `TASK-NNN` convention and remain concise.

## Architecture

`run-agent.sh` remains the single CLI entry point. A new read-only status path will be handled before the normal `<TASK_ID> <AGENT>` argument validation so it can be called as `status [TASK_ID]`.

The implementation will use Ruby snippets, matching existing runner style, to parse YAML safely and summarize status files. Validation will reuse `validate-yaml.rb` rather than duplicating schema checks.

## Error Handling

Unknown task ids should exit non-zero with a clear message. Missing `status.yaml` should be reported as invalid/incomplete rather than crashing. The command must not mutate task files.

## Testing

Add an integration test that creates temporary task directories, runs `run-agent.sh status`, verifies summaries and next commands, checks blocked-task output, checks single-task output, and verifies missing task handling.

## Documentation

Update README, QUICKSTART, SKILL, and parent AGENTS guidance so runner priority and active agents match the v2 runtime. Mark `planner` and `tester` as legacy instead of listing them as runnable active roles.
