package main

import (
	"context"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

// wsHandler upgrades GET /ws to a WebSocket after validating the client's JWT.
// On success it registers the connection with the hub and runs the read/write
// loops; on close it unregisters and releases all resources.
type wsHandler struct {
	hub      *Hub
	metrics  *Metrics
	cfg      *Config
	upgrader websocket.Upgrader
	// baseCtx is the server lifetime context; client contexts derive from it so a
	// graceful shutdown cancels in-flight SSE proxies.
	baseCtx context.Context
}

func newWSHandler(baseCtx context.Context, hub *Hub, metrics *Metrics, cfg *Config) *wsHandler {
	return &wsHandler{
		hub:     hub,
		metrics: metrics,
		cfg:     cfg,
		baseCtx: baseCtx,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			// The gateway is an edge service fronted by clients on other origins.
			// Origin enforcement is delegated to the JWT check; allow the handshake.
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *wsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	token := extractToken(r)
	userID, err := validateToken(token, h.cfg.JWTSecret)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		// Upgrade already wrote an error response.
		log.Printf("ws upgrade failed user=%s: %v", userID, err)
		return
	}

	client := NewClient(h.baseCtx, userID, conn, h.hub, h.metrics, h.cfg)
	h.hub.Register(client)
	log.Printf("ws connected user=%s active=%d", userID, h.hub.ConnectionCount())

	// writePump runs in its own goroutine; readPump runs here and blocks until
	// the connection closes, at which point it unregisters and tears down.
	go client.writePump()
	client.readPump(token)
	log.Printf("ws disconnected user=%s active=%d", userID, h.hub.ConnectionCount())
}
