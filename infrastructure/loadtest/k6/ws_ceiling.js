// ws_ceiling.js
// -----------------------------------------------------------------------------
// Go WebSocket gateway connection-ceiling test. Ramps to N concurrent idle
// WebSocket connections and holds them so the gateway's per-connection cost
// (goroutines, RSS) can be sampled from its /metrics by the driver.
//
// Each VU mints its own HS256 JWT (sub = unique user id) — the gateway only uses
// `sub` as a hub key, it is not checked against the DB. k6 auto-responds to the
// server's ping frames with pongs, so idle connections stay alive. readPump only
// starts a backend SSE proxy when a client SENDS a chat message, so holding the
// socket idle measures pure connection capacity (no backend load).
//
//   docker compose -f docker-compose.loadtest.yml --profile load \
//     run -e GATEWAY_URL=ws://gateway:8090/ws k6 run /scripts/ws_ceiling.js
// -----------------------------------------------------------------------------

import ws from "k6/ws";
import crypto from "k6/crypto";
import encoding from "k6/encoding";
import { check } from "k6";
import { Counter } from "k6/metrics";

const GATEWAY_URL = __ENV.GATEWAY_URL || "ws://gateway:8090/ws";
const SECRET = __ENV.JWT_SECRET ||
  "change-me-in-production-this-needs-to-be-at-least-256-bits-long";
const PEAK = parseInt(__ENV.PEAK_VUS || "3000", 10);
// Hold long enough that every VU keeps its single connection open for the whole
// run (ramp + hold), so the gateway sees PEAK concurrent connections at once.
const HOLD_MS = parseInt(__ENV.HOLD_MS || "210000", 10);

const handshakeErrors = new Counter("ws_handshake_errors");

function b64url(s) {
  return encoding.b64encode(s, "rawurl");
}

function mintJWT(sub) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ sub: sub, iat: now, exp: now + 3600 }));
  const signingInput = header + "." + payload;
  const sig = crypto.hmac("sha256", SECRET, signingInput, "base64rawurl");
  return signingInput + "." + sig;
}

export const options = {
  scenarios: {
    ramp_conns: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: Math.floor(PEAK * 0.17), duration: "30s" },
        { target: Math.floor(PEAK * 0.5), duration: "45s" },
        { target: PEAK, duration: "60s" },
        { target: PEAK, duration: "60s" }, // hold at peak — driver samples here
      ],
      gracefulStop: "10s",
      exec: "holdConn",
    },
  },
  thresholds: {
    ws_handshake_errors: ["count<50"],
  },
};

export function holdConn() {
  const token = mintJWT(`loadtest-user-${__VU}`);
  const url = `${GATEWAY_URL}?token=${token}`;
  const res = ws.connect(url, {}, function (socket) {
    socket.on("open", function () {
      socket.setTimeout(function () {
        socket.close();
      }, HOLD_MS);
    });
    socket.on("error", function () {
      handshakeErrors.add(1);
    });
  });
  check(res, { "ws handshake 101": (r) => r && r.status === 101 });
}
