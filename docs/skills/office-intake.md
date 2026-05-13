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

## Phase 2 Notes

Implement as a Codex skill first. Keep it non-mutating until the user approves the task preview.
