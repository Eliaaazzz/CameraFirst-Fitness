package main

import (
	"net/http"
	"time"
)

// metrics is the minimal surface the handlers use. Two implementations exist,
// selected at build time:
//
//   - metrics_prom.go     (default)        backed by prometheus/client_golang
//   - metrics_fallback.go (build tag noprom) hand-rolled text-format exposition
//
// If client_golang cannot be fetched (offline build), build with
// `-tags noprom` and the fallback compiles instead. The verify step in the
// scaffolding instructions does exactly this if `go mod tidy` fails.
type metrics interface {
	// requestDone increments auramock_requests_total{endpoint}.
	requestDone(endpoint string)
	// tailInjected increments auramock_tail_injected_total.
	tailInjected()
	// failureInjected increments auramock_failures_injected_total.
	failureInjected()
	// observe records a latency sample into auramock_latency_seconds.
	observe(endpoint string, seconds time.Duration)
	// handler returns the /metrics HTTP handler.
	handler() http.Handler
}
