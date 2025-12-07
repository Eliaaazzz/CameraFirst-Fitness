package com.fitnessapp.backend.config;

import com.fitnessapp.backend.user.entity.ApiKey;
import com.fitnessapp.backend.security.AuthenticatedUser;
import com.fitnessapp.backend.user.service.ApiKeyService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@RequiredArgsConstructor
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    public static final String HEADER_NAME = "X-API-Key";

    private final ApiKeyService apiKeyService;
    private final List<RequestMatcher> publicEndpoints;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        return publicEndpoints.stream().anyMatch(matcher -> matcher.matches(request));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {

        String presentedKey = request.getHeader(HEADER_NAME);
        if (!StringUtils.hasText(presentedKey)) {
            writeUnauthorized(response, "Missing API key");
            return;
        }

        Optional<ApiKey> apiKeyOpt = apiKeyService.validateKey(presentedKey);
        if (apiKeyOpt.isEmpty()) {
            writeUnauthorized(response, "Invalid or disabled API key");
            return;
        }

        ApiKey apiKey = apiKeyOpt.get();
        if (!StringUtils.hasText(apiKey.getTenantId())) {
            writeUnauthorized(response, "API key is missing tenant/user binding");
            return;
        }

        UUID userId;
        try {
            userId = UUID.fromString(apiKey.getTenantId());
        } catch (IllegalArgumentException ex) {
            writeUnauthorized(response, "API key tenant is not a valid UUID");
            return;
        }

        AuthenticatedUser principal = new AuthenticatedUser(apiKey.getId(), apiKey.getName(), userId);
        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        try {
            filterChain.doFilter(request, response);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void writeUnauthorized(HttpServletResponse response, String message) throws IOException {
        if (!response.isCommitted()) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"" + message + "\"}");
        }
        SecurityContextHolder.clearContext();
    }
}
