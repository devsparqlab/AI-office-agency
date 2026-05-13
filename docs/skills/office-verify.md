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
- For parallel auto runs, verify every dev lane output (`dev-output.yaml` and `dev-2-output.yaml`) before reviewer approval
- Skip reason when a command cannot run locally

## Command

```bash
./ai-dev-office/run-agent.sh verify TASK-NNN
```

The command recommends evidence commands only. It does not run build or test commands for the user.

## Parallel Run Checks

- Confirm each parallel lane has a log file: `runs/<TASK-ID>/dev-parallel.log` and `runs/<TASK-ID>/dev-2-parallel.log`.
- Confirm reviewer input includes both dev outputs when both lanes ran.
- Treat shared-file changes as higher risk and recommend sequential re-checks for dependency, proto, generated code, or shared-lib work.
