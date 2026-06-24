// Command auramock is a wire-compatible mock for the Gemini (AI Studio)
// generateContent API and an OpenAI-style embeddings endpoint, built for the
// Aura Fitness "performance lab".
//
// The mock exists so request-hedging / resilience experiments are reproducible:
// latency is sampled from a deterministic, env-configurable distribution. Each
// incoming HTTP request samples its latency INDEPENDENTLY, which is exactly what
// makes hedging measurable: when a slow "tail" request is hit, the backend's 2s
// hedge fires a SECOND request that (independently sampled) usually lands fast.
//
// Endpoints:
//
//	POST /v1beta/models/{model}:generateContent   -> Gemini candidates JSON (after sampled latency)
//	POST /v1/embeddings                            -> OpenAI-style 1536-dim embedding (fast)
//	GET  /metrics                                  -> Prometheus exposition
//	GET  /healthz                                  -> "ok"
//
// Metrics are served via prometheus/client_golang when it is available at build
// time; if that module cannot be fetched (offline build), a hand-rolled
// text-format fallback is compiled instead. See metrics_prom.go / metrics_fallback.go
// (selected with the `noprom` build tag) -- the rest of this file talks only to
// the small `metrics` interface below so it compiles either way.
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ---------------------------------------------------------------------------
// Configuration (all env-overridable, with reproducible defaults)
// ---------------------------------------------------------------------------

type config struct {
	addr        string
	baseMS      int     // body latency floor
	jitterMS    int     // +/- jitter applied to the base latency
	tailProb    float64 // probability of injecting a long tail
	tailMinMS   int     // tail latency lower bound (inclusive)
	tailMaxMS   int     // tail latency upper bound (exclusive-ish)
	failRate    float64 // probability of returning 500/429 instead of 200
	embMinMS    int     // embeddings latency floor
	embMaxMS    int     // embeddings latency ceiling
	seed        int64   // RNG seed for reproducibility
	embDim      int     // embedding dimensionality
	tokenBudget int     // reported maxOutputTokens echo (informational only)
}

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
		log.Printf("warn: %s=%q is not an int, using default %d", key, v, def)
	}
	return def
}

func envFloat(key string, def float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
		log.Printf("warn: %s=%q is not a float, using default %g", key, v, def)
	}
	return def
}

func envStr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func loadConfig() config {
	return config{
		addr:        envStr("MOCK_ADDR", ":8089"),
		baseMS:      envInt("MOCK_BASE_MS", 600),
		jitterMS:    envInt("MOCK_JITTER_MS", 300),
		tailProb:    envFloat("MOCK_TAIL_PROB", 0.05),
		tailMinMS:   envInt("MOCK_TAIL_MIN_MS", 6000),
		tailMaxMS:   envInt("MOCK_TAIL_MAX_MS", 9000),
		failRate:    envFloat("MOCK_FAIL_RATE", 0.0),
		embMinMS:    envInt("MOCK_EMB_MIN_MS", 5),
		embMaxMS:    envInt("MOCK_EMB_MAX_MS", 20),
		seed:        int64(envInt("MOCK_SEED", 42)),
		embDim:      envInt("MOCK_EMB_DIM", 1536),
		tokenBudget: envInt("MOCK_MAX_OUTPUT_TOKENS", 4096),
	}
}

// ---------------------------------------------------------------------------
// Deterministic latency sampler. Guarded by a mutex because math/rand's global
// source is not safe for concurrent use and we want the *sequence* to be stable.
// ---------------------------------------------------------------------------

type sampler struct {
	mu  sync.Mutex
	rng *rand.Rand
	cfg config
}

func newSampler(cfg config) *sampler {
	return &sampler{rng: rand.New(rand.NewSource(cfg.seed)), cfg: cfg}
}

// generate returns the latency for a generateContent call and whether a long
// tail was injected.
func (s *sampler) generate() (d time.Duration, tail bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cfg.tailProb > 0 && s.rng.Float64() < s.cfg.tailProb {
		span := s.cfg.tailMaxMS - s.cfg.tailMinMS
		ms := s.cfg.tailMinMS
		if span > 0 {
			ms += s.rng.Intn(span)
		}
		return time.Duration(ms) * time.Millisecond, true
	}
	// base +/- jitter, clamped at >= 0
	ms := s.cfg.baseMS
	if s.cfg.jitterMS > 0 {
		ms += s.rng.Intn(2*s.cfg.jitterMS+1) - s.cfg.jitterMS
	}
	if ms < 0 {
		ms = 0
	}
	return time.Duration(ms) * time.Millisecond, false
}

