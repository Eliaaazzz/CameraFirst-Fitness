# Aura Fitness — Performance Lab

A self-contained local stack for k6 load testing with Prometheus + Grafana
observability. It is fully isolated from the dev stack
(`infrastructure/docker-compose.yml`): different container names (`-lab`
suffix), its own `auralab` network, and ephemeral data volumes.

## What's in the lab

| Service | Image | Port | Role |
|---|---|---|---|
| postgres | `pgvector/pgvector:pg16` | 5432 | DB (pgvector) |
| redis | `redis:7-alpine` | 6379 | Cache (starts cold) |
| gemini-mock | built from `./gemini-mock` | 8089 | Wire-compatible Gemini + embeddings mock with programmable latency |
| backend | built from `../backend` | 8080 | The Spring Boot app under test |
| postgres-exporter | `prometheuscommunity/postgres-exporter` | 9187 | DB metrics |
| redis-exporter | `oliver006/redis_exporter` | 9121 | Cache metrics |
| prometheus | `prom/prometheus` | 9090 | Scrape + k6 remote-write sink |
| grafana | `grafana/grafana` | 3000 | Dashboards (anonymous admin) |
| k6 | `grafana/k6` | — | Load generator (profile `load`) |

Directory layout:

```
infrastructure/
  docker-compose.loadtest.yml   # the lab (validate-only; do NOT touch the dev compose)
  gemini-mock/                  # Go mock (auramock) + Dockerfile
  prometheus/prometheus.yml     # 5s scrape, all lab targets
  grafana/
    provisioning/datasources/   # Prometheus datasource
    provisioning/dashboards/    # file provider
    dashboards/aura-overview.json
  loadtest/
    make-fixture.js             # regenerates k6/fixture.jpg
    k6/                         # smoke.js, hedge_analyze.js, recommend.js, fixture.jpg, README.md
```

## Quick start

From `infrastructure/`:

```bash
# 0) Validate the compose file (no containers started)
docker compose -f docker-compose.loadtest.yml config

# 1) Build + start everything except k6
docker compose -f docker-compose.loadtest.yml up -d --build

# 2) Confirm health
docker compose -f docker-compose.loadtest.yml ps
docker compose -f docker-compose.loadtest.yml --profile load \
  run -e BACKEND_URL=http://backend:8080 k6 run /scripts/smoke.js

# 3) Run a load test (see loadtest/k6/README.md for all scripts + the hedge arms)
docker compose -f docker-compose.loadtest.yml --profile load \
  run -e BACKEND_URL=http://backend:8080 k6 \
  run --out experimental-prometheus-rw /scripts/hedge_analyze.js
```

UIs:

- Grafana: <http://localhost:3000> (anonymous, Admin) → dashboard
  "Aura Fitness — Load Test Overview"
- Prometheus: <http://localhost:9090>
- gemini-mock metrics: <http://localhost:8089/metrics>

Tear down (removes ephemeral data):

```bash
docker compose -f docker-compose.loadtest.yml down -v
```

## Pending backend wiring (TODOs)

The lab is complete; two backend changes are needed before the headline
experiments produce meaningful numbers. **Neither is made here** (this scaffold
only adds new files and does not modify `backend/`):

1. **`GEMINI_BASE_URL` override** — `GeminiMealAnalysisService` currently
   hardcodes `https://generativelanguage.googleapis.com`. Add an
   `app.gemini.base-url` property (env `GEMINI_BASE_URL`) and prefix the AI-Studio
   URL with it so the backend points at `http://gemini-mock:8089`. The mock
   already serves the identical path `/v1beta/models/{model}:generateContent`,
   so it is a drop-in swap.
2. **`/actuator/prometheus`** — add the `micrometer-registry-prometheus` runtime
   dependency to `backend/build.gradle.kts`. The actuator exposure list already
   includes `prometheus`; the registry is the missing piece. Until then the
   Prometheus `backend` scrape target is DOWN (404) — expected.

A third, experiment-specific change enables the hedge arms:

3. **`GEMINI_HEDGE_DELAY_MS`** — implement request hedging in the backend (fire a
   second generateContent call if the first has not returned within N ms). Toggle
   the two arms with `GEMINI_HEDGE_DELAY_MS=0` vs `=2000`.

See `docs/PERFORMANCE.md` for the experiment matrix and reproduction commands.
