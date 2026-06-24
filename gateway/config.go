package main

import (
	"log"
	"os"
)

// Config holds the runtime configuration loaded from the environment.
type Config struct {
	Port       string // HTTP listen port (without colon), e.g. "8090".
	JWTSecret  string // HS256 shared secret; must match the Java backend.
	BackendURL string // Base URL of the Java backend, e.g. http://localhost:8080.
	APIKey     string // X-API-Key value the backend's ApiKeyAuthFilter expects.
	RedisAddr  string // host:port of Redis for social.events Pub/Sub; empty disables it.
}

// LoadConfig reads configuration from environment variables, applying defaults.
// It never fails: a missing JWT_SECRET is logged loudly but the process still
// starts so health checks and metrics remain available.
func LoadConfig() *Config {
	cfg := &Config{
		Port:       getenv("PORT", "8090"),
		JWTSecret:  os.Getenv("JWT_SECRET"),
		BackendURL: getenv("BACKEND_URL", "http://localhost:8080"),
		APIKey:     os.Getenv("API_KEY"),
		RedisAddr:  getenv("REDIS_ADDR", "localhost:6379"),
	}

	if cfg.JWTSecret == "" {
		log.Println("WARNING: JWT_SECRET is empty — all WebSocket auth will be REJECTED. " +
			"Set JWT_SECRET to the same value the Java backend uses (app.jwt.secret).")
	}
	if cfg.APIKey == "" {
		log.Println("WARNING: API_KEY is empty — backend coach SSE requests will likely be rejected by ApiKeyAuthFilter.")
	}

	return cfg
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
