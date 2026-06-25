#!/usr/bin/env bash
# Go WebSocket ceiling driver: ramps k6 to PEAK idle connections while sampling
# the gateway's ws_connections_active / go_goroutines / process_resident_memory_bytes,
# then reports per-connection cost and a 256Mi extrapolation. Honest framing: the
# lab gateway has no memory cap, so we measure cost/connection and extrapolate.
set -uo pipefail
export MSYS_NO_PATHCONV=1
cd "$(dirname "$0")"
COMPOSE="docker compose -f docker-compose.loadtest.yml"
RESULTS=loadtest/results
mkdir -p "$RESULTS"
PEAK="${PEAK_VUS:-3000}"

g() { # scrape one gateway metric value by exact name prefix
  curl -s http://localhost:8090/metrics | awk -v m="$1" '$1==m {print $2; exit}'
}

echo "=== baseline (idle gateway) ==="
BASE_RSS=$(g process_resident_memory_bytes); BASE_GO=$(g go_goroutines)
echo "baseline: rss=${BASE_RSS}B goroutines=${BASE_GO} active=$(g ws_connections_active)"

echo "=== launching k6 ws ramp to PEAK=${PEAK} (background) ==="
PEAK_VUS="$PEAK" $COMPOSE --profile load run --rm \
  -e GATEWAY_URL=ws://gateway:8090/ws -e PEAK_VUS="$PEAK" k6 \
  run /scripts/ws_ceiling.js > "$RESULTS/ws_ceiling.txt" 2>&1 &
K6PID=$!

# Sample the gateway for ~3.5 min, tracking the peak ws_connections_active sample.
MAX_ACTIVE=0; PK_RSS=0; PK_GO=0
for i in $(seq 1 70); do
  A=$(g ws_connections_active); R=$(g process_resident_memory_bytes); GO=$(g go_goroutines)
  [ -z "$A" ] && A=0
  printf 'sample %2d  active=%-6s goroutines=%-6s rss=%sB\n' "$i" "$A" "$GO" "$R"
  if awk "BEGIN{exit !($A>$MAX_ACTIVE)}"; then MAX_ACTIVE=$A; PK_RSS=$R; PK_GO=$GO; fi
  kill -0 "$K6PID" 2>/dev/null || { echo "k6 finished"; break; }
  sleep 3
done
wait "$K6PID" 2>/dev/null

echo ""
echo "=================== RESULT ==================="
echo "peak ws_connections_active : $MAX_ACTIVE"
echo "goroutines at peak         : $PK_GO   (baseline $BASE_GO)"
echo "RSS at peak                : $PK_RSS B (baseline $BASE_RSS B)"
awk -v a="$MAX_ACTIVE" -v pr="$PK_RSS" -v br="$BASE_RSS" -v pg="$PK_GO" -v bg="$BASE_GO" 'BEGIN{
  if (a>0) {
    dr=pr-br; dg=pg-bg;
    printf "memory per connection      : %.1f KB\n", (dr/a)/1024;
    printf "memory per 1k connections  : %.2f MB\n", (dr/a)*1000/1024/1024;
    printf "goroutines per connection  : %.2f\n", dg/a;
    cap256=(256*1024*1024 - br)/(dr/a);
    printf "extrapolated fit in 256MiB : ~%d connections (RSS-only, single instance)\n", cap256;
  }
}'
echo "k6 summary:"; grep -E "ws_handshake_errors|ws handshake 101|checks_succeeded|vus_max|iterations" "$RESULTS/ws_ceiling.txt" | head
echo "ALL_DONE"
