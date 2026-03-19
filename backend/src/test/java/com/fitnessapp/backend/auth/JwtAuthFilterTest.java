package com.fitnessapp.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.fitnessapp.backend.security.AuthenticatedUser;

import io.jsonwebtoken.JwtException;

@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTest {

    private static final String SECRET = "test-secret-key-that-is-at-least-256-bits-long-for-hmac-sha256";

    @Mock
    private JwtUtils jwtUtils;

    private JwtAuthFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthFilter(jwtUtils, List.of());
        SecurityContextHolder.clearContext();
    }

    /** Simulate what ApiKeyAuthFilter does — set ROLE_API_CLIENT auth. */
    private void simulateApiKeyAuth() {
        UsernamePasswordAuthenticationToken apiKeyAuth =
                new UsernamePasswordAuthenticationToken(
                        "api-key-user", null,
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_API_CLIENT")));
        SecurityContextHolder.getContext().setAuthentication(apiKeyAuth);
    }

    // =========================================================================
    // No JWT token
    // =========================================================================

    @Nested
    @DisplayName("When no JWT token is present")
    class NoJwt {

        @Test
        @DisplayName("request continues with existing API key auth")
        void continuesWithApiKeyAuth() throws Exception {
            simulateApiKeyAuth();

            var request = new MockHttpServletRequest("POST", "/api/v1/nutrition/analyze");
            var response = new MockHttpServletResponse();
            var chain = new MockFilterChain();

            filter.doFilterInternal(request, response, chain);

            assertThat(response.getStatus()).isEqualTo(200);
            assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
            assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal())
                    .isEqualTo("api-key-user");
            // Filter chain should have been called (request passed through)
            assertThat(chain.getRequest()).isNotNull();
        }
    }

    // =========================================================================
    // Valid JWT token
    // =========================================================================

    @Nested
    @DisplayName("When valid JWT token is present")
    class ValidJwt {

        @Test
        @DisplayName("upgrades auth to user-specific identity")
        void upgradesAuthToUser() throws Exception {
            simulateApiKeyAuth();
            UUID userId = UUID.randomUUID();

            when(jwtUtils.getUserId("valid-token")).thenReturn(userId);

            var request = new MockHttpServletRequest("POST", "/api/v1/nutrition/analyze");
            request.addHeader("Authorization", "Bearer valid-token");
            var response = new MockHttpServletResponse();
            var chain = new MockFilterChain();

            filter.doFilterInternal(request, response, chain);

            assertThat(response.getStatus()).isEqualTo(200);
            var auth = SecurityContextHolder.getContext().getAuthentication();
            assertThat(auth).isNotNull();
            assertThat(auth.getPrincipal()).isInstanceOf(AuthenticatedUser.class);
            assertThat(((AuthenticatedUser) auth.getPrincipal()).userId()).isEqualTo(userId);
            assertThat(chain.getRequest()).isNotNull();
        }
    }

    // =========================================================================
    // Expired / invalid JWT token
    // =========================================================================

    @Nested
    @DisplayName("When expired/invalid JWT token is present")
    class ExpiredJwt {

        @Test
        @DisplayName("falls back to API key auth — request NOT blocked")
        void fallsBackToApiKeyAuth() throws Exception {
            simulateApiKeyAuth();

            when(jwtUtils.getUserId("expired-token"))
                    .thenThrow(new JwtException("JWT expired"));

            var request = new MockHttpServletRequest("POST", "/api/v1/nutrition/analyze");
            request.addHeader("Authorization", "Bearer expired-token");
            var response = new MockHttpServletResponse();
            var chain = new MockFilterChain();

            filter.doFilterInternal(request, response, chain);

            // Request should NOT be blocked with 401
            assertThat(response.getStatus()).isEqualTo(200);

            // API key auth should still be intact
            var auth = SecurityContextHolder.getContext().getAuthentication();
            assertThat(auth).isNotNull();
            assertThat(auth.getPrincipal()).isEqualTo("api-key-user");

            // X-JWT-Status header should signal the client
            assertThat(response.getHeader("X-JWT-Status")).isEqualTo("expired");

            // Filter chain should have been called (request passed through)
            assertThat(chain.getRequest()).isNotNull();
        }

        @Test
        @DisplayName("without API key auth — request still continues (SecurityConfig will reject)")
        void continuesEvenWithoutApiKeyAuth() throws Exception {
            // No API key auth set — SecurityContext is empty

            when(jwtUtils.getUserId("expired-token"))
                    .thenThrow(new JwtException("JWT expired"));

            var request = new MockHttpServletRequest("GET", "/api/v1/meals");
            request.addHeader("Authorization", "Bearer expired-token");
            var response = new MockHttpServletResponse();
            var chain = new MockFilterChain();

            filter.doFilterInternal(request, response, chain);

            // Filter should NOT block — let SecurityConfig's .authenticated() handle it
            assertThat(response.getStatus()).isEqualTo(200);
            assertThat(response.getHeader("X-JWT-Status")).isEqualTo("expired");
            assertThat(chain.getRequest()).isNotNull();
        }
    }
}
