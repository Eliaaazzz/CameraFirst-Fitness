package com.fitnessapp.backend.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * API Key authentication filter for validating X-API-Key header.
 *
 * This filter is managed by Spring Container (@Component) to enable proper
 * @Value injection. It's registered ONLY in the Spring Security filter chain,
 * not as a global servlet filter (see FilterRegistrationBean in SecurityConfig).
 */
@Component
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    /**
     * API Key from configuration.
     * Resolves from: app.api-key in YAML, or APP_API_KEY environment variable
     */
    @Value("${app.api-key}")
    private String appApiKey;

    /**
     * Public endpoints that bypass API Key validation.
     * Initialized in @PostConstruct to match SecurityConfig.PUBLIC_ENDPOINTS
     */
    private List<RequestMatcher> publicEndpoints;

    private static final String[] PUBLIC_ENDPOINT_PATTERNS = {
        "/",
        // Only liveness/readiness are public; /actuator/prometheus + /metrics require the API key.
        "/actuator/health",
        "/actuator/health/**",
        "/actuator/info",
        "/swagger-ui.html",
        "/swagger-ui/**",
        "/v3/api-docs/**",
        "/api/v1/auth/**"
    };

    @PostConstruct
    public void init() {
        // Initialize public endpoint matchers after Spring injection is complete
        this.publicEndpoints = java.util.Arrays.stream(PUBLIC_ENDPOINT_PATTERNS)
            .map(AntPathRequestMatcher::new)
            .collect(java.util.stream.Collectors.toList());

        // Log configuration for debugging
        logger.info("ApiKeyAuthFilter initialized with API key: " +
            (appApiKey != null && appApiKey.length() > 4
                ? "***" + appApiKey.substring(appApiKey.length() - 4)
                : "NOT CONFIGURED"));
        
        if (appApiKey == null || appApiKey.isBlank()) {
            logger.warn("APP_API_KEY is not configured - API key authentication will reject all non-public requests");
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Step 1: Check if this is a public endpoint (Swagger, Actuator, Auth)
        // Public endpoints can be accessed without API Key for debugging and new user registration
        if (isPublicEndpoint(request) || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        // Step 2: Extract X-API-Key header from request
        // This is the "Access Card" - must be present in every request
        String requestApiKey = request.getHeader("X-API-Key");

        // Step 3: Constant-time comparison to avoid leaking the key via a timing side-channel.
        // Never log the actual key values.
        if (!StringUtils.hasText(requestApiKey) || !constantTimeEquals(requestApiKey, appApiKey)) {
            logger.warn("API key validation failed for path: " + request.getRequestURI());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Invalid or disabled API key\"}");
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

    /**
     * Constant-time comparison to prevent timing attacks on the API key.
     */
    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(
            a.getBytes(StandardCharsets.UTF_8),
            b.getBytes(StandardCharsets.UTF_8));
    }
}