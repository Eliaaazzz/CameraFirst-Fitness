// hedge_analyze.js
// -----------------------------------------------------------------------------
// Load test for the meal-photo analysis path:
//   POST {BACKEND_URL}/api/v1/nutrition/analyze   (multipart/form-data)
//
// This is the CORE experiment for request hedging. The gemini-mock injects a
// ~5% long tail (6-9s) on each generateContent call, sampled INDEPENDENTLY per
// request. With hedging OFF, those tails dominate the backend's P99. With
// hedging ON (a future backend env GEMINI_HEDGE_DELAY_MS=2000), the backend
// fires a second mock call 2s in; that call almost always lands fast, so P99
// collapses toward the body latency (~0.6s + backend overhead).
//
// Run (writes results to the lab Prometheus via remote-write):
//   docker compose -f docker-compose.loadtest.yml --profile load \
//     run -e BACKEND_URL=http://backend:8080 k6 \
//     run --out experimental-prometheus-rw /scripts/hedge_analyze.js
//
// The two arms are toggled on the BACKEND, not here:
//   ARM A (hedge off): GEMINI_HEDGE_DELAY_MS unset / 0
//   ARM B (hedge on) : GEMINI_HEDGE_DELAY_MS=2000
// Restart the backend between arms and re-run this identical script.
// -----------------------------------------------------------------------------

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

// Read the fixture once at init time (binary).
const IMAGE = open("/scripts/fixture.jpg", "b");

const BACKEND_URL = __ENV.BACKEND_URL || "http://backend:8080";
// /api/v1/nutrition/analyze is protected by the X-API-Key filter (no JWT/userId needed
// for stateless image analysis). Dev default matches application.yml app.api-key.
const API_KEY = __ENV.API_KEY || "fitness-secret-key-123";

// Custom metrics.
const analyzeLatency = new Trend("aura_analyze_latency_ms", true);
const analyzeFail = new Rate("aura_analyze_failed");

export const options = {
  // Open (arrival-rate) model so we measure the SERVER, not closed-loop VUs.
  scenarios: {
    steady: {
      executor: "constant-arrival-rate",
      rate: 30, // 30 requests / second
      timeUnit: "1s",
      duration: "2m",
      preAllocatedVUs: 50,
      maxVUs: 200,
      exec: "analyze",
    },
    ramp: {
      executor: "ramping-arrival-rate",
      startRate: 30,
      timeUnit: "1s",
      startTime: "2m", // begins after the steady scenario finishes
      stages: [
        { target: 60, duration: "1m" },
        { target: 60, duration: "1m" },
      ],
      preAllocatedVUs: 80,
      maxVUs: 300,
      exec: "analyze",
    },
  },
  thresholds: {
    // The whole point of the experiment: keep an eye on the tail.
    aura_analyze_latency_ms: ["p(99)<5000", "p(95)<2500", "p(50)<1500"],
    aura_analyze_failed: ["rate<0.02"],
    http_req_duration: ["p(99)<6000"],
  },
};

export function analyze() {
  const payload = {
    image: http.file(IMAGE, "fixture.jpg", "image/jpeg"),
    // provider + metadata are optional @RequestParams on the backend.
    provider: "gemini",
  };

  const res = http.post(`${BACKEND_URL}/api/v1/nutrition/analyze`, payload, {
    headers: { "X-API-Key": API_KEY },
    tags: { name: "analyze" },
    timeout: "30s",
  });

  analyzeLatency.add(res.timings.duration);
  const ok = check(res, {
    "status is 200": (r) => r.status === 200,
    "body has foods": (r) =>
      typeof r.body === "string" && r.body.indexOf("food") !== -1,
  });
  analyzeFail.add(!ok);

  // Small think-time keeps connection churn realistic without throttling rate.
  sleep(0.1);
}

export default function () {
  analyze();
}
