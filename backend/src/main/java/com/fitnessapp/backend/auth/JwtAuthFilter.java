package com.fitnessapp.backend.auth;

import com.fitnessapp.backend.security.AuthenticatedUser;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

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

        // Check if JWT token is present in the request
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(header) || !header.startsWith(BEARER_PREFIX)) {
            // No JWT token - continue with existing authentication (from API key)
            chain.doFilter(request, response);
            return;
        }

        // JWT token is present - extract and validate it
        String token = header.substring(BEARER_PREFIX.length());
        try {
            UUID userId = jwtUtils.getUserId(token);
            // Replace any existing authentication (e.g., from API key) with JWT-based user auth
            AuthenticatedUser principal = new AuthenticatedUser(null, "jwt-user", userId);
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList());
            SecurityContextHolder.getContext().setAuthentication(auth);
            log.debug("JWT authentication successful for user: {}", userId);
        } catch (JwtException e) {
            log.warn("Invalid JWT token provided - continuing with existing authentication: {}", e.getMessage());
            // Don't replace auth - let request continue with existing auth (from API key)
            // This allows graceful degradation but should be monitored for security
        }

        chain.doFilter(request, response);
    }
}
