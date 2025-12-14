package com.fitnessapp.backend.config;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    // API Key from application-dev.yml (e.g., app.api-key: fitness-secret-key-123)
    @Value("${app.api-key}")
    private String appApiKey;

    private final List<RequestMatcher> publicEndpoints;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Step 1: Check if this is a public endpoint (Swagger, Actuator, Auth)
        // Public endpoints can be accessed without API Key for debugging and new user registration
        if (isPublicEndpoint(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Step 2: Extract X-API-Key header from request
        // This is the "Access Card" (门禁卡) - must be present in every request
        String requestApiKey = request.getHeader("X-API-Key");

        // Step 3: Strict comparison - direct match with application-dev.yml value
        // If Key is empty OR Key doesn't match appApiKey -> reject immediately
        if (!StringUtils.hasText(requestApiKey) || !requestApiKey.equals(appApiKey)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Invalid or missing API Key\"}");
            return; // Deny request, stop processing
        }

        // Step 4: Key is valid - set API key authentication in security context
        // This allows requests with valid API key to proceed even without JWT
        // The JwtAuthFilter will later upgrade this to user-specific auth if JWT is present
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            UsernamePasswordAuthenticationToken apiKeyAuth = new UsernamePasswordAuthenticationToken(
                "api-key-user",
                null,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_API_CLIENT"))
            );
            SecurityContextHolder.getContext().setAuthentication(apiKeyAuth);
        }

        // Step 5: Pass to next filter (JwtAuthFilter for user authentication)
        filterChain.doFilter(request, response);
    }

    /**
     * Check if the request path matches any public endpoint
     * Public endpoints: auth routes, Swagger docs, health checks
     */
    private boolean isPublicEndpoint(HttpServletRequest request) {
        return publicEndpoints.stream().anyMatch(matcher -> matcher.matches(request));
    }
}