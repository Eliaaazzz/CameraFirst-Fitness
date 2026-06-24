package main

import (
	"errors"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

var (
	errNoToken      = errors.New("missing token")
	errInvalidToken = errors.New("invalid token")
	errNoSubject    = errors.New("token has no subject claim")
)

// extractToken pulls the JWT from either the "token" query parameter or an
// "Authorization: Bearer <jwt>" header (query param takes precedence, matching
// the documented client protocol for browsers that cannot set WS headers).
func extractToken(r *http.Request) string {
	if t := r.URL.Query().Get("token"); t != "" {
		return t
	}
	const prefix = "Bearer "
	if h := r.Header.Get("Authorization"); strings.HasPrefix(h, prefix) {
		return strings.TrimSpace(h[len(prefix):])
	}
	return ""
}

// validateToken verifies an HS256 JWT against the shared secret, enforces
// expiry, and returns the user id from the "sub" claim. It mirrors the Java
// backend's JwtUtils (subject = userId UUID string, signed with HMAC-SHA256).
func validateToken(tokenStr, secret string) (userID string, err error) {
	if tokenStr == "" {
		return "", errNoToken
	}
	if secret == "" {
		// No secret configured: refuse rather than accept unverified tokens.
		return "", errInvalidToken
	}

	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		// Pin the algorithm to HS256 to prevent alg-confusion attacks.
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errInvalidToken
		}
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired())
	if err != nil || !token.Valid {
		return "", errInvalidToken
	}

	sub, err := token.Claims.GetSubject()
	if err != nil || sub == "" {
		return "", errNoSubject
	}
	return sub, nil
}
