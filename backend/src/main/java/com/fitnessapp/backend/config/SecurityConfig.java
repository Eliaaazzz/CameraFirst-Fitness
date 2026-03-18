package com.fitnessapp.backend.config;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfigurationSource;

import com.fitnessapp.backend.auth.JwtAuthFilter;
import com.fitnessapp.backend.auth.JwtUtils;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = {
        "/",
        "/actuator/**",
        "/swagger-ui.html",
        "/swagger-ui/**",
        "/v3/api-docs/**",
        "/api/v1/auth/**"
    };

    /**
     * Injected by Spring Container (ApiKeyAuthFilter is a @Component)
     */
    private final ApiKeyAuthFilter apiKeyAuthFilter;

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * CRITICAL: Disable automatic servlet filter registration for ApiKeyAuthFilter.
     *
     * Since ApiKeyAuthFilter is a @Component extending OncePerRequestFilter,
     * Spring Boot will automatically register it as a global servlet filter.
     * This would cause the filter to run TWICE:
     *   1. Once in the global servlet filter chain
     *   2. Once in the Spring Security filter chain
     *
     * By setting enabled=false, we ensure it ONLY runs within Spring Security.
     */
    @Bean
    FilterRegistrationBean<ApiKeyAuthFilter> apiKeyAuthFilterRegistration(ApiKeyAuthFilter filter) {
        FilterRegistrationBean<ApiKeyAuthFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false); // Disable auto-registration as servlet filter
        return registration;
    }

    @Bean
    JwtAuthFilter jwtAuthFilter(JwtUtils jwtUtils) {
        List<RequestMatcher> matchers = java.util.Arrays.stream(PUBLIC_ENDPOINTS)
            .map(AntPathRequestMatcher::new)
            .collect(Collectors.toList());
        return new JwtAuthFilter(jwtUtils, matchers);
    }

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthFilter jwtAuthFilter,
            CorsConfigurationSource corsConfigurationSource) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(
                        "default-src 'self'; "
                        + "script-src 'self' https://appleid.cdn-apple.com https://accounts.google.com https://apis.google.com; "
                        + "style-src 'self' 'unsafe-inline'; "
                        + "frame-src https://appleid.apple.com https://accounts.google.com; "
                        + "connect-src 'self' https://appleid.apple.com; "
                        + "img-src 'self' data:; "
                        + "font-src 'self'"
                    )
                )
            )
            // Layer 1: API Key validation (Access Card)
            // Checks X-API-Key header first - this is the first line of defense
            .addFilterBefore(apiKeyAuthFilter, UsernamePasswordAuthenticationFilter.class)
            // Layer 2: JWT validation (ID Card)
            // After API Key passes, validates Bearer token - second line of defense
            .addFilterAfter(jwtAuthFilter, ApiKeyAuthFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
