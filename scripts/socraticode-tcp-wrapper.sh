#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="${SOCRATICODE_REMOTE_HOST:-socraticode@192.168.1.140}"
REMOTE_SSH_KEY="${SOCRATICODE_SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_PORT="${SOCRATICODE_REMOTE_PORT:-3000}"
REMOTE_PROJECT="${SOCRATICODE_REMOTE_PROJECT:-/app}"
LOCAL_PROJECT_ROOT="${SOCRATICODE_LOCAL_PROJECT:-/Users/earth/Documents/GitHub}"

usage() {
  cat <<'EOF'
Usage:
  socraticode context --role <role> --task-file <path> --status-file <path> --pm-output <path>
  socraticode codebase_status
  socraticode codebase_search --query <text> [--fileFilter <path>] [--languageFilter <lang>] [--includeLinked] [--limit <n>] [--minScore <n>] [--projectPath <path>]
  socraticode codebase_symbol --name <symbol> [--file <path>] [--projectPath <path>]

Environment:
  SOCRATICODE_REMOTE_HOST
  SOCRATICODE_REMOTE_PORT
  SOCRATICODE_REMOTE_PROJECT
  SOCRATICODE_SSH_KEY
EOF
}

build_request_json() {
  local method="$1"
  shift || true

  node - "$method" "$@" <<'NODE'
const [method, ...pairs] = process.argv.slice(2);
const params = {};
function parseValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?(?:\d+|\d+\.\d+)$/.test(value)) return Number(value);
  return value;
}
for (let i = 0; i < pairs.length; i += 2) {
  const key = pairs[i];
  const value = pairs[i + 1];
  if (!key) continue;
  params[key] = value === undefined ? "" : parseValue(value);
}
process.stdout.write(JSON.stringify({ method, params }));
NODE
}

remote_request() {
  local method="$1"
  shift || true
  local payload_json
  local ps_script
  local encoded

  payload_json="$(build_request_json "$method" "$@")"

  ps_script=$(cat <<PS
\$ErrorActionPreference = 'Stop'
\$payload = @'
$payload_json
'@
\$client = New-Object System.Net.Sockets.TcpClient("127.0.0.1",$REMOTE_PORT)
\$stream = \$client.GetStream()
\$writer = New-Object System.IO.StreamWriter(\$stream)
\$writer.AutoFlush = \$true
\$reader = New-Object System.IO.StreamReader(\$stream)
\$writer.WriteLine(\$payload)
\$response = \$reader.ReadLine()
if (\$null -eq \$response) { exit 1 }
Write-Output \$response
\$client.Close()
PS
)

  encoded="$(printf '%s' "$ps_script" | iconv -t UTF-16LE | base64 | tr -d '\n')"
  ssh -i "$REMOTE_SSH_KEY" -T "$REMOTE_HOST" powershell -NoProfile -EncodedCommand "$encoded"
}

remote_probe() {
  local ps_script
  local encoded
  if remote_request codebase_status >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

local_search_json() {
  local query="$1"
  local file_filter="$2"
  local language_filter="$3"
  local include_linked="$4"
  local limit="$5"

  SOCRATICODE_QUERY="$query" \
  SOCRATICODE_FILE_FILTER="$file_filter" \
  SOCRATICODE_LANGUAGE_FILTER="$language_filter" \
  SOCRATICODE_INCLUDE_LINKED="$include_linked" \
  SOCRATICODE_LIMIT="$limit" \
  SOCRATICODE_ROOT="$LOCAL_PROJECT_ROOT" \
  node <<'NODE'
const { spawnSync } = require("child_process");
const path = require("path");

function normalizeRelative(filePath) {
  return filePath.replace(/\\/g, "/");
}

function languageMatches(filePath, languageFilter) {
  if (!languageFilter) return true;
  const ext = path.extname(filePath).toLowerCase();
  const mapping = {
    go: [".go"],
    javascript: [".js", ".mjs", ".cjs", ".jsx"],
    typescript: [".ts", ".tsx"],
    json: [".json"],
    yaml: [".yaml", ".yml"],
    markdown: [".md"],
    text: [".txt"],
    shell: [".sh", ".ps1"],
    sql: [".sql"],
    html: [".html"],
    css: [".css"],
    proto: [".proto"],
  };
  const allowed = mapping[String(languageFilter).toLowerCase()];
  if (!allowed) return true;
  return allowed.includes(ext);
}

const root = process.env.SOCRATICODE_ROOT || "/Users/earth/Documents/GitHub";
const query = (process.env.SOCRATICODE_QUERY || "").trim();
const fileFilter = (process.env.SOCRATICODE_FILE_FILTER || "").trim().toLowerCase();
const languageFilter = (process.env.SOCRATICODE_LANGUAGE_FILTER || "").trim();
const includeLinked = String(process.env.SOCRATICODE_INCLUDE_LINKED || "false") === "true";
const limit = Math.max(1, Math.min(Number(process.env.SOCRATICODE_LIMIT || 20) || 20, 100));

if (!query) {
  process.stdout.write(JSON.stringify({
    type: "error",
    method: "codebase_search",
    error: "Missing query parameter",
  }));
  process.exit(0);
}

const rg = spawnSync("rg", [
  "--json",
  "--hidden",
  "--glob", "!**/node_modules/**",
  "--glob", "!**/.git/**",
  "--glob", "!**/dist/**",
  "--glob", "!**/build/**",
  "-F",
  query,
  root,
], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });

if (rg.error) {
  process.stdout.write(JSON.stringify({
    type: "error",
    method: "codebase_search",
    error: rg.error.message,
  }));
  process.exit(0);
}

const matches = [];
for (const line of (rg.stdout || "").split(/\r?\n/)) {
  if (!line.trim()) continue;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }

  if (event.type !== "match") continue;
  const file = normalizeRelative(path.relative(root, event.data.path.text));
  if (fileFilter && !file.toLowerCase().includes(fileFilter)) continue;
  if (!languageMatches(file, languageFilter)) continue;

  matches.push({
    file,
    line: event.data.line_number,
    snippet: event.data.lines.text.replace(/\r?\n$/, "").trim().slice(0, 240),
    score: 1,
  });

  if (matches.length >= limit) break;
}

