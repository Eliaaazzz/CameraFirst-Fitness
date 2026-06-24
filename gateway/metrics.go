package main

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"net/http"
)

// Metrics bundles all Prometheus collectors for the gateway. They are kept on a
// dedicated registry so the exported /metrics surface is explicit and testable,
// while still including the standard Go runtime and process collectors.
type Metrics struct {
	registry *prometheus.Registry

	// ConnectionsActive tracks the number of currently-open client WebSockets.
	ConnectionsActive prometheus.Gauge
	// MessagesTotal counts frames moving in (client->gateway) and out (gateway->client).
	MessagesTotal *prometheus.CounterVec
	// FanoutTotal counts social events successfully delivered to a connection.
	FanoutTotal prometheus.Counter
	// FanoutLatency observes the time to route + enqueue a social event.
	FanoutLatency prometheus.Histogram
}

// NewMetrics builds and registers all collectors on a fresh registry.
func NewMetrics() *Metrics {
	reg := prometheus.NewRegistry()

	m := &Metrics{
		registry: reg,
		ConnectionsActive: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "ws_connections_active",
			Help: "Number of currently connected client WebSockets.",
		}),
		MessagesTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "ws_messages_total",
			Help: "Total WebSocket frames by direction (in=client->gateway, out=gateway->client).",
		}, []string{"direction"}),
		FanoutTotal: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "ws_fanout_total",
			Help: "Total social events delivered to client connections.",
		}),
		FanoutLatency: prometheus.NewHistogram(prometheus.HistogramOpts{
			Name:    "fanout_latency_seconds",
			Help:    "Latency of routing and enqueuing a social event for delivery.",
			Buckets: prometheus.DefBuckets,
		}),
	}

	reg.MustRegister(
		m.ConnectionsActive,
		m.MessagesTotal,
		m.FanoutTotal,
		m.FanoutLatency,
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
	)

	// Pre-initialise label values so both series exist at scrape time.
	m.MessagesTotal.WithLabelValues("in")
	m.MessagesTotal.WithLabelValues("out")

	return m
}

// Handler exposes the registry over HTTP for Prometheus scraping.
func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{})
}
