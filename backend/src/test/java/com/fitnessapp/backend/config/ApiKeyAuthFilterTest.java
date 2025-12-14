package com.fitnessapp.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.test.util.ReflectionTestUtils;

import jakarta.servlet.ServletException;

@ExtendWith(MockitoExtension.class)
class ApiKeyAuthFilterTest {

    private static final String VALID_API_KEY = "test-api-key-123";
    private static final String INVALID_API_KEY = "invalid-key";

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void allowsRequestsToWhitelistedEndpoints() throws ServletException, IOException {
        ApiKeyAuthFilter filter = new ApiKeyAuthFilter(List.of(new AntPathRequestMatcher("/public/**")));
        // Inject the appApiKey value for testing
        ReflectionTestUtils.setField(filter, "appApiKey", VALID_API_KEY);
        
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/public/health");
        request.setServletPath("/public/health");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        assertThat(new AntPathRequestMatcher("/public/**").matches(request)).isTrue();
        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isNotEqualTo(HttpStatus.UNAUTHORIZED.value());
    }

    @Test
    void rejectsMissingHeader() throws ServletException, IOException {
        ApiKeyAuthFilter filter = new ApiKeyAuthFilter(List.of());
        ReflectionTestUtils.setField(filter, "appApiKey", VALID_API_KEY);
        
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/secure");
        request.setServletPath("/api/secure");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(response.getContentAsString()).contains("Invalid or missing API Key");
    }

    @Test
    void rejectsInvalidKey() throws ServletException, IOException {
        ApiKeyAuthFilter filter = new ApiKeyAuthFilter(List.of());
        ReflectionTestUtils.setField(filter, "appApiKey", VALID_API_KEY);
        
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/secure");
        request.addHeader("X-API-Key", INVALID_API_KEY);
        request.setServletPath("/api/secure");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(response.getContentAsString()).contains("Invalid or missing API Key");
    }

    @Test
    void allowsValidKey() throws ServletException, IOException {
        ApiKeyAuthFilter filter = new ApiKeyAuthFilter(List.of());
        ReflectionTestUtils.setField(filter, "appApiKey", VALID_API_KEY);
        
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/secure");
        request.addHeader("X-API-Key", VALID_API_KEY);
        request.setServletPath("/api/secure");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        // Valid key should pass through without 401 error
        assertThat(response.getStatus()).isNotEqualTo(HttpStatus.UNAUTHORIZED.value());
    }
}
