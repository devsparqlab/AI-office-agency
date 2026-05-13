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

## Command

```bash
./ai-dev-office/run-agent.sh intake "Fix wallet callback failure"
```

The command is non-mutating. It previews the task metadata and does not create `runs/<TASK-ID>`.
