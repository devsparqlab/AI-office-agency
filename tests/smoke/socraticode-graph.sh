#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${SOCRATICODE_GRAPH_ROOT:-${SOCRATICODE_LOCAL_PROJECT:-/Users/earth/Documents/GitHub}}"
TARGET_FILE="${1:-api-gateway/services/auth_service.go}"

echo "== SocratiCode graph smoke =="
echo "graph_root: $ROOT_DIR"
echo "target_file: $TARGET_FILE"
echo ""

echo "-- codebase_graph_query"
socraticode codebase_graph_query --projectPath "$ROOT_DIR" --file "$TARGET_FILE"
echo ""

echo "-- codebase_graph_stats"
socraticode codebase_graph_stats --projectPath "$ROOT_DIR"
echo ""

echo "-- codebase_graph_circular"
socraticode codebase_graph_circular --projectPath "$ROOT_DIR"
