#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  verify-turnover-rollout.sh --user-id <user-id> --round-id <round-id>

Optional:
  --provider-container <name>   Default: games-labs-provider-dev
  --rabbitmq-container <name>   Default: rabbitmq

This helper prints and, when local tools are available, runs the standard
turnover rollout checks for Provider/Game/Missions.
EOF
}

USER_ID=""
ROUND_ID=""
PROVIDER_CONTAINER="games-labs-provider-dev"
RABBITMQ_CONTAINER="rabbitmq"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --user-id)
      USER_ID="${2:-}"
      shift 2
      ;;
    --round-id)
      ROUND_ID="${2:-}"
      shift 2
      ;;
    --provider-container)
      PROVIDER_CONTAINER="${2:-}"
      shift 2
      ;;
    --rabbitmq-container)
      RABBITMQ_CONTAINER="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$USER_ID" || -z "$ROUND_ID" ]]; then
  usage >&2
  exit 1
fi

section() {
  printf '\n== %s ==\n' "$1"
}

run_if_available() {
  local tool="$1"
  shift
  if command -v "$tool" >/dev/null 2>&1; then
    "$@"
  else
    echo "(skip: $tool not available locally)"
  fi
}

section "Canonical runtime truth"
cat <<EOF
Provider GAME_API_URL should be: 84.247.150.206:30553
Games-Labs-Game and Games-Labs-Missions must share the same RABBITMQ_URL
Daily turnover should come from turnover.settled / turnover.reversed only
EOF

section "Provider env and logs"
echo "Command: docker exec ${PROVIDER_CONTAINER} printenv GAME_API_URL"
run_if_available docker docker exec "${PROVIDER_CONTAINER}" printenv GAME_API_URL || true
echo
echo "Command: docker logs ${PROVIDER_CONTAINER} | grep SettleRound/ReverseRound"
run_if_available docker sh -c "docker logs ${PROVIDER_CONTAINER} 2>&1 | grep -E 'GAME_API_URL configured|SettleRound|ReverseRound' | tail -80" || true

section "Game / Missions RabbitMQ alignment"
echo "Command: kubectl exec deploy/games-labs-game -- printenv RABBITMQ_URL"
run_if_available kubectl kubectl exec deploy/games-labs-game -- printenv RABBITMQ_URL || true
echo
echo "Command: kubectl exec deploy/games-labs-missions -- printenv RABBITMQ_URL"
run_if_available kubectl kubectl exec deploy/games-labs-missions -- printenv RABBITMQ_URL || true

section "RabbitMQ queue and binding sanity"
echo "Command: docker exec ${RABBITMQ_CONTAINER} rabbitmqctl list_queues name messages consumers"
run_if_available docker docker exec "${RABBITMQ_CONTAINER}" rabbitmqctl list_queues name messages consumers || true
echo
echo "Command: docker exec ${RABBITMQ_CONTAINER} rabbitmqctl list_bindings | grep player.activity"
run_if_available docker sh -c "docker exec ${RABBITMQ_CONTAINER} rabbitmqctl list_bindings | grep player.activity" || true

section "SQL checks"
cat <<EOF
Run in your SQL client:

SELECT round_id, user_id, game_id, game_type, settled_amount, settled_at, reversed_at
FROM round_lifecycles
WHERE round_id = '${ROUND_ID}'
LIMIT 1;

SELECT event_id, event_type, source_reference_id, created_at
FROM daily_activity_consumer_events
WHERE source_reference_id = '${ROUND_ID}'
ORDER BY created_at DESC;

GET /api/v1/quest/overview?user_id=${USER_ID}
EOF

section "IDG cancel reverse proof path"
cat <<EOF
1. Place fresh IDG bet for user ${USER_ID}
2. Confirm [idg:bet] game SettleRound success and round_lifecycles.settled_at
3. Cancel wager ${ROUND_ID} with refund success
4. Confirm [idg:cancel] game ReverseRound success
5. Confirm round_lifecycles.reversed_at and turnover.reversed
6. Confirm quest/overview progress decreases appropriately
EOF
