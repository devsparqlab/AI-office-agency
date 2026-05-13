# office-intake Skill Guide

## Purpose

Turn rough user requests into a PM-ready task preview before files are created.

## Inputs

- User request
- Optional affected service, error log, or desired task id
- Existing `runs/` task ids for next-id selection

## Output

- Proposed task id and short name
- Task type and priority guess
- Known scope and unknowns
- One concise clarification question when required
- Recommended next command, usually `./ai-dev-office/run-agent.sh TASK-NNN pm`

## Parallel Intake Guidance

- Recommend parallel PM planning only when work is clearly split by service, layer, or non-overlapping files.
- If shared files are likely involved (`go.mod`, `go.sum`, `.proto`, generated proto files, or `shared-lib/**`), recommend sequential planning unless one agent can own that shared-file work first.
- If the request is ambiguous, keep the recommendation sequential and ask for the missing scope.

## Command

```bash
./ai-dev-office/run-agent.sh intake "Fix wallet callback failure"
```

The command is non-mutating. It previews the task metadata and does not create `runs/<TASK-ID>`.