process.stdout.write(JSON.stringify({
  type: "success",
  method: "codebase_search",
  message: matches.length > 0 ? `Found ${matches.length} matching lines for "${query}"` : `No matches found for "${query}"`,
  query,
  projectPath: root,
  includeLinked,
  count: matches.length,
  results: matches,
}));
NODE
}

local_symbol_json() {
  local name="$1"
  local file_filter="$2"
  local limit="$3"

  SOCRATICODE_NAME="$name" \
  SOCRATICODE_FILE_FILTER="$file_filter" \
  SOCRATICODE_LIMIT="$limit" \
  SOCRATICODE_ROOT="$LOCAL_PROJECT_ROOT" \
  node <<'NODE'
const { spawnSync } = require("child_process");
const path = require("path");

function normalizeRelative(filePath) {
  return filePath.replace(/\\/g, "/");
}

function classify(line, symbolName) {
  const escaped = symbolName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const checks = [
    { kind: "function", regex: new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${escaped}\\b`) },
    { kind: "class", regex: new RegExp(`^\\s*(?:export\\s+)?class\\s+${escaped}\\b`) },
    { kind: "type", regex: new RegExp(`^\\s*(?:export\\s+)?type\\s+${escaped}\\b`) },
    { kind: "interface", regex: new RegExp(`^\\s*(?:export\\s+)?interface\\s+${escaped}\\b`) },
    { kind: "const", regex: new RegExp(`^\\s*(?:export\\s+)?(?:const|let|var)\\s+${escaped}\\b`) },
    { kind: "method", regex: new RegExp(`^\\s*(?:public\\s+|private\\s+|protected\\s+)?(?:static\\s+)?${escaped}\\s*\\(`) },
    { kind: "method", regex: new RegExp(`^\\s*func\\s*\\([^)]*\\)\\s*${escaped}\\s*\\(`) },
    { kind: "assignment", regex: new RegExp(`^\\s*${escaped}\\s*=\\s*(?:async\\s+)?\\(`) },
  ];
  for (const check of checks) {
    if (check.regex.test(line)) return check.kind;
  }
  return "reference";
}

const root = process.env.SOCRATICODE_ROOT || "/Users/earth/Documents/GitHub";
const name = (process.env.SOCRATICODE_NAME || "").trim();
const fileFilter = (process.env.SOCRATICODE_FILE_FILTER || "").trim().toLowerCase();
const limit = Math.max(1, Math.min(Number(process.env.SOCRATICODE_LIMIT || 20) || 20, 100));

if (!name) {
  process.stdout.write(JSON.stringify({
    type: "error",
    method: "codebase_symbol",
    error: "Missing name parameter",
  }));
  process.exit(0);
}

const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rg = spawnSync("rg", [
  "--json",
  "--hidden",
  "--glob", "!**/node_modules/**",
  "--glob", "!**/.git/**",
  "--glob", "!**/dist/**",
  "--glob", "!**/build/**",
  "-n",
  "-S",
  `\\b${escaped}\\b`,
  root,
], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });

if (rg.error) {
  process.stdout.write(JSON.stringify({
    type: "error",
    method: "codebase_symbol",
    error: rg.error.message,
  }));
  process.exit(0);
}

const matches = [];
for (const line of (rg.stdout || "").split(/\r?\n/)) {
  if (!line.trim()) continue;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }

  if (event.type !== "match") continue;
  const file = normalizeRelative(path.relative(root, event.data.path.text));
  if (fileFilter && !file.toLowerCase().includes(fileFilter)) continue;

  const snippet = event.data.lines.text.replace(/\r?\n$/, "").trim().slice(0, 240);
  const kind = classify(snippet, name);
  matches.push({
    file,
    line: event.data.line_number,
    kind,
    isDefinition: kind !== "reference",
    snippet,
  });

  if (matches.length >= limit) break;
}

matches.sort((a, b) => Number(b.isDefinition) - Number(a.isDefinition) || a.file.localeCompare(b.file) || a.line - b.line);
const definition = matches.find((match) => match.isDefinition) || null;

process.stdout.write(JSON.stringify({
  type: "success",
  method: "codebase_symbol",
  message: matches.length > 0 ? `Found ${matches.length} matches for symbol "${name}"` : `No matches found for symbol "${name}"`,
  name,
  projectPath: root,
  count: matches.length,
  definition,
  matches,
}));
NODE
}

print_context() {
  local role="$1"
  local task_file="$2"
  local status_file="$3"
  local pm_output="$4"
  local task_title=""
  local freshness="unknown"
  local confidence="low"
  local status="unavailable"
  local note="Remote SocratiCode TCP server was unreachable."

  if remote_probe; then
    freshness="current"
    confidence="medium"
    status="used"
    note="Remote SocratiCode TCP server responded to codebase_status."
  fi

  if [[ -f "$task_file" ]]; then
    task_title="$(grep -m1 '^# ' "$task_file" | sed 's/^# *//' || true)"
  fi

  cat <<EOF
freshness: $freshness
confidence: $confidence
status: $status
role: ${role:-unknown}
task_title: ${task_title:-unknown}
task_file: ${task_file:-unknown}
status_file: ${status_file:-unknown}
pm_output: ${pm_output:-unknown}
queries:
  - "${role:-unknown} ${task_title:-task}"
note: "$note"
EOF
}

print_status() {
  remote_request codebase_status
}

print_search() {
  local -a params=()
  local query=""
  local file_filter=""
  local language_filter=""
  local include_linked="false"
  local limit=""
  local min_score=""
  local project_path="$REMOTE_PROJECT"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --query)
        query="${2:-}"
        shift 2
        ;;
      --fileFilter)
        file_filter="${2:-}"
        shift 2
        ;;
      --languageFilter)
        language_filter="${2:-}"
        shift 2
        ;;
      --includeLinked)
        include_linked="true"
        shift
        ;;
      --limit)
        limit="${2:-}"
        shift 2
        ;;
      --minScore)
        min_score="${2:-}"
        shift 2
        ;;
      --projectPath)
        project_path="${2:-}"
        shift 2
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        shift
        ;;
    esac
  done

  if [[ -n "$query" ]]; then
    params+=("query" "$query")
  fi
  if [[ -n "$file_filter" ]]; then
    params+=("fileFilter" "$file_filter")
  fi
  if [[ -n "$language_filter" ]]; then
    params+=("languageFilter" "$language_filter")
  fi
  if [[ -n "$include_linked" ]]; then
    params+=("includeLinked" "$include_linked")
  fi
  if [[ -n "$limit" ]]; then
    params+=("limit" "$limit")
  fi
  if [[ -n "$min_score" ]]; then
    params+=("minScore" "$min_score")
  fi
  if [[ -n "$project_path" ]]; then
    params+=("projectPath" "$project_path")
  fi

  local_search_json "$query" "$file_filter" "$language_filter" "$include_linked" "$limit"
}

print_symbol() {
  local -a params=()
  local name=""
  local file=""
  local limit=""
  local project_path="$REMOTE_PROJECT"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name)
        name="${2:-}"
        shift 2
        ;;
      --file)
        file="${2:-}"
        shift 2
        ;;
      --projectPath)
        project_path="${2:-}"
        shift 2
        ;;
      --limit)
        limit="${2:-}"
        shift 2
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        shift
        ;;
    esac
  done

  if [[ -n "$name" ]]; then
    params+=("name" "$name")
  fi
  if [[ -n "$file" ]]; then
    params+=("file" "$file")
  fi
  if [[ -n "$project_path" ]]; then
    params+=("projectPath" "$project_path")
  fi

  local_symbol_json "$name" "$file" "$limit"
}

cmd="${1:-context}"
if [[ $# -gt 0 ]]; then
  shift
fi

case "$cmd" in
  context)
    role=""
    task_file=""
    status_file=""
    pm_output=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --role)
          role="${2:-}"
          shift 2
          ;;
        --task-file)
          task_file="${2:-}"
          shift 2
          ;;
        --status-file)
          status_file="${2:-}"
          shift 2
          ;;
        --pm-output)
          pm_output="${2:-}"
          shift 2
          ;;
        --help|-h)
          usage
          exit 0
          ;;
        *)
          shift
          ;;
      esac
    done
    print_context "$role" "$task_file" "$status_file" "$pm_output"
    ;;
  codebase_status)
    print_status
    ;;
  codebase_search)
    print_search "$@"
    ;;
  codebase_symbol)
    print_symbol "$@"
    ;;
  --help|-h|help)
    usage
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    usage >&2
    exit 2
    ;;
esac
