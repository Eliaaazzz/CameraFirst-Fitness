# aura-gateway

The realtime edge for **Aura Fitness**. A small, high-concurrency Go service that:

1. **Terminates client WebSockets** at `/ws` (JWT-authenticated).
2. **Proxies the Java backend's coach SSE stream** (`POST /api/v1/coach/chat`) down to the client over the WebSocket.
3. **Fans out social events** published by the backend to Redis Pub/Sub (`social.events`) to the right connected users.

Go is used here for cheap, massive-concurrency connection handling: each connection costs two goroutines and a small buffer.

---

## Client protocol

### Connect

```
ws://<host>:8090/ws?token=<JWT>
```

The JWT is the same HS256 token the Java backend issues (`sub` = user UUID, signed with `JWT_SECRET`). The token may instead be supplied as an `Authorization: Bearer <JWT>` header. Invalid/expired/missing tokens get `401` and no upgrade.

### Send (client → gateway)

A chat turn for the AI coach:

```json
{ "type": "chat", "sessionId": "<uuid-or-omit>", "message": "What should I eat after a run?" }
```

- `type` must be `"chat"` (anything else returns an error frame).
- `sessionId` is optional — omit or send `""` to start a new conversation; the gateway sends `null` to the backend.
- `message` is required.

### Receive (gateway → client)

Every inbound message is a single JSON envelope:

```json
{ "event": "<name>", "data": "<string>" }
```

**Coach events** (proxied from the backend SSE stream), `event` is one of:

| event         | `data`                                              |
|---------------|-----------------------------------------------------|
| `meta`        | JSON string — session metadata (e.g. session id)    |
| `tool_call`   | JSON string — a tool the agent is invoking          |
| `tool_result` | JSON string — the tool's result                     |
| `token`       | a plain-text token delta of the answer              |
| `done`        | JSON string — terminal success marker               |
| `error`       | plain-text error message (terminal)                 |

`data` is always the raw SSE `data:` payload as a string. For `token` it's plain text; for the others it's a JSON document encoded as a string — parse it client-side if you need the fields.

**Social events** arrive unsolicited as:

```json
{ "event": "social", "data": "<raw social.events JSON as a string>" }
```

The `data` string is the exact JSON the backend published, e.g. a `notification` (`NEW_FOLLOWER`) or a `feed` activity.

**Errors** from the gateway itself (bad JSON, unsupported type, coach unavailable) arrive as `{ "event": "error", "data": "<message>" }`.

### Keepalive

The server sends WebSocket **ping** frames every ~30s and expects a **pong** (the read deadline is 60s). Standard WebSocket clients answer pongs automatically. Max inbound message size is 8 KiB.

---

## Environment variables

| Var           | Default                  | Notes                                                                 |
|---------------|--------------------------|-----------------------------------------------------------------------|
| `PORT`        | `8090`                   | HTTP listen port.                                                      |
| `JWT_SECRET`  | _(required)_             | HS256 secret; must equal the backend's `app.jwt.secret`. Empty ⇒ all auth rejected (logged loudly). |
| `BACKEND_URL` | `http://localhost:8080`  | Base URL of the Java backend.                                         |
| `API_KEY`     | _(empty)_                | Sent as `X-API-Key` on coach requests (backend `ApiKeyAuthFilter`).  |
| `REDIS_ADDR`  | `localhost:6379`         | `host:port` for the `social.events` Pub/Sub. Empty ⇒ fan-out disabled. Unreachable ⇒ retried, never fatal. |

---

## HTTP endpoints

| Endpoint   | Purpose                                          |
|------------|--------------------------------------------------|
| `/ws`      | WebSocket upgrade (client realtime channel).     |
| `/metrics` | Prometheus metrics (incl. Go runtime + process). |
| `/healthz` | Liveness — `200 ok`.                              |

### Metrics

- `ws_connections_active` (gauge)
- `ws_messages_total{direction="in|out"}` (counter)
- `ws_fanout_total` (counter) — social events delivered
- `fanout_latency_seconds` (histogram) — route + enqueue latency

---

## Run locally

```bash
cd gateway
go mod tidy
go run . 
# or with explicit config:
JWT_SECRET="change-me-in-production-this-needs-to-be-at-least-256-bits-long" \
API_KEY="fitness-secret-key-123" \
BACKEND_URL="http://localhost:8080" \
REDIS_ADDR="localhost:6379" \
go run .
```

## Run via the performance lab compose

The service is wired into `infrastructure/docker-compose.loadtest.yml` as `gateway`:

```bash
cd infrastructure
docker compose -f docker-compose.loadtest.yml up -d --build gateway
```

It joins the `auralab` network alongside `backend` and `redis`, and Prometheus scrapes it via the `gateway` job (`gateway:8090/metrics`).

## Test with wscat / websocat

```bash
# Get a token from the backend (login/register), then:
wscat -c "ws://localhost:8090/ws?token=$JWT"
> {"type":"chat","message":"suggest a high-protein breakfast"}
# stream of {"event":"token","data":"..."} frames, ending with {"event":"done",...}

# websocat equivalent:
websocat "ws://localhost:8090/ws?token=$JWT"
```

To exercise social fan-out, publish to Redis directly:

```bash
redis-cli PUBLISH social.events '{"type":"notification","notificationType":"NEW_FOLLOWER","userId":"<your-uuid>","actorId":"<other-uuid>"}'
# the connected client for <your-uuid> receives {"event":"social","data":"..."}
```

---

## Design notes

- **Single writer per connection.** Each `*Client` has exactly one `writePump` goroutine; all frames (including pings) go through it, satisfying gorilla/websocket's one-concurrent-writer rule. Outbound frames flow through a bounded buffered channel; a slow consumer drops frames instead of blocking the hub.
- **No goroutine leaks.** Disconnect cancels the client's context (which aborts any in-flight coach SSE request and its backend HTTP call) and closes the send channel exactly once via `sync.Once`; both pumps exit.
- **Graceful shutdown.** SIGINT/SIGTERM cancels the root context (winding down the Redis subscriber and all SSE proxies), then drains HTTP with a 15s grace period.
- **Resilient Redis.** The subscriber reconnects with backoff and never crashes the process if Redis is down.