// shouldFail reports whether this request should return an error response.
func (s *sampler) shouldFail() bool {
	if s.cfg.failRate <= 0 {
		return false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.rng.Float64() < s.cfg.failRate
}

// embeddingLatency returns a fast latency for embedding calls.
func (s *sampler) embeddingLatency() time.Duration {
	s.mu.Lock()
	defer s.mu.Unlock()
	span := s.cfg.embMaxMS - s.cfg.embMinMS
	ms := s.cfg.embMinMS
	if span > 0 {
		ms += s.rng.Intn(span)
	}
	return time.Duration(ms) * time.Millisecond
}

// deterministicVector returns a stable pseudo-random unit-ish vector. It uses
// its own seeded RNG so the embedding contents never depend on how many
// generateContent calls happened before it (keeps experiments reproducible).
func deterministicVector(dim int, seed int64) []float64 {
	r := rand.New(rand.NewSource(seed))
	v := make([]float64, dim)
	for i := range v {
		// range roughly [-1, 1)
		v[i] = r.Float64()*2 - 1
	}
	return v
}

// ---------------------------------------------------------------------------
// Wire payloads
// ---------------------------------------------------------------------------

// foodSchemaJSON is the inner TEXT payload the backend expects to parse out of
// candidates[0].content.parts[0].text. It matches the documented food schema.
const foodSchemaJSON = `{"scene_type":"single_dish","foods":[{"name":"Grilled chicken","confidence":0.92,"quantity":1,"unit":"serving","weight_g":150,"calories":250,"protein_g":40,"carbs_g":0,"fat_g":9,"fiber_g":0,"estimated_gi":0}]}`

// geminiResponse mirrors the structure the backend deserializes.
type geminiResponse struct {
	Candidates []candidate `json:"candidates"`
}

type candidate struct {
	Content      content `json:"content"`
	FinishReason string  `json:"finishReason"`
}

type content struct {
	Parts []part `json:"parts"`
	Role  string `json:"role"`
}

type part struct {
	Text string `json:"text"`
}

func geminiPayload() geminiResponse {
	return geminiResponse{
		Candidates: []candidate{{
			Content:      content{Parts: []part{{Text: foodSchemaJSON}}, Role: "model"},
			FinishReason: "STOP",
		}},
	}
}

type embeddingResponse struct {
	Data  []embeddingDatum `json:"data"`
	Model string           `json:"model"`
}

type embeddingDatum struct {
	Embedding []float64 `json:"embedding"`
	Index     int       `json:"index"`
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

type server struct {
	cfg     config
	smp     *sampler
	metrics metrics
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("error: encode response: %v", err)
	}
}

// handleGenerate serves any path ending in ":generateContent". The ?key= query
// is intentionally ignored (the real API takes the key there; the mock does not
// authenticate).
func (s *server) handleGenerate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	start := time.Now()

	// Drain the request body so the client's write completes cleanly. We do not
	// need to parse it -- the mock returns a canned candidates payload.
	_ = r.Body.Close

	if s.smp.shouldFail() {
		s.metrics.failureInjected()
		s.metrics.observe("generateContent", time.Since(start))
		s.metrics.requestDone("generateContent")
		// Alternate-ish between 429 (rate limit) and 500 (server) based on a
		// cheap coin so resilience tests see both.
		status := http.StatusInternalServerError
		if time.Now().UnixNano()%2 == 0 {
			status = http.StatusTooManyRequests
		}
		writeJSON(w, status, map[string]any{
			"error": map[string]any{
				"code":    status,
				"message": "auramock injected failure",
				"status":  http.StatusText(status),
			},
		})
		return
	}

	d, tail := s.smp.generate()
	if tail {
		s.metrics.tailInjected()
	}
	time.Sleep(d)

	s.metrics.observe("generateContent", time.Since(start))
	s.metrics.requestDone("generateContent")
	writeJSON(w, http.StatusOK, geminiPayload())
}

func (s *server) handleEmbeddings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	start := time.Now()
	time.Sleep(s.smp.embeddingLatency())

	resp := embeddingResponse{
		Data: []embeddingDatum{{
			Embedding: deterministicVector(s.cfg.embDim, s.cfg.seed),
			Index:     0,
		}},
		Model: "text-embedding-3-small",
	}
	s.metrics.observe("embeddings", time.Since(start))
	s.metrics.requestDone("embeddings")
	writeJSON(w, http.StatusOK, resp)
}

func (s *server) handleHealthz(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

// router dispatches manually so we can match "any path ending in
// :generateContent" without depending on Go 1.22 pattern wildcards (which would
// not match the ':' segment cleanly).
func (s *server) router() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.handleHealthz)
	mux.HandleFunc("/v1/embeddings", s.handleEmbeddings)
	mux.Handle("/metrics", s.metrics.handler())

	// Catch-all for the Gemini path family.
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		// strip a possible trailing slash before comparing
		trimmed := strings.TrimRight(path, "/")
		if strings.HasSuffix(trimmed, ":generateContent") {
			s.handleGenerate(w, r)
			return
		}
		http.NotFound(w, r)
	})
	return mux
}

func main() {
	cfg := loadConfig()
	srv := &server{
		cfg:     cfg,
		smp:     newSampler(cfg),
		metrics: newMetrics(),
	}

	log.Printf("auramock starting on %s", cfg.addr)
	log.Printf("latency: base=%dms jitter=+/-%dms tailProb=%.3f tail=[%d,%d]ms failRate=%.3f seed=%d",
		cfg.baseMS, cfg.jitterMS, cfg.tailProb, cfg.tailMinMS, cfg.tailMaxMS, cfg.failRate, cfg.seed)
	log.Printf("embeddings: dim=%d latency=[%d,%d]ms", cfg.embDim, cfg.embMinMS, cfg.embMaxMS)

	httpSrv := &http.Server{
		Addr:              cfg.addr,
		Handler:           srv.router(),
		ReadHeaderTimeout: 10 * time.Second,
		// generateContent can sleep up to tailMaxMS; give generous write timeout.
		WriteTimeout: time.Duration(cfg.tailMaxMS+5000) * time.Millisecond,
		ReadTimeout:  30 * time.Second,
	}

	if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		fmt.Fprintf(os.Stderr, "server error: %v\n", err)
		os.Exit(1)
	}
}
