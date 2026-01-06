package com.fitnessapp.backend.auth;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fitnessapp.backend.security.AuthenticatedUser;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtUtils jwtUtils;
    private final List<RequestMatcher> publicEndpoints;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return publicEndpoints.stream().anyMatch(m -> m.matches(request));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        // Try to extract JWT token from Authorization header first (mobile clients)
        // Then fall back to HttpOnly cookie (web clients)
        String token = extractTokenFromHeader(request);
        if (token == null) {
            token = extractTokenFromCookie(request);
        }

        if (token == null) {
            // No JWT token found anywhere - continue with existing authentication (from API key)
            chain.doFilter(request, response);
            return;
        }

        // JWT token is present - validate it
        try {
            UUID userId = jwtUtils.getUserId(token);
            // Replace any existing authentication (e.g., from API key) with JWT-based user auth
            AuthenticatedUser principal = new AuthenticatedUser(null, "jwt-user", userId);
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList());
            SecurityContextHolder.getContext().setAuthentication(auth);
            log.debug("JWT authentication successful for user: {}", userId);
        } catch (JwtException e) {
            // JWT token provided but invalid - immediately return 401 and clear authentication
            // This ensures users are logged out when JWT has any problems (format, signature, expiration)
            log.warn("Invalid JWT token provided - returning 401. Error: {}, Token prefix: {}",
                    e.getMessage(), token.length() > 10 ? token.substring(0, 10) + "..." : token);

            // Clear any existing authentication to log out the user
            SecurityContextHolder.clearContext();

            // Return 401 Unauthorized
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Invalid or expired JWT token\"}");
            return;
        }

        chain.doFilter(request, response);
    }

    /**
     * Extract JWT from Authorization header (mobile clients).
     * Format: "Bearer <token>"
     */
    private String extractTokenFromHeader(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        return null;
    }

    /**
     * Extract JWT from HttpOnly cookie (web clients).
     * Cookie name: "aura_jwt"
     */
    private String extractTokenFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        return Arrays.stream(cookies)
                .filter(c -> AuthController.JWT_COOKIE_NAME.equals(c.getName()))
                .map(Cookie::getValue)
                .filter(StringUtils::hasText)
                .findFirst()
                .orElse(null);
    }
}