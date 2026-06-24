package main

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// socialChannel is the Redis Pub/Sub channel the Java backend publishes to
// (SocialEventPublisher.CHANNEL).
const socialChannel = "social.events"

// socialEvent is the routing view of a published message. The full raw JSON is
// forwarded to clients unchanged; only the routing fields are parsed here.
type socialEvent struct {
	UserID     string   `json:"userId"`
	Recipients []string `json:"recipients"`
}

// SocialSubscriber subscribes to the social.events channel and fans each message
// out to the targeted users via the hub.
type SocialSubscriber struct {
	addr    string
	hub     *Hub
	metrics *Metrics
}

// NewSocialSubscriber constructs a subscriber. It does not connect until Run.
func NewSocialSubscriber(addr string, hub *Hub, metrics *Metrics) *SocialSubscriber {
	return &SocialSubscriber{addr: addr, hub: hub, metrics: metrics}
}

// Run blocks, consuming messages until ctx is cancelled. If Redis is unreachable
// it logs and retries with backoff rather than crashing, so the gateway keeps
// serving WebSocket + coach traffic even with no Redis.
func (s *SocialSubscriber) Run(ctx context.Context) {
	rdb := redis.NewClient(&redis.Options{Addr: s.addr})
	defer func() { _ = rdb.Close() }()

	const backoff = 5 * time.Second

	for {
		if ctx.Err() != nil {
			return
		}

		pubsub := rdb.Subscribe(ctx, socialChannel)
		// Confirm the subscription is live; surfaces connection errors early.
		if _, err := pubsub.Receive(ctx); err != nil {
			_ = pubsub.Close()
			if ctx.Err() != nil {
				return
			}
			log.Printf("redis subscribe failed (%v); retrying in %s", err, backoff)
			if !sleepCtx(ctx, backoff) {
				return
			}
			continue
		}

		log.Printf("subscribed to Redis channel %q at %s", socialChannel, s.addr)
		ch := pubsub.Channel()

		// consume returns true to reconnect (connection dropped) or false to stop
		// (context cancelled).
		reconnect := func() bool {
			for {
				select {
				case <-ctx.Done():
					return false
				case msg, ok := <-ch:
					if !ok {
						// Channel closed (connection dropped).
						log.Printf("redis pubsub channel closed; reconnecting")
						return true
					}
					s.dispatch(msg.Payload)
				}
			}
		}()
		_ = pubsub.Close()

		if !reconnect {
			return
		}
		if !sleepCtx(ctx, backoff) {
			return
		}
	}
}

// dispatch routes one raw message to its recipients and wraps it as a social frame.
func (s *SocialSubscriber) dispatch(payload string) {
	start := time.Now()
	defer func() { s.metrics.FanoutLatency.Observe(time.Since(start).Seconds()) }()

	var ev socialEvent
	if err := json.Unmarshal([]byte(payload), &ev); err != nil {
		log.Printf("social event: invalid JSON: %v", err)
		return
	}

	out := buildFrame("social", payload)

	targets := ev.Recipients
	if len(targets) == 0 && ev.UserID != "" {
		targets = []string{ev.UserID}
	}
	if len(targets) == 0 {
		return // no routing info; nothing to do
	}

	for _, uid := range targets {
		delivered := s.hub.SendToUser(uid, out)
		s.metrics.FanoutTotal.Add(float64(delivered))
	}
}

// sleepCtx sleeps for d or until ctx is cancelled; returns false if cancelled.
func sleepCtx(ctx context.Context, d time.Duration) bool {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-t.C:
		return true
	}
}
