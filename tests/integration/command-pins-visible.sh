#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FILE="$ROOT/dashboard/client/src/views/CommandView.tsx"

if grep -Fq "st.count === 0) return null" "$FILE"; then
  echo "[FAIL] CommandView hides zone pins with zero tasks"
  exit 1
fi

grep -Fq "count: 0" "$FILE" || {
  echo "[FAIL] CommandView should render empty zone pins with count 0"
  exit 1
}

grep -Fq "hasTasks" "$FILE" || {
  echo "[FAIL] CommandView should distinguish empty and populated zone pins"
  exit 1
}

echo "[PASS] command-pins-visible"
