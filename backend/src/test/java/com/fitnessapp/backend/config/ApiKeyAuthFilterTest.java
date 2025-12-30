package com.fitnessapp.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import jakarta.servlet.ServletException;

@ExtendWith(MockitoExtension.class)
class ApiKeyAuthFilterTest {

    private static final String VALID_API_KEY = "test-api-key-123";
    private static final String INVALID_API_KEY = "invalid-key";

    private ApiKeyAuthFilter filter;

    @BeforeEach
    void setUp() {
        filter = new ApiKeyAuthFilter();
        ReflectionTestUtils.setField(filter, "appApiKey", VALID_API_KEY);
        // Call init() to initialize publicEndpoints list
        filter.init();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void allowsRequestsToWhitelistedEndpoints() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/auth/login");
        request.setServletPath("/api/v1/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isNotEqualTo(HttpStatus.UNAUTHORIZED.value());
    }

    @Test
    void rejectsMissingHeader() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/secure");
        request.setServletPath("/api/secure");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(response.getContentAsString()).contains("Invalid or disabled API key");
    }

    @Test
    void rejectsInvalidKey() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/secure");
        request.addHeader("X-API-Key", INVALID_API_KEY);
        request.setServletPath("/api/secure");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(response.getContentAsString()).contains("Invalid or disabled API key");
    }

    @Test
    void allowsValidKey() throws ServletException, IOException {
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
