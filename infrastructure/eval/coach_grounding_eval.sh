#!/usr/bin/env bash
# Faithfulness / anti-hallucination eval for the Coach knowledge-RAG agent.
#
# Sends factual nutrition questions (which SHOULD be grounded + cited) and out-of-scope
# questions (which SHOULD abstain) to the live coach SSE endpoint, then reports:
#   - grounded_rate : fraction of factual Qs where search_nutrition_knowledge ran and a
#                     groundedness event was emitted
#   - abstain_rate  : fraction of out-of-scope Qs where the agent abstained (no grounded answer)
#   - avg_groundedness : mean groundedness score over factual Qs
#
# Usage (needs a Gemini key with quota — the free tier's per-day cap is easily exhausted):
#   BACKEND_URL=https://aura-coach-backend-xxxxx.run.app API_KEY=... bash coach_grounding_eval.sh
set -uo pipefail
B="${BACKEND_URL:?set BACKEND_URL}"
APIKEY="${API_KEY:?set API_KEY (matches the backend app.api-key)}"
OUT="${OUT_DIR:-./eval-out}"; mkdir -p "$OUT"

# Factual questions — each has an answer in the curated corpus, so the agent must ground + cite.
FACTUAL=(
  "What is the recommended daily limit for added sugar?"
  "How much dietary fiber should an adult eat per day?"
  "What is the protein RDA for a sedentary adult?"
  "What is the daily sodium limit?"
  "What does glycemic index mean?"
)
# Out-of-scope questions — nothing relevant in the corpus, so the agent must abstain.
OUT_OF_SCOPE=(
  "How do I change a flat tire on my car?"
  "What is the capital of France?"
  "Write me a poem about the ocean."
)

register_token() {
  local email="evalrun-$$-$RANDOM@aura.test"
  curl -s -X POST "$B/api/v1/auth/register" -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"Passw0rd!eval\"}" \
    | python -c "import sys,json;print(json.load(sys.stdin).get('token',''))" 2>/dev/null
}

ask() { # $1=token $2=message $3=outfile
  curl -sN --max-time 90 -X POST "$B/api/v1/coach/chat" \
    -H "Content-Type: application/json" -H "X-API-Key: $APIKEY" -H "Authorization: Bearer $1" \
    -d "$(python -c "import json,sys;print(json.dumps({'message':sys.argv[1]}))" "$2")" > "$3" 2>&1
}

TOKEN="$(register_token)"
[ -z "$TOKEN" ] && { echo "register failed (backend reachable? quota?)"; exit 1; }

grounded=0; gsum=0; gn=0
for i in "${!FACTUAL[@]}"; do
  f="$OUT/factual_$i.sse"; ask "$TOKEN" "${FACTUAL[$i]}" "$f"
  if grep -q "search_nutrition_knowledge" "$f" && grep -q "groundedness" "$f"; then
    grounded=$((grounded+1))
    g=$(grep "^data:" "$f" | sed -n 's/^data://p' | python -c "import sys,json
for l in sys.stdin:
  try:
    d=json.loads(l)
    if isinstance(d,dict) and 'groundedness' in d: print(d['groundedness']); break
  except: pass" 2>/dev/null)
    [ -n "$g" ] && { gsum=$(python -c "print($gsum+$g)"); gn=$((gn+1)); }
  fi
  sleep 5  # spacing to respect free-tier per-minute limits
done

abstained=0
for i in "${!OUT_OF_SCOPE[@]}"; do
  f="$OUT/oos_$i.sse"; ask "$TOKEN" "${OUT_OF_SCOPE[$i]}" "$f"
  # Abstain signal: the knowledge tool returned abstain, or the agent did not emit a groundedness event.
  if grep -qiE "abstain\"?:\s*true|don't have (a )?(reliable|grounded)" "$f" || ! grep -q "groundedness" "$f"; then
    abstained=$((abstained+1))
  fi
  sleep 5
done

echo "=================== COACH GROUNDING EVAL ==================="
echo "factual questions    : ${#FACTUAL[@]}  | grounded+cited: $grounded  (grounded_rate=$(python -c "print(round($grounded/${#FACTUAL[@]},2))"))"
echo "out-of-scope questions: ${#OUT_OF_SCOPE[@]}  | abstained: $abstained  (abstain_rate=$(python -c "print(round($abstained/${#OUT_OF_SCOPE[@]},2))"))"
[ "$gn" -gt 0 ] && echo "avg groundedness (factual): $(python -c "print(round($gsum/$gn,3))")"
echo "raw SSE transcripts in $OUT/"
