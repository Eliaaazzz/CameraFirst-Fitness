//go:build noprom

package main

// Hand-rolled Prometheus text-format exposition, used when
// prometheus/client_golang cannot be fetched (offline build). Build with
// `-tags noprom`. It exposes the SAME metric names as the client_golang path:
//
//	auramock_requests_total{endpoint="..."}   (counter)
//	auramock_tail_injected_total              (counter)
//	auramock_failures_injected_total          (counter)
//	auramock_latency_seconds                  (histogram: _bucket/_sum/_count)

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"sync"
	"time"
)

var latencyBuckets = []float64{0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1, 2, 3, 5, 7, 9, 12}

type histo struct {
	counts []uint64 // per-bucket cumulative-able counts (raw, summed at render)
	sum    float64
	count  uint64
}

type fallbackMetrics struct {
	mu       sync.Mutex
	requests map[string]uint64
	tail     uint64
	failures uint64
	hist     map[string]*histo
}

func newMetrics() metrics {
	return &fallbackMetrics{
		requests: make(map[string]uint64),
		hist:     make(map[string]*histo),
	}
}

func (m *fallbackMetrics) requestDone(endpoint string) {
	m.mu.Lock()
	m.requests[endpoint]++
	m.mu.Unlock()
}

func (m *fallbackMetrics) tailInjected() {
	m.mu.Lock()
	m.tail++
	m.mu.Unlock()
}

func (m *fallbackMetrics) failureInjected() {
	m.mu.Lock()
	m.failures++
	m.mu.Unlock()
}

func (m *fallbackMetrics) observe(endpoint string, d time.Duration) {
	v := d.Seconds()
	m.mu.Lock()
	defer m.mu.Unlock()
	h := m.hist[endpoint]
	if h == nil {
		h = &histo{counts: make([]uint64, len(latencyBuckets))}
		m.hist[endpoint] = h
	}
	h.sum += v
	h.count++
	for i, b := range latencyBuckets {
		if v <= b {
			h.counts[i]++
		}
	}
}

func (m *fallbackMetrics) handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		m.mu.Lock()
		defer m.mu.Unlock()
		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")

		fmt.Fprintln(w, "# HELP auramock_requests_total Total requests handled by auramock, by endpoint.")
		fmt.Fprintln(w, "# TYPE auramock_requests_total counter")
		eps := make([]string, 0, len(m.requests))
		for ep := range m.requests {
			eps = append(eps, ep)
		}
		sort.Strings(eps)
		for _, ep := range eps {
			fmt.Fprintf(w, "auramock_requests_total{endpoint=%q} %d\n", ep, m.requests[ep])
		}

		fmt.Fprintln(w, "# HELP auramock_tail_injected_total Total long-tail latencies injected into generateContent.")
		fmt.Fprintln(w, "# TYPE auramock_tail_injected_total counter")
		fmt.Fprintf(w, "auramock_tail_injected_total %d\n", m.tail)

		fmt.Fprintln(w, "# HELP auramock_failures_injected_total Total error responses (500/429) injected.")
		fmt.Fprintln(w, "# TYPE auramock_failures_injected_total counter")
		fmt.Fprintf(w, "auramock_failures_injected_total %d\n", m.failures)

		fmt.Fprintln(w, "# HELP auramock_latency_seconds Observed handler latency in seconds, by endpoint.")
		fmt.Fprintln(w, "# TYPE auramock_latency_seconds histogram")
		hEps := make([]string, 0, len(m.hist))
		for ep := range m.hist {
			hEps = append(hEps, ep)
		}
		sort.Strings(hEps)
		for _, ep := range hEps {
			h := m.hist[ep]
			// counts[i] already holds the number of observations <= buckets[i],
			// so it is monotonic and usable directly as the cumulative bucket.
			for i, b := range latencyBuckets {
				le := strconv.FormatFloat(b, 'g', -1, 64)
				fmt.Fprintf(w, "auramock_latency_seconds_bucket{endpoint=%q,le=%q} %d\n", ep, le, h.counts[i])
			}
			fmt.Fprintf(w, "auramock_latency_seconds_bucket{endpoint=%q,le=\"+Inf\"} %d\n", ep, h.count)
			fmt.Fprintf(w, "auramock_latency_seconds_sum{endpoint=%q} %g\n", ep, h.sum)
			fmt.Fprintf(w, "auramock_latency_seconds_count{endpoint=%q} %d\n", ep, h.count)
		}
	})
}
