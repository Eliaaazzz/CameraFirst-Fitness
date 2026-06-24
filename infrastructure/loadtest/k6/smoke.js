// smoke.js
// -----------------------------------------------------------------------------
// Minimal liveness check: GET {BACKEND_URL}/actuator/health.
// Run this FIRST after `up` to confirm the lab is wired before a real load run.
//
// Run:
//   docker compose -f docker-compose.loadtest.yml --profile load \
//     run -e BACKEND_URL=http://backend:8080 k6 run /scripts/smoke.js
// -----------------------------------------------------------------------------

import http from "k6/http";
import { check, sleep } from "k6";

const BACKEND_URL = __ENV.BACKEND_URL || "http://backend:8080";

export const options = {
  vus: 1,
  duration: "10s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function () {
  const res = http.get(`${BACKEND_URL}/actuator/health`, {
    tags: { name: "health" },
  });
  check(res, {
    "status is 200": (r) => r.status === 200,
    "reports UP": (r) =>
      typeof r.body === "string" && r.body.indexOf("UP") !== -1,
  });
  sleep(1);
}
