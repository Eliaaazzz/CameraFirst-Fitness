# k6 load-test scripts

These scripts run inside the `k6` service of `infrastructure/docker-compose.loadtest.yml`
(gated behind the `load` profile). `/scripts` is the mounted `loadtest/k6` directory.

| Script | Endpoint | Executor | Purpose |
|---|---|---|---|
| `smoke.js` | `GET /actuator/health` | 1 VU, 10s | Liveness check before a real run |
| `hedge_analyze.js` | `POST /api/v1/nutrition/analyze` (multipart) | constant + ramping arrival-rate | **Hedge on/off** experiment |
| `recommend.js` | `POST /api/v1/recommendations/generate` (JSON) | ramping-vus | Cache & ANN experiments |

`fixture.jpg` is a tiny valid baseline JPEG used as the `image` multipart part.
Regenerate it with `node infrastructure/loadtest/make-fixture.js`.

## Prerequisites

Bring the lab up first (from `infrastructure/`):

```bash
docker compose -f docker-compose.loadtest.yml up -d --build
```

## Running

All runs use `docker compose run` against the `load` profile. Add
`--out experimental-prometheus-rw` to stream results into the lab Prometheus
(then view them in Grafana at <http://localhost:3000>, dashboard "Aura Fitness —
Load Test Overview").

```bash
# 1) Smoke test (do this first)
docker compose -f docker-compose.loadtest.yml --profile load \
  run -e BACKEND_URL=http://backend:8080 k6 run /scripts/smoke.js

# 2) Hedge experiment (the headline test)
docker compose -f docker-compose.loadtest.yml --profile load \
  run -e BACKEND_URL=http://backend:8080 k6 \
  run --out experimental-prometheus-rw /scripts/hedge_analyze.js

# 3) Recommendation path
docker compose -f docker-compose.loadtest.yml --profile load \
  run -e BACKEND_URL=http://backend:8080 k6 \
  run --out experimental-prometheus-rw /scripts/recommend.js
```

`BACKEND_URL` defaults to `http://backend:8080` (the in-network service name).
Override it to hit a host-published port, e.g. `-e BACKEND_URL=http://host.docker.internal:8080`.

## The two hedge arms (toggled on the BACKEND, not in k6)

The k6 script is identical for both arms; only the backend configuration changes.
The hedge behaviour will be controlled by a **future backend env**
`GEMINI_HEDGE_DELAY_MS`:

- **Arm A — hedge OFF:** `GEMINI_HEDGE_DELAY_MS` unset (or `0`). A single
  generateContent call per request; ~5% of requests hit the mock's 6-9s tail and
  drag P99 up.
- **Arm B — hedge ON:** `GEMINI_HEDGE_DELAY_MS=2000`. If the first call has not
  returned within 2s, the backend fires a second call. Because the mock samples
  latency independently per request, the second call almost always lands fast,
  so P99 collapses toward the ~0.6s body latency.

Workflow:

```bash
# Arm A
GEMINI_HEDGE_DELAY_MS=0 docker compose -f docker-compose.loadtest.yml up -d backend
docker compose -f docker-compose.loadtest.yml --profile load \
  run -e BACKEND_URL=http://backend:8080 k6 run --out experimental-prometheus-rw /scripts/hedge_analyze.js

# Arm B (restart backend with hedging on, re-run the SAME script)
GEMINI_HEDGE_DELAY_MS=2000 docker compose -f docker-compose.loadtest.yml up -d backend
docker compose -f docker-compose.loadtest.yml --profile load \
  run -e BACKEND_URL=http://backend:8080 k6 run --out experimental-prometheus-rw /scripts/hedge_analyze.js
```

> NOTE: Arms A/B require the pending backend wiring (`GEMINI_BASE_URL` to point
> at the mock, and `GEMINI_HEDGE_DELAY_MS` to implement hedging). Until then the
> scripts run but exercise the real Gemini endpoint / no hedging. See
> `docs/PERFORMANCE.md` and the comments in `docker-compose.loadtest.yml`.

## Tuning the mock per experiment

Set `MOCK_*` env on the `gemini-mock` service (see `docker-compose.loadtest.yml`)
and restart it:

| Env | Default | Effect |
|---|---|---|
| `MOCK_BASE_MS` | 600 | Body latency floor |
| `MOCK_JITTER_MS` | 300 | +/- jitter on body latency |
| `MOCK_TAIL_PROB` | 0.05 | Probability of a long tail |
| `MOCK_TAIL_MIN_MS` / `MOCK_TAIL_MAX_MS` | 6000 / 9000 | Tail range |
| `MOCK_FAIL_RATE` | 0 | Probability of a 500/429 (resilience tests) |
| `MOCK_SEED` | 42 | RNG seed (reproducibility) |
