// Command aura-gateway is the realtime edge for the Aura Fitness app. It
// terminates client WebSockets, proxies the Java backend's coach SSE stream down
// to clients, and fans out social events from Redis Pub/Sub to connected users.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC)
	cfg := LoadConfig()

	// rootCtx is cancelled on SIGINT/SIGTERM; it bounds the Redis subscriber and
	// all client/SSE work so shutdown cancels in-flight backend requests.
	rootCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	metrics := NewMetrics()
	hub := NewHub(metrics)

	// Start the Redis subscriber (best-effort; survives an unreachable Redis).
	if cfg.RedisAddr != "" {
		sub := NewSocialSubscriber(cfg.RedisAddr, hub, metrics)
		go sub.Run(rootCtx)
	} else {
		log.Println("REDIS_ADDR empty — social event fan-out disabled")
	}

	mux := http.NewServeMux()
	mux.Handle("/ws", newWSHandler(rootCtx, hub, metrics, cfg))
	mux.Handle("/metrics", metrics.Handler())
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		// No WriteTimeout: WebSocket connections are long-lived; per-frame
		// deadlines are enforced on the connection itself.
	}

	// Run the server in a goroutine so main can wait on the shutdown signal.
	serverErr := make(chan error, 1)
	go func() {
		log.Printf("aura-gateway listening on :%s (backend=%s redis=%s)", cfg.Port, cfg.BackendURL, cfg.RedisAddr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
	}()

	select {
	case err := <-serverErr:
		log.Printf("server error: %v", err)
	case <-rootCtx.Done():
		log.Println("shutdown signal received")
	}

	// Cancel root context first so the subscriber and client/SSE work wind down,
	// then drain HTTP with a bounded grace period.
	stop()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
		os.Exit(1)
	}
	log.Println("aura-gateway stopped cleanly")
}
