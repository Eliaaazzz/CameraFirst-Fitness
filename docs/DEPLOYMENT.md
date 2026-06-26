# Live Deployment

Both services run on **GCP Cloud Run** (region `australia-southeast2`) in an isolated
project, fully separate from the production `aurafitness` service.

| Service | What | URL |
|---|---|---|
| `aura-gateway` (Go) | WebSocket realtime edge: JWT-auth WS termination, proxies the coach SSE stream, Redis social fan-out, `/metrics` | `https://aura-gateway-130643550483.australia-southeast2.run.app` |
| `aura-coach-backend` (Spring Boot/Java 21) | Agent brain + business + persistence | `https://aura-coach-backend-130643550483.australia-southeast2.run.app` |
| Cloud SQL (Postgres 16 + pgvector) | business + vector + social + knowledge tables | reached via the **Cloud SQL Java connector** (IAM-auth, no public IP) |

```
client ──WSS──▶ aura-gateway (Go, Cloud Run)
                     │  proxies SSE
                     ▼
              aura-coach-backend (Spring Boot, Cloud Run)
                     │  Cloud SQL connector (IAM, no public IP)
                     ▼
              Cloud SQL Postgres 16 + pgvector
```

## Engineering notes (things a real deploy surfaced)

- **Boot bug only a real deploy caught:** `@EnableJpaRepositories` used a hand-maintained
  package allowlist that silently dropped the new `social`/`coach` repository packages, so the
  context failed to start. Unit tests + static review missed it (nothing booted the full
  context). Fixed by scanning the base package.
- **Secure DB path:** Cloud Run → Cloud SQL over the `postgres-socket-factory` connector
  (IAM-authenticated, encrypted) instead of exposing the database to the internet.
- **Model drift:** `text-embedding-004` was retired from the AI-Studio v1beta API; the knowledge
  embedder uses `gemini-embedding-001` at `outputDimensionality=768` to match the `vector(768)`
  schema. Model is configurable (`app.gemini.embedding-model`).

## Grounded nutrition-knowledge RAG (anti-hallucination)

The Coach agent grounds health/nutrition **facts** in a curated, citable corpus instead of
free-form LLM memory — the high-stakes hallucination surface in a health app. On boot the backend
seeds + embeds a 24-row corpus (WHO / USDA-DRI / ADA / IOM …) with `gemini-embedding-001`.

Three anti-hallucination gates:
1. **Retrieval + abstention threshold** — `search_nutrition_knowledge` embeds the question, pulls
   top-k from pgvector, and returns `abstain=true` when the best match is below
   `app.coach.knowledge.min-similarity` (out-of-scope questions get no grounded answer).
2. **Constrained prompt** — the agent must cite each grounded claim `[n]`, may never invent
   numbers/citations, and must abstain when the tool says so.
3. **Faithfulness verification pass** — after the answer, a fact-checker call scores each claim
   against the retrieved sources and emits a `groundedness` event (score + cited sources +
   unsupported claims) so hallucination risk is *visible*, not silent.

Metrics: `aura.coach.knowledge.{retrieval.score,abstentions,queries,groundedness,unsupported.claims}`.

## Eval

`infrastructure/eval/coach_grounding_eval.sh` runs factual questions (must ground + cite) and
out-of-scope questions (must abstain) and reports `grounded_rate`, `abstain_rate`, and average
groundedness:

```bash
BACKEND_URL=https://aura-coach-backend-130643550483.australia-southeast2.run.app \
  API_KEY=<app.api-key> bash infrastructure/eval/coach_grounding_eval.sh
```

> NOTE: the live demo currently runs on a **free-tier Gemini key** whose per-day request quota is
> easily exhausted (the seeding burst + prod sharing the key). A billing-enabled key removes the
> 429s; the 24-row corpus embeds and the agent loop runs end-to-end regardless.

## Redeploy

```bash
# backend (after code change)
gcloud builds submit backend --tag <AR>/aura-coach-backend:latest --project <proj> --region australia-southeast2
gcloud run deploy aura-coach-backend --image <AR>/aura-coach-backend:latest --project <proj> \
  --region australia-southeast2 --add-cloudsql-instances <proj>:australia-southeast2:aura-coach-db \
  --env-vars-file backend_env.yaml
```
