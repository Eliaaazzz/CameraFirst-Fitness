#!/usr/bin/env bash
# Hedge A/B driver: runs hedge_analyze.js with hedging OFF (Arm A, delay 60s) and
# ON (Arm B, delay 2s), capturing k6 percentile summaries + the mock generateContent
# call delta (the "extra calls" cost of hedging). Results land in loadtest/results/.
set -uo pipefail
export MSYS_NO_PATHCONV=1
cd "$(dirname "$0")"
COMPOSE="docker compose -f docker-compose.loadtest.yml"
RESULTS=loadtest/results
mkdir -p "$RESULTS"
TREND="avg,min,med,p(50),p(90),p(95),p(99),max,count"

mock_count() {
  curl -s http://localhost:8089/metrics \
    | awk '/^auramock_latency_seconds_count\{endpoint="generateContent"\}/ {print $2}'
}

wait_health() {
  for i in $(seq 1 40); do
    [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/actuator/health)" = "200" ] && return 0
    sleep 5
  done
  echo "BACKEND_NOT_HEALTHY"; return 1
}

run_arm() {
  local name="$1" delay="$2"
  echo "==================== ARM $name : GEMINI_HEDGE_DELAY_MS=$delay ===================="
  GEMINI_HEDGE_DELAY_MS="$delay" $COMPOSE up -d backend >/dev/null 2>&1
  wait_health || return 1
  sleep 5
  local c0; c0=$(mock_count); echo "mock generateContent count BEFORE: $c0"
  $COMPOSE --profile load run --rm -e BACKEND_URL=http://backend:8080 k6 \
    run --summary-trend-stats="$TREND" --out experimental-prometheus-rw \
    /scripts/hedge_analyze.js > "$RESULTS/hedge_${name}.txt" 2>&1
  local c1; c1=$(mock_count); echo "mock generateContent count AFTER:  $c1"
  echo "mock calls during run: $((c1 - c0))" | tee -a "$RESULTS/hedge_${name}.txt"
  echo "--- summary (Arm $name) ---"
  grep -E "aura_analyze_latency_ms|aura_analyze_failed|http_reqs|iterations|checks_succeeded|mock calls during" "$RESULTS/hedge_${name}.txt"
}

run_arm A 60000   # hedge effectively OFF
run_arm B 2000    # hedge ON
echo "ALL_ARMS_DONE"
