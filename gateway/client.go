package main

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// writeWait is the time allowed to write a single frame to the peer.
	writeWait = 10 * time.Second
	// pongWait is how long we wait for a pong before considering the conn dead.
	pongWait = 60 * time.Second
	// pingPeriod must be less than pongWait; we ping at ~30s.
	pingPeriod = 30 * time.Second
	// maxMessageSize bounds inbound frames to protect memory.
	maxMessageSize = 8 * 1024
	// sendBuffer is the per-client outbound queue depth.
	sendBuffer = 64
)

// inboundChat is the only inbound message shape the client understands.
type inboundChat struct {
	Type      string `json:"type"`
	SessionID string `json:"sessionId"`
	Message   string `json:"message"`
}

// Client wraps a single WebSocket connection. All writes go through the single
// writePump goroutine (gorilla allows only one concurrent writer); the readPump
// goroutine owns all reads. Outbound frames are queued on the buffered `send`
// channel. Closing `done` (via close()) tears everything down exactly once.
type Client struct {
	userID string
	conn   *websocket.Conn
	send   chan []byte

	hub     *Hub
	metrics *Metrics
	cfg     *Config

	// ctx is cancelled when the client disconnects so any in-flight SSE proxy
	// aborts and the backend request is released.
	ctx    context.Context
	cancel context.CancelFunc

	// closing is closed before send, so enqueue can detect shutdown and never
	// send on a closed send channel (avoids a send-on-closed-channel panic).
	closing   chan struct{}
	closeOnce sync.Once

	// chatSem caps concurrent coach SSE proxies to one per connection, so a
	// client cannot spawn unbounded goroutines / backend requests.
	chatSem chan struct{}
}

// NewClient builds a client bound to the given connection and user id.
func NewClient(parent context.Context, userID string, conn *websocket.Conn, hub *Hub, metrics *Metrics, cfg *Config) *Client {
	ctx, cancel := context.WithCancel(parent)
	return &Client{
		userID:  userID,
		conn:    conn,
		send:    make(chan []byte, sendBuffer),
		hub:     hub,
		metrics: metrics,
		cfg:     cfg,
		ctx:     ctx,
		cancel:  cancel,
		closing: make(chan struct{}),
		chatSem: make(chan struct{}, 1),
	}
}

// enqueue attempts a non-blocking send of msg to this client. It returns false
// and drops the frame if the buffer is full (slow consumer) or the client is
// closing, so a single slow client never blocks the hub or other deliveries.
func (c *Client) enqueue(msg []byte) bool {
	// Check `closing` (closed before send) first so we never send on a closed
	// channel. The non-blocking select drops the frame when the buffer is full.
	select {
	case <-c.closing:
		return false
	default:
	}
	select {
	case <-c.closing:
		return false
	case c.send <- msg:
		c.metrics.MessagesTotal.WithLabelValues("out").Inc()
		return true
	default:
		log.Printf("dropping frame for user=%s: send buffer full", c.userID)
		return false
	}
}

// close cancels the context and closes the channels exactly once. `closing` is
// closed before `send` so enqueue (which checks `closing`) can never send on a
// closed `send` channel. writePump observes the closed `send` channel and exits.
func (c *Client) close() {
	c.closeOnce.Do(func() {
		c.cancel()
		close(c.closing)
		close(c.send)
	})
}

// readPump owns all reads from the connection. It sets the read deadline,
// configures pong handling to extend it, parses inbound chat messages, and
// triggers the SSE proxy. It exits (and unregisters the client) on any error.
func (c *Client) readPump(token string) {
	defer func() {
		c.hub.Unregister(c)
		c.close()
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("ws read error user=%s: %v", c.userID, err)
			}
			return
		}
		c.metrics.MessagesTotal.WithLabelValues("in").Inc()

		var in inboundChat
		if err := json.Unmarshal(raw, &in); err != nil {
			c.enqueue(errorFrame("invalid JSON"))
			continue
		}
		if in.Type != "chat" {
			c.enqueue(errorFrame("unsupported message type"))
			continue
		}
		if in.Message == "" {
			c.enqueue(errorFrame("message is required"))
			continue
		}
		c.handleChat(token, in.SessionID, in.Message)
	}
}

// handleChat launches the SSE proxy in its own goroutine so the read loop keeps
// servicing pongs and further client messages while the coach streams. The proxy
// is bound to the client context, so a disconnect cancels the backend request.
//
// chatSem (cap 1) caps in-flight coach streams to one per connection: a client
// that fires chat messages back-to-back gets a single error frame rather than an
// unbounded fan-out of backend requests/goroutines.
func (c *Client) handleChat(token, sessionID, message string) {
	select {
	case c.chatSem <- struct{}{}:
	default:
		c.enqueue(errorFrame("a coach response is already in progress"))
		return
	}
	go func() {
		defer func() { <-c.chatSem }()
		err := proxyCoachStream(c.ctx, c.cfg, token, sessionID, message, func(frame []byte) {
			c.enqueue(frame)
		})
		if err != nil && c.ctx.Err() == nil {
			log.Printf("coach proxy error user=%s: %v", c.userID, err)
			c.enqueue(errorFrame("coach is temporarily unavailable"))
		}
	}()
}

// writePump is the SINGLE writer goroutine for this connection. It drains the
// send channel and emits periodic pings. It is the only place WriteMessage /
// WriteControl is called, satisfying gorilla's one-writer requirement.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// send channel closed: tell the peer and stop.
				_ = c.conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		case <-c.ctx.Done():
			return
		}
	}
}

// errorFrame builds an {"event":"error","data":"..."} frame.
func errorFrame(msg string) []byte {
	b, _ := json.Marshal(frame{Event: "error", Data: msg})
	return b
}

// frame is the unified outbound envelope sent to clients.
type frame struct {
	Event string `json:"event"`
	Data  string `json:"data"`
}
