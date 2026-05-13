# office-cleanup Skill Guide

## Purpose

Find stale, malformed, or inconsistent runtime artifacts without changing them by default.

## Inputs

- `runs/*/status.yaml`
- `runs/*/meta.yaml`
- `runs/*/*-output.yaml`
- `validate-yaml.rb`

## Output

- Tasks with validation failures
- Tasks whose `current_agent` and phase look inconsistent
- Blocked tasks with resolved or missing dependencies
- Interactive-run outputs that may be stale

## Phase 2 Notes

Implement as a read-only report first. Add a separate `--fix` path only after the report format is trusted.
