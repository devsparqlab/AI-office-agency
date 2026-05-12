#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUNS_DIR="$ROOT_DIR/runs"
RUN_AGENT="$ROOT_DIR/run-agent.sh"

SUFFIX="$(date +%s)$$"
FALLBACK_TASK="TASK-${SUFFIX}F"
CURSOR_TASK="TASK-${SUFFIX}C"
TEST_BIN_DIR="$(mktemp -d)"
CALL_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$RUNS_DIR/$FALLBACK_TASK" "$RUNS_DIR/$CURSOR_TASK" "$TEST_BIN_DIR" "$CALL_DIR"
}
trap cleanup EXIT

assert_eq() {
  local expected="$1"
  local actual="$2"
  local message="$3"
  if [[ "$expected" != "$actual" ]]; then
    echo "[FAIL] $message: expected '$expected' got '$actual'"
    exit 1
  fi
}

assert_contains() {
  local file="$1"
  local pattern="$2"
  local message="$3"
  if ! grep -Fq "$pattern" "$file"; then
    echo "[FAIL] $message: missing '$pattern' in $file"
    exit 1
  fi
}

yaml_value() {
  local file="$1"
  local key="$2"
  ruby - "$file" "$key" <<'RUBY'
require "yaml"
require "date"
path, key = ARGV
data = YAML.safe_load(File.read(path), permitted_classes: [Date, Time], aliases: true) || {}
value = key.split(".").reduce(data) { |memo, part| memo.is_a?(Hash) ? memo[part] : nil }
puts value.to_s
RUBY
}

write_ready_task() {
  local task_id="$1"
  mkdir -p "$RUNS_DIR/$task_id"
  cat > "$RUNS_DIR/$task_id/status.yaml" <<YAML
task_id: $task_id
phase: assigned
state: assigned
iteration: 0
current_agent: dev
assignment:
  primary: dev
  parallel: false
ready: true
created_at: "2026-05-13"
updated_at: "2026-05-13"
history: []
YAML
  cat > "$RUNS_DIR/$task_id/pm-output.yaml" <<'YAML'
task:
  id: "TASK-FB"
  title: "Runner fallback"
  short_name: "runner-fallback"
  type: feature
  priority: high
scope: {}
description: "test"
acceptance_criteria: []
plan: {}
assignment:
  primary: dev
  parallel: false
  reason: "test"
summary: "test"
artifacts: []
next_action:
  agent: dev
  reason: "test"
blockers: []
YAML
  cat > "$RUNS_DIR/$task_id/dev-output.yaml" <<'YAML'
summary: "fallback handoff"
artifacts:
  - path: "foo"
    action: modified
next_action:
  agent: reviewer
  reason: "ready for review"
blockers: []
YAML
}

cat > "$TEST_BIN_DIR/codex" <<'SH'
#!/usr/bin/env bash
count_file="$RUNNER_FALLBACK_CALL_DIR/codex.count"
count=0
if [[ -f "$count_file" ]]; then
  count="$(cat "$count_file")"
fi
count=$((count + 1))
echo "$count" > "$count_file"
echo "insufficient_quota: Codex quota exhausted" >&2
exit 42
SH
chmod +x "$TEST_BIN_DIR/codex"

cat > "$TEST_BIN_DIR/cursor" <<'SH'
#!/usr/bin/env bash
echo "$*" >> "$RUNNER_FALLBACK_CALL_DIR/cursor.args"
if [[ "${RUNNER_FALLBACK_CURSOR_FAIL:-false}" == "true" ]]; then
  echo "rate limit: Cursor Agent quota exhausted" >&2
  exit 43
fi
exit 0
SH
chmod +x "$TEST_BIN_DIR/cursor"

echo "== Scenario 1: Codex quota switches to Cursor Agent =="
write_ready_task "$FALLBACK_TASK"
RUNNER_FALLBACK_CALL_DIR="$CALL_DIR" PATH="$TEST_BIN_DIR:$PATH" "$RUN_AGENT" "$FALLBACK_TASK" dev codex >/tmp/runner-fallback.log 2>&1

assert_eq "3" "$(cat "$CALL_DIR/codex.count")" "codex should run initial attempt plus two retries"
assert_contains "$CALL_DIR/cursor.args" "agent -p" "cursor-agent fallback should invoke cursor agent"
assert_contains "$RUNS_DIR/$FALLBACK_TASK/meta.yaml" "event: runner_switch" "runner switch should be audited"
assert_contains "$RUNS_DIR/$FALLBACK_TASK/meta.yaml" "from=codex to=cursor-agent" "switch audit should record from/to"
assert_eq "in_review" "$(yaml_value "$RUNS_DIR/$FALLBACK_TASK/status.yaml" "phase")" "successful fallback should still sync status"

echo "== Scenario 2: Cursor Agent quota switches to Cursor prompt =="
write_ready_task "$CURSOR_TASK"
rm -f "$CALL_DIR/codex.count" "$CALL_DIR/cursor.args"
RUNNER_FALLBACK_CALL_DIR="$CALL_DIR" RUNNER_FALLBACK_CURSOR_FAIL=true PATH="$TEST_BIN_DIR:$PATH" "$RUN_AGENT" "$CURSOR_TASK" dev codex >/tmp/runner-cursor-prompt.log 2>&1

assert_eq "3" "$(cat "$CALL_DIR/codex.count")" "codex should run initial attempt plus two retries before cursor-agent"
assert_contains "$CALL_DIR/cursor.args" "agent -p" "cursor-agent should be tried before interactive cursor"
assert_contains "$RUNS_DIR/$CURSOR_TASK/meta.yaml" "from=cursor-agent to=cursor" "interactive switch should be audited"
if [[ ! -f "$RUNS_DIR/$CURSOR_TASK/.cursor-prompt.md" ]]; then
  echo "[FAIL] cursor fallback should generate .cursor-prompt.md"
  exit 1
fi

echo "[PASS] runner fallback integration scenarios passed"
