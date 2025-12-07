package com.fitnessapp.backend.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fitnessapp.backend.user.entity.ApiKey;
import com.fitnessapp.backend.user.service.ApiKeyService;
import jakarta.servlet.ServletException;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@ExtendWith(MockitoExtension.class)
class ApiKeyAuthFilterTest {

    @Mock
    private ApiKeyService apiKeyService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void allowsRequestsToWhitelistedEndpoints() throws ServletException, IOException {
        ApiKeyAuthFilter filter = new ApiKeyAuthFilter(apiKeyService, List.of(new AntPathRequestMatcher("/public/**")));
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/public/health");
        request.setServletPath("/public/health");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        assertThat(new AntPathRequestMatcher("/public/**").matches(request)).isTrue();
        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isNotEqualTo(HttpStatus.UNAUTHORIZED.value());
        verifyNoInteractions(apiKeyService);
    }

    @Test
    void rejectsMissingHeader() throws ServletException, IOException {
        ApiKeyAuthFilter filter = new ApiKeyAuthFilter(apiKeyService, List.of());
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/secure");
        request.setServletPath("/api/secure");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(response.getContentAsString()).contains("Missing API key");
        verifyNoInteractions(apiKeyService);
    }

    @Test
    void rejectsInvalidKey() throws ServletException, IOException {
        ApiKeyAuthFilter filter = new ApiKeyAuthFilter(apiKeyService, List.of());
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/secure");
        request.addHeader(ApiKeyAuthFilter.HEADER_NAME, "invalid");
        request.setServletPath("/api/secure");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(apiKeyService.validateKey("invalid")).thenReturn(Optional.empty());

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(response.getContentAsString()).contains("Invalid or disabled API key");
        verify(apiKeyService).validateKey("invalid");
    }

    @Test
    void allowsValidKey() throws ServletException, IOException {
        ApiKeyAuthFilter filter = new ApiKeyAuthFilter(apiKeyService, List.of());
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/secure");
        request.addHeader(ApiKeyAuthFilter.HEADER_NAME, "valid");
        request.setServletPath("/api/secure");
        MockHttpServletResponse response = new MockHttpServletResponse();
        CapturingFilterChain chain = new CapturingFilterChain();

    UUID tenantId = UUID.randomUUID();
    ApiKey storedKey = ApiKey.builder()
        .id(1L)
        .key("valid")
        .name("Test Key")
        .tenantId(tenantId.toString())
        .enabled(true)
        .createdAt(OffsetDateTime.now())
        .build();

    when(apiKeyService.validateKey("valid")).thenReturn(Optional.of(storedKey));

    filter.doFilter(request, response, chain);

    assertThat(response.getStatus()).isNotEqualTo(HttpStatus.UNAUTHORIZED.value());
    assertThat(chain.authentication).isNotNull();
    assertThat(chain.authentication.getPrincipal()).isInstanceOf(com.fitnessapp.backend.security.AuthenticatedUser.class);
    com.fitnessapp.backend.security.AuthenticatedUser principal =
        (com.fitnessapp.backend.security.AuthenticatedUser) chain.authentication.getPrincipal();
    assertThat(principal.apiKeyId()).isEqualTo(1L);
    assertThat(principal.userId()).isEqualTo(tenantId);
    verify(apiKeyService).validateKey("valid");
  }

  @Test
  void rejectsWhenTenantMissing() throws ServletException, IOException {
    ApiKeyAuthFilter filter = new ApiKeyAuthFilter(apiKeyService, List.of());
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/secure");
    request.addHeader(ApiKeyAuthFilter.HEADER_NAME, "valid");
    request.setServletPath("/api/secure");
    MockHttpServletResponse response = new MockHttpServletResponse();

    ApiKey storedKey = ApiKey.builder()
        .id(1L)
        .key("valid")
        .name("Test Key")
        .tenantId(null)
        .enabled(true)
        .createdAt(OffsetDateTime.now())
        .build();

    when(apiKeyService.validateKey("valid")).thenReturn(Optional.of(storedKey));

    filter.doFilter(request, response, new MockFilterChain());

    assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
    assertThat(response.getContentAsString()).contains("tenant/user binding");
  }

    private static final class CapturingFilterChain extends MockFilterChain {
        private org.springframework.security.core.Authentication authentication;

        @Override
        public void doFilter(jakarta.servlet.ServletRequest request, jakarta.servlet.ServletResponse response)
            throws IOException, ServletException {
            authentication = SecurityContextHolder.getContext().getAuthentication();
        }
    }
}
