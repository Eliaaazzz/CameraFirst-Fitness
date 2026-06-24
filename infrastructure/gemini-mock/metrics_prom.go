//go:build !noprom

package main

import (
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// promMetrics is the default implementation, backed by prometheus/client_golang.
type promMetrics struct {
	requests *prometheus.CounterVec
	tail     prometheus.Counter
	failures prometheus.Counter
	latency  *prometheus.HistogramVec
	registry *prometheus.Registry
}

func newMetrics() metrics {
	reg := prometheus.NewRegistry()

	m := &promMetrics{
		requests: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "auramock_requests_total",
			Help: "Total requests handled by auramock, by endpoint.",
		}, []string{"endpoint"}),
		tail: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "auramock_tail_injected_total",
			Help: "Total long-tail latencies injected into generateContent.",
		}),
		failures: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "auramock_failures_injected_total",
			Help: "Total error responses (500/429) injected.",
		}),
		latency: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name: "auramock_latency_seconds",
			Help: "Observed handler latency in seconds, by endpoint.",
			// Buckets span fast embeddings (~5ms) through the 9s tail.
			Buckets: []float64{0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1, 2, 3, 5, 7, 9, 12},
		}, []string{"endpoint"}),
		registry: reg,
	}

	reg.MustRegister(m.requests, m.tail, m.failures, m.latency)
	return m
}

func (m *promMetrics) requestDone(endpoint string) { m.requests.WithLabelValues(endpoint).Inc() }
func (m *promMetrics) tailInjected()               { m.tail.Inc() }
func (m *promMetrics) failureInjected()            { m.failures.Inc() }

func (m *promMetrics) observe(endpoint string, d time.Duration) {
	m.latency.WithLabelValues(endpoint).Observe(d.Seconds())
}

func (m *promMetrics) handler() http.Handler {
	return promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{})
}
