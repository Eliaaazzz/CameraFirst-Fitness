# Aura Fitness — Refined Architecture (AI Agent · Social · Realtime · Performance)

This document describes the platform after the "Aura Coach" refinement, which evolved a
single-player nutrition app with one-shot AI calls into a **streaming, tool-calling AI agent** with a
**social graph**, a **Go realtime edge**, and a **measured, observable backend**.

## Topology

```
React Native / Expo (iOS + web)
        │  WebSocket (one realtime protocol)
        ▼
┌──────────────────────────────┐     Java → Go: SSE token stream relayed to clients
│  Go gateway  (gateway/)       │◀───────────────────────────────────────────────┐
│  • terminates client WS        │                                                 │
│  • JWT (HS256, shared secret)  │     Redis Pub/Sub  "social.events" (fan-out)    │
│  • proxies coach SSE → WS      │◀──────────────┐                                 │
│  • /metrics (goroutines, conns)│               │                                 │
└──────────────────────────────┘               │                                 │
                                                │                                 │
┌────────────────────────────────────────────────────────────────────────────────────┐
│  Spring Boot 3.3.5 / Java 21 — agent brain + business                                 │
│                                                                                       │
│  CoachAgentService ── plan→act→observe loop (Gemini function calling)                  │
│     tools: lookup_food_nutrition · query_user_meal_history · get_user_goals ·          │
│            suggest_recipe_swaps · recommend_recipes (RAG) · find_friends_eating_similar │
│  GeminiClient ── hedging · Resilience4j CB · Micrometer token/cost/latency · SSE        │
│  SocialService ── follow graph · fan-out-on-write feed · notifications (privacy-aware)   │
│  HybridRecommenderService ── pgvector content ⊕ collaborative filtering via RRF          │
└────────────────────────────────────────────────────────────────────────────────────┘
        │                         │                         │
  Postgres 16 + pgvector     Redis (L2 cache +         Gemini / OpenAI-embeddings
  (Flyway, HNSW)             session + pub/sub)        (or the deterministic lab mock)
```

**Service boundary rationale:** Go owns the connection edge (cheap massive-concurrency long-lived
WebSockets + fan-out); Java owns the heavy AI orchestration, pgvector retrieval, and business/data
logic. Java streams agent tokens over SSE; the Go gateway relays them to clients over a single WS
protocol and also fans out social events from Redis Pub/Sub.

## The AI Coach agent (the hero)

- **Multi-turn, tool-calling, streaming.** `CoachAgentService` runs a bounded plan→act→observe loop:
  the model emits `functionCall`s, the `AgentToolRegistry` executes them (scoped to the authenticated
  user — never a model-supplied id), results are fed back, and the final answer is streamed token-by-
  token over SSE (`POST /api/v1/coach/chat`).
- **Tools wrap real services** (no fake "AI"): nutrition lookup, the user's meal history, active goals,
  recipe swaps, the hybrid recommender (true retrieve-then-ground RAG — the agent cites returned
  recipes), and a social "friends eating similar" tool.
- **Memory:** `chat_session` / `chat_message` (Flyway V52/V53); bounded short-term history.
- **Hardened transport:** one `GeminiClient` for every call site — request **hedging** ("Tail at
  Scale": first-success-wins race, 429 short-circuits), **Resilience4j** circuit breaker (429s are
  ignored — backpressure ≠ fault), and **Micrometer** meters (`aura.gemini.{tokens,cost,hedge,latency}`,
  `aura.agent.{turns,tool.*,ttft}`).

## Social & communication

- **Graph:** `follows` (unique edge, no self-follow), `activity_feed_items` (keyset-paginated feed),
  `notifications`, plus a `user_profile.share_activity` privacy flag (Flyway V54–V57).
- **Fan-out-on-write:** logging a meal emits a domain event; an `@TransactionalEventListener(AFTER_COMMIT)`
  fans the activity into followers' feeds and publishes a Redis event for the gateway — so a feed
  failure can never roll back the meal.
- **REST:** `/api/v1/social/**` (follow/unfollow, followers/following, cursor-paginated feed,
  notifications), all scoped to the authenticated principal.

## Social recommendation

`HybridRecommenderService` fuses two ranked signals with **Reciprocal Rank Fusion**: pgvector content
similarity (ANN over recipe embeddings) and a collaborative signal (recipes saved by people you
follow). Degrades gracefully if either signal is missing. `find_friends_eating_similar` ranks followees
by cosine similarity of their recent macro profiles (privacy-aware).

## Performance & observability

- **Metrics:** `/actuator/prometheus` with custom agent/Gemini/social meters; Prometheus + Grafana
  provisioned as code (`infrastructure/grafana`).
- **Load lab:** `infrastructure/docker-compose.loadtest.yml` brings up Postgres+pgvector, Redis, the
  backend, the **Go gateway**, a **wire-compatible Gemini mock** with programmable latency + injectable
  5% tail, Prometheus, Grafana, and k6 — so every headline number is reproducible from committed
  scripts. Experiments: hedge on/off P99, Redis cache on/off, ANN-in-DB vs JVM-cosine, Go WS ceiling.
  See `docs/PERFORMANCE.md`.

## Engineering hygiene

- **Security:** constant-time API-key compare (no key logging), JWT fail-fast in prod, IDOR fixed
  (recommendation userId derived from the principal), dead/fake AI code removed.
- **Testing/CI:** unit tests for the agent loop, tool registry, and RRF; a JaCoCo coverage gate; CI
  runs the **full Testcontainers suite** (real Postgres) + the gate before deploy, with Gradle caching.

## Local build note

System Java is 11; build with the Java-21 toolchain launcher:
`JAVA_HOME=<adoptium-21> ./gradlew build` (the `foojay-resolver` plugin provisions the compile toolchain).
