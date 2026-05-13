# office-verify Skill Guide

## Purpose

Recommend verification commands from task scope and changed artifacts.

## Inputs

- `runs/<TASK-ID>/task.md`
- `runs/<TASK-ID>/status.yaml`
- Latest dev/debugger/devops output
- Changed file paths

## Output

- Minimal targeted verification commands
- Broader regression commands when risk is high
- Required contract checks for `.proto`, gateway, generated code, Docker, CI, or shared-lib changes
- Skip reason when a command cannot run locally

## Command

```bash
./ai-dev-office/run-agent.sh verify TASK-NNN
```

The command recommends evidence commands only. It does not run build or test commands for the user.
