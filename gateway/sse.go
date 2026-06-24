package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// sseTimeout bounds a single coach stream end-to-end, matching the backend's
// SseEmitter STREAM_TIMEOUT_MS (180s).
const sseTimeout = 180 * time.Second

// coachRequest is the JSON body POSTed to the backend coach endpoint.
// sessionId is sent as null when empty so the backend starts a new session.
type coachRequest struct {
	SessionID *string `json:"sessionId"`
	Message   string  `json:"message"`
}

// proxyCoachStream POSTs an SSE request to {BACKEND_URL}/api/v1/coach/chat,
// stream-parses the event-stream response, and invokes send() with a JSON frame
// {"event":<name>,"data":<raw data string>} for every event. It returns when the
// stream ends (done/error event, EOF), the context is cancelled (client
// disconnect / shutdown), or the deadline elapses. The HTTP request is bound to
// the derived context, so cancellation aborts the in-flight backend call.
func proxyCoachStream(parent context.Context, cfg *Config, token, sessionID, message string, send func([]byte)) error {
	ctx, cancel := context.WithTimeout(parent, sseTimeout)
	defer cancel()

	var sid *string
	if sessionID != "" {
		sid = &sessionID
	}
	body, err := json.Marshal(coachRequest{SessionID: sid, Message: message})
	if err != nil {
		return fmt.Errorf("marshal coach request: %w", err)
	}

	url := strings.TrimRight(cfg.BackendURL, "/") + "/api/v1/coach/chat"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build coach request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-API-Key", cfg.APIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")

	resp, err := sseHTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("coach request failed: %w", err)
	}
	defer func() {
		_, _ = io.Copy(io.Discard, resp.Body)
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("coach returned status %d", resp.StatusCode)
	}

	return parseSSE(ctx, resp.Body, send)
}

// sseHTTPClient has no overall timeout (the stream is long-lived); per-request
// bounding is handled by the context deadline. It allows many idle connections
// for high concurrency.
var sseHTTPClient = &http.Client{
	Transport: &http.Transport{
		MaxIdleConns:        1000,
		MaxIdleConnsPerHost: 1000,
		IdleConnTimeout:     90 * time.Second,
	},
}

// parseSSE reads a text/event-stream body line by line. SSE events are blocks of
// "event:" and "data:" lines terminated by a blank line. Per the spec, multiple
// data lines are joined with newlines. Each completed event is forwarded as a
// frame. The loop stops on the terminal "done"/"error" events or on ctx cancel.
func parseSSE(ctx context.Context, body io.Reader, send func([]byte)) error {
	reader := bufio.NewReaderSize(body, 16*1024)

	var eventName string
	var dataLines []string

	flush := func() (stop bool) {
		if eventName == "" && len(dataLines) == 0 {
			return false
		}
		name := eventName
		if name == "" {
			name = "message"
		}
		data := strings.Join(dataLines, "\n")
		eventName = ""
		dataLines = dataLines[:0]

		send(buildFrame(name, data))
		return name == "done" || name == "error"
	}

	for {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		line, err := reader.ReadString('\n')
		if len(line) > 0 {
			trimmed := strings.TrimRight(line, "\r\n")
			switch {
			case trimmed == "":
				// Blank line: dispatch the buffered event.
				if flush() {
					return nil
				}
			case strings.HasPrefix(trimmed, ":"):
				// Comment / heartbeat line — ignore.
			case strings.HasPrefix(trimmed, "event:"):
				eventName = strings.TrimSpace(trimmed[len("event:"):])
			case strings.HasPrefix(trimmed, "data:"):
				// A single leading space after the colon is part of the syntax.
				d := trimmed[len("data:"):]
				d = strings.TrimPrefix(d, " ")
				dataLines = append(dataLines, d)
			}
		}

		if err != nil {
			if errors.Is(err, io.EOF) {
				flush() // emit any trailing event without a terminating blank line
				return nil
			}
			return err
		}
	}
}

// buildFrame wraps a coach SSE event into the unified outbound envelope.
func buildFrame(event, data string) []byte {
	b, _ := json.Marshal(frame{Event: event, Data: data})
	return b
}
