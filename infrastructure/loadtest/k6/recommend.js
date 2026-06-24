// recommend.js
// -----------------------------------------------------------------------------
// Load test for the recommendation generation path:
//   POST {BACKEND_URL}/api/v1/recommendations/generate   (application/json)
//
// Exercises the Gemini-LLM + (optionally) pgvector / OpenAI-embeddings path.
// Use this to measure the Redis cache on/off and ANN-in-DB vs JVM-cosine
// experiments (see docs/PERFORMANCE.md).
//
// Run:
//   docker compose -f docker-compose.loadtest.yml --profile load \
//     run -e BACKEND_URL=http://backend:8080 k6 \
//     run --out experimental-prometheus-rw /scripts/recommend.js
// -----------------------------------------------------------------------------

import http from "k6/http";
import { check } from "k6";
import { Trend, Rate } from "k6/metrics";

const BACKEND_URL = __ENV.BACKEND_URL || "http://backend:8080";

const recLatency = new Trend("aura_recommend_latency_ms", true);
const recFail = new Rate("aura_recommend_failed");

export const options = {
  scenarios: {
    vus_ramp: {
      executor: "ramping-vus",
      startVUs: 5,
      stages: [
        { target: 20, duration: "1m" },
        { target: 40, duration: "1m" },
        { target: 0, duration: "30s" },
      ],
      exec: "recommend",
    },
  },
  thresholds: {
    aura_recommend_latency_ms: ["p(99)<5000", "p(95)<3000"],
    aura_recommend_failed: ["rate<0.05"],
  },
};

// Representative goal body. Adjust fields to match the backend's request DTO if
// the contract tightens; unknown fields are typically ignored by Jackson.
const goalBody = JSON.stringify({
  goal: "lose_weight",
  targetCalories: 1800,
  dietaryPreferences: ["high_protein", "low_gi"],
  activityLevel: "moderate",
  constraints: { excludeIngredients: ["peanut"] },
});

export function recommend() {
  const res = http.post(
    `${BACKEND_URL}/api/v1/recommendations/generate`,
    goalBody,
    {
      headers: { "Content-Type": "application/json" },
      tags: { name: "recommend" },
      timeout: "30s",
    }
  );

  recLatency.add(res.timings.duration);
  const ok = check(res, {
    "status is 2xx/4xx (reachable)": (r) => r.status >= 200 && r.status < 500,
  });
  recFail.add(!ok);
}

export default function () {
  recommend();
}
