#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RESOLVER="$ROOT_DIR/scripts/resolve-office-config.rb"
RUN_AGENT="$ROOT_DIR/run-agent.sh"

assert_eq() {
  local actual="$1"
  local expected="$2"
  local message="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "[FAIL] $message: expected '$expected', got '$actual'"
    exit 1
  fi
}

assert_fail() {
  local cmd="$1"
  local message="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "[FAIL] $message: expected command to fail"
    exit 1
  fi
}

echo "== Scenario 1: generic profile disables dependency guard =="
assert_eq \
  "$(OFFICE_PROFILE=generic ruby "$RESOLVER" get "$ROOT_DIR" dependency_guard.enabled true)" \
  "false" \
  "generic profile should override dependency_guard.enabled"

echo "== Scenario 2: games-labs profile keeps dependency guard enabled =="
assert_eq \
  "$(OFFICE_PROFILE=games-labs ruby "$RESOLVER" get "$ROOT_DIR" dependency_guard.enabled false)" \
  "true" \
  "games-labs profile should keep dependency_guard.enabled true"

echo "== Scenario 3: missing profile fails fast =="
assert_fail \
  "OFFICE_PROFILE=missing ruby \"$RESOLVER\" get \"$ROOT_DIR\" dependency_guard.enabled true" \
  "missing profile should fail"

echo "== Scenario 4: CLI --profile flag is accepted by run-agent.sh =="
assert_eq \
  "$(OFFICE_PROFILE=generic "$RUN_AGENT" --profile generic status 2>&1 | head -1)" \
  "AI Dev Office status" \
  "run-agent.sh should accept --profile before status"

echo "== Scenario 5: env override wins over profile =="
assert_eq \
  "$(OFFICE_PROFILE=generic OFFICE_DEPENDENCY_GUARD_ENABLED=true ruby "$RESOLVER" get "$ROOT_DIR" dependency_guard.enabled false)" \
  "true" \
  "OFFICE_DEPENDENCY_GUARD_ENABLED should override profile"

echo "[PASS] profile merge integration scenarios passed"
