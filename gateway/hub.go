package main

import "sync"

// Hub holds the set of connected clients indexed by user id and fans messages
// out to all of a user's active connections (a user may have several devices/tabs).
//
// All access to the map is guarded by an RWMutex. Sends never block the hub:
// SendToUser hands bytes to each client's buffered channel and drops the frame
// for any client whose buffer is full (slow consumer), so one stuck connection
// can never stall delivery to others.
type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[*Client]struct{}
	metrics *Metrics
}

// NewHub creates an empty hub wired to the metrics gauge.
func NewHub(metrics *Metrics) *Hub {
	return &Hub{
		clients: make(map[string]map[*Client]struct{}),
		metrics: metrics,
	}
}

// Register adds a client under its user id and bumps the active-connections gauge.
func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	set, ok := h.clients[c.userID]
	if !ok {
		set = make(map[*Client]struct{})
		h.clients[c.userID] = set
	}
	set[c] = struct{}{}
	h.mu.Unlock()

	h.metrics.ConnectionsActive.Inc()
}

// Unregister removes a client. It is idempotent: unregistering a client that is
// not present is a no-op and does not touch the gauge.
func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	set, ok := h.clients[c.userID]
	if !ok {
		h.mu.Unlock()
		return
	}
	if _, present := set[c]; !present {
		h.mu.Unlock()
		return
	}
	delete(set, c)
	if len(set) == 0 {
		delete(h.clients, c.userID)
	}
	h.mu.Unlock()

	h.metrics.ConnectionsActive.Dec()
}

// SendToUser delivers msg to every active connection for userID. Returns the
// number of connections the frame was enqueued to. Frames are counted as
// outbound by each client's enqueue path.
func (h *Hub) SendToUser(userID string, msg []byte) int {
	h.mu.RLock()
	set := h.clients[userID]
	// Snapshot to avoid holding the lock during sends.
	targets := make([]*Client, 0, len(set))
	for c := range set {
		targets = append(targets, c)
	}
	h.mu.RUnlock()

	delivered := 0
	for _, c := range targets {
		if c.enqueue(msg) {
			delivered++
		}
	}
	return delivered
}

// ConnectionCount returns the total number of active connections (test/debug helper).
func (h *Hub) ConnectionCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	n := 0
	for _, set := range h.clients {
		n += len(set)
	}
	return n
}
