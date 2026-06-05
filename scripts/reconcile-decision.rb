#!/usr/bin/env ruby
# frozen_string_literal: true

# Driver-side reconcile of a human decision (decision.yaml) into the workflow
# (status.yaml).
#
# Single-writer invariant: the dashboard writes decision.yaml, the driver (this
# script, run from run-agent.sh) writes status.yaml — never the same file.
#
# Idempotent: applies only the LATEST decision, and only once, tracked via
# status.yaml `decision_applied_at` (= that decision's decided_at).
#
# Usage:  ruby scripts/reconcile-decision.rb <TASK_ID>
# Output: "applied:<decision>:<phase>" when it transitions, else "noop".
# Exit:   0 on success (applied or noop); 2 on usage error.

require "yaml"
require "date"

OFFICE_DIR = File.expand_path(File.join(__dir__, ".."))
# Overridable so tests can point at a temp dir instead of the live runs/.
RUNS_DIR = ENV.fetch("AI_OFFICE_RUNS_DIR", File.join(OFFICE_DIR, "runs"))

# Human decision -> workflow transition. Mirrors the reviewer verdict semantics
# the state machine already knows how to continue.
DECISION_MAP = {
  "approve"         => { "phase" => "done",      "current_agent" => "done",      "ready" => false },
  "request_changes" => { "phase" => "debugging", "current_agent" => "debugger",  "ready" => true  },
  "escalate"        => { "phase" => "escalated", "current_agent" => "free-roam", "ready" => true  },
  "reject"          => { "phase" => "aborted",   "current_agent" => nil,         "ready" => false }
}.freeze

def load_yaml(path)
  return nil unless File.exist?(path)

  data = YAML.safe_load(File.read(path), permitted_classes: [Date, Time], aliases: true)
  data.is_a?(Hash) ? data : nil
rescue StandardError
  nil
end

def noop!
  puts "noop"
  exit 0
end

task_id = ARGV[0]
if task_id.nil? || task_id.strip.empty?
  warn "Usage: reconcile-decision.rb <TASK_ID>"
  exit 2
end

task_dir = File.join(RUNS_DIR, task_id)
status_path = File.join(task_dir, "status.yaml")
decision_path = File.join(task_dir, "decision.yaml")

status = load_yaml(status_path)
decisions_doc = load_yaml(decision_path)
noop! unless status && decisions_doc

list = decisions_doc["decisions"]
# Newest valid decision (every action in the map is valid).
latest = list.is_a?(Array) ? list.reverse.find { |d| d.is_a?(Hash) && DECISION_MAP.key?(d["decision"]) } : nil
noop! unless latest

decided_at = latest["decided_at"].to_s
# Already applied this exact decision?
noop! if !decided_at.empty? && status["decision_applied_at"].to_s == decided_at

mapping = DECISION_MAP.fetch(latest["decision"])
prev_phase = status["phase"].to_s

status["phase"] = mapping["phase"]
status["state"] = mapping["phase"]
status["current_agent"] = mapping["current_agent"]
status["ready"] = mapping["ready"]
status["updated_at"] = Date.today.to_s
status["decision_applied_at"] = decided_at

actor = latest["actor"].to_s
actor = "unknown" if actor.empty?
history = status["history"].is_a?(Array) ? status["history"] : []
history << {
  "phase" => "#{prev_phase.empty? ? 'unknown' : prev_phase} -> #{mapping['phase']}",
  "agent" => "orchestrator",
  "reason" => "human decision: #{latest['decision']} by #{actor}"
}
status["history"] = history

# Atomic write (status.yaml is driver-owned).
tmp = "#{status_path}.tmp.#{Process.pid}"
File.write(tmp, YAML.dump(status))
File.rename(tmp, status_path)

puts "applied:#{latest['decision']}:#{mapping['phase']}"
exit 0
