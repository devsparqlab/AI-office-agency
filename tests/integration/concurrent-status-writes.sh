#!/usr/bin/env bash
# M1 regression: concurrent writers to a task's meta.yaml must not lose updates.
#
# Before the per-task flock, every writer did an unlocked read-modify-write
# (load -> mutate -> tmp+rename). Under the parallel dev/dev-2 lanes that means
# last-rename-wins silently drops the other writer's event. This test exercises
# the REAL log_meta_event function (extracted from run-agent.sh) under heavy
# contention and asserts every appended event survives.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DRIVER="$ROOT/run-agent.sh"
WRITERS="${WRITERS:-40}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
TASK_DIR="$WORK/TASK-LOCK"
mkdir -p "$TASK_DIR"
META="$TASK_DIR/meta.yaml"

# Pull the real function out of the driver so we test the actual code path
# (the ruby heredoc with the flock), not a re-implementation.
FN="$WORK/log_meta_event.sh"
# Capture from the function header to the closing brace that follows the RUBY
# heredoc terminator (a plain /^}/ stops early on a hash-close inside the heredoc).
awk '/^log_meta_event\(\) \{/{f=1} f{print} f && p=="RUBY" && $0=="}"{exit} {p=$0}' "$DRIVER" > "$FN"
if [[ ! -s "$FN" ]]; then
  echo "FAIL: could not extract log_meta_event from $DRIVER"
  exit 1
fi
# shellcheck disable=SC1090
source "$FN"

# Fire N concurrent appenders at the SAME meta.yaml.
for i in $(seq 1 "$WRITERS"); do
  log_meta_event "TASK-LOCK" "$META" "evt" "agent-$i" "detail-$i" &
done
wait

count="$(ruby -ryaml -e 'd = YAML.safe_load(File.read(ARGV[0])) || {}; puts((d["events"] || []).size)' "$META")"
uniq="$(ruby -ryaml -e 'd = YAML.safe_load(File.read(ARGV[0])) || {}; puts((d["events"] || []).map { |e| e["agent"] }.uniq.size)' "$META")"

echo "writers=$WRITERS  events_in_meta=$count  unique_agents=$uniq"
if [[ "$count" -ne "$WRITERS" || "$uniq" -ne "$WRITERS" ]]; then
  echo "FAIL: lost updates — expected $WRITERS distinct events, got $count ($uniq unique)"
  exit 1
fi

# meta.yaml must still be valid YAML (no torn/half-written doc).
ruby -ryaml -e 'YAML.safe_load(File.read(ARGV[0]))' "$META" >/dev/null

echo "PASS: all $WRITERS concurrent meta writes preserved, file intact"
