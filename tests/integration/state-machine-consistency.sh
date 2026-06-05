#!/usr/bin/env bash
# S6/S9/S8 — state-machine consistency.
#  S6: a dependent waiting on a FAILED upstream (aborted/validation_failed) is
#      escalated, not wedged in `blocked` forever.
#  S9: expected_agents_for_phase covers validation_failed/blocked and surfaces
#      any unmapped phase instead of silently skipping the route-mismatch check.
#  S8: the reviewer scaffold emits the CONFIGURED reviewer_queue_phase, and the
#      schema accepts both review and in_review (so it isn't unsatisfiable).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DRIVER="$ROOT/run-agent.sh"
RUNS_DIR="$ROOT/runs"
WORK="$(mktemp -d)"; T_S8="TASK-S8$$"
trap 'rm -rf "$WORK" "$RUNS_DIR/$T_S8"' EXIT

ok()   { echo "  ok: $1"; }
fail() { echo "[FAIL] $1"; exit 1; }
yval() { ruby - "$1" "$2" <<'RUBY'
require "yaml"; require "date"
path, key = ARGV
d = YAML.safe_load(File.read(path), permitted_classes: [Date, Time], aliases: true) || {}
puts key.split(".").reduce(d) { |m, p| m.is_a?(Hash) ? m[p] : nil }.to_s
RUBY
}

# ── S6: failed upstream escalates the dependent (no forever-wedge) ─────────────
awk '/^reconcile_blocked_status\(\) \{/{f=1} f{print} f && p=="RUBY" && $0=="}"{exit} {p=$0}' "$DRIVER" > "$WORK/rbs.sh"
# shellcheck disable=SC1090
source "$WORK/rbs.sh"
R="$WORK/runs"; mkdir -p "$R/TASK-DEP" "$R/TASK-DEPN"
cat > "$R/TASK-DEP/status.yaml" <<'Y'
task_id: TASK-DEP
phase: aborted
state: aborted
Y
write_dependent() { cat > "$R/TASK-DEPN/status.yaml" <<'Y'
task_id: TASK-DEPN
phase: blocked
state: blocked
blocked_on:
  - TASK-DEP
assignment:
  primary: dev
Y
}
write_dependent
reconcile_blocked_status TASK-DEPN "$R/TASK-DEPN/status.yaml" "$R" 2026-01-01 done in_review true true true >/dev/null
[[ "$(yval "$R/TASK-DEPN/status.yaml" phase)" == "escalated" ]] || fail "S6: failed upstream should escalate the dependent"
[[ "$(yval "$R/TASK-DEPN/status.yaml" current_agent)" == "free-roam" ]] || fail "S6: escalated dependent should route to free-roam"
ok "S6: aborted upstream -> dependent escalated to free-roam (not wedged)"
# regression: a done upstream still unblocks normally
printf 'task_id: TASK-DEP\nphase: done\nstate: done\n' > "$R/TASK-DEP/status.yaml"
write_dependent
reconcile_blocked_status TASK-DEPN "$R/TASK-DEPN/status.yaml" "$R" 2026-01-01 done in_review true true true >/dev/null
[[ "$(yval "$R/TASK-DEPN/status.yaml" phase)" == "assigned" ]] || fail "S6 regression: done upstream should unblock to assigned"
ok "S6 regression: done upstream still unblocks normally"

# ── S9: expected_agents_for_phase map (validation_failed/blocked/unmapped) ─────
awk '/def expected_agents_for_phase/{f=1} f{print} f && /^end$/{exit}' "$DRIVER" > "$WORK/eap.rb"
cat >> "$WORK/eap.rb" <<'RUBY'
raise "validation_failed should map to free-roam" unless expected_agents_for_phase("validation_failed") == ["free-roam"]
raise "blocked should accept its pre-block agent" unless expected_agents_for_phase("blocked").include?("dev")
raise "unmapped phase must be nil (surfaced)" unless expected_agents_for_phase("totally_unknown_phase").nil?
puts "ok"
RUBY
[[ "$(ruby "$WORK/eap.rb")" == "ok" ]] || fail "S9: expected_agents_for_phase map is wrong"
ok "S9: validation_failed->free-roam, blocked mapped, unmapped->nil"

# ── S8: schema accepts both phases; scaffold emits the configured one ──────────
grep -A5 "from_phase:" "$ROOT/schemas/reviewer-output.schema.yaml" | grep -q "in_review" || fail "S8: schema from_phase should accept in_review"
mkdir -p "$RUNS_DIR/$T_S8"
cat > "$RUNS_DIR/$T_S8/pm-output.yaml" <<'Y'
summary: plan
title: S8 test
next_action:
  agent: dev
  reason: implement
Y
"$DRIVER" "$T_S8" scaffold reviewer >/dev/null 2>&1
fp="$(yval "$RUNS_DIR/$T_S8/reviewer-output.yaml" transition.from_phase)"
[[ "$fp" == "in_review" ]] || fail "S8: scaffold from_phase should be the configured reviewer_queue_phase (in_review), got '$fp'"
ok "S8: schema accepts review|in_review; reviewer scaffold emits configured in_review"

echo "[PASS] state-machine-consistency (S6 + S9 + S8)"
