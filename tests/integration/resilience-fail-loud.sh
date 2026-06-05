#!/usr/bin/env bash
# Tier-2 resilience (M5 + S1): corrupt/malformed inputs must fail LOUD and
# bounded — never silently flatten state into a stub, never crash the whole run
# with a raw backtrace after side effects have already happened.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DRIVER="$ROOT/run-agent.sh"
ENFORCE="$ROOT/scripts/enforce-output-contract.rb"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

ok()   { echo "  ok: $1"; }
fail() { echo "[FAIL] $1"; exit 1; }

# Pull the real sync function out of the driver (tests the actual heredoc).
SFN="$WORK/sync.sh"
awk '/^sync_status_from_output\(\) \{/{f=1} f{print} f && p=="RUBY" && $0=="}"{exit} {p=$0}' "$DRIVER" > "$SFN"
[[ -s "$SFN" ]] || fail "could not extract sync_status_from_output"
# shellcheck disable=SC1090
source "$SFN"

# ---- S1a: malformed agent output -> exit 3, status left untouched ----
mkdir -p "$WORK/T1"
cat > "$WORK/T1/status.yaml" <<'Y'
task_id: TASK-T1
phase: in_review
state: in_review
iteration: 1
current_agent: reviewer
Y
printf 'next_action: [unterminated\n' > "$WORK/T1/out.yaml"
rc=0; sync_status_from_output TASK-T1 reviewer "$WORK/T1/status.yaml" "$WORK/T1/out.yaml" 2026-01-01 in_review >/dev/null 2>&1 || rc=$?
[[ "$rc" -eq 3 ]] || fail "S1: malformed output should exit 3, got $rc"
grep -q "phase: in_review" "$WORK/T1/status.yaml" || fail "S1: status must be untouched on malformed output"
ok "S1 malformed output -> exit 3, status untouched (driver routes to validation_failed)"

# ---- S1b: corrupt status.yaml -> exit 4, no crash ----
mkdir -p "$WORK/T2"
printf 'phase: [unterminated\n' > "$WORK/T2/status.yaml"
cat > "$WORK/T2/out.yaml" <<'Y'
summary: ok
next_action:
  agent: done
  reason: x
Y
rc=0; sync_status_from_output TASK-T2 reviewer "$WORK/T2/status.yaml" "$WORK/T2/out.yaml" 2026-01-01 in_review >/dev/null 2>&1 || rc=$?
[[ "$rc" -eq 4 ]] || fail "S1: corrupt status should exit 4, got $rc"
ok "S1 corrupt status -> exit 4 (refuse to sync, no raw crash)"

# ---- M5: enforce must NOT flatten a corrupt status into a stub ----
export AI_OFFICE_RUNS_DIR="$WORK/runs"
mkdir -p "$WORK/runs/TASK-M5"
printf 'task_id: TASK-M5\nphase: [unterminated\n' > "$WORK/runs/TASK-M5/status.yaml"   # present but corrupt
cat > "$WORK/runs/TASK-M5/reviewer-output.yaml" <<'Y'
summary: r
artifacts: []
next_action:
  agent: done
  reason: x
blockers: []
review_verdict: totally_bogus_verdict
build_check:
  compile: pass
  tests: pass
  details: x
Y
before="$(cat "$WORK/runs/TASK-M5/status.yaml")"
rc=0; ruby "$ENFORCE" TASK-M5 reviewer >/dev/null 2>&1 || rc=$?
[[ "$rc" -ne 0 ]] || fail "M5: enforce must fail on corrupt status, got rc 0"
ls "$WORK/runs/TASK-M5/"status.yaml.corrupt.* >/dev/null 2>&1 || fail "M5: a .corrupt backup must be created"
[[ "$(cat "$WORK/runs/TASK-M5/status.yaml")" == "$before" ]] || fail "M5: corrupt status.yaml must NOT be overwritten with a stub"
ok "M5 corrupt status -> backup + die, original preserved (no stub write)"

echo "[PASS] resilience-fail-loud: S1 (sync exit 3/4) + M5 (no stub flatten)"
