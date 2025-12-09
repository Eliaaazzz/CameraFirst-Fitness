package com.fitnessapp.backend.config;

import com.fitnessapp.backend.auth.JwtAuthFilter;
import com.fitnessapp.backend.auth.JwtUtils;
import com.fitnessapp.backend.user.service.ApiKeyService;
import java.util.List;
import java.util.stream.Collectors;
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

@Configuration
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = {
        "/actuator/**",
        "/swagger-ui.html",
        "/swagger-ui/**",
        "/v3/api-docs/**",
        "/api/v1/auth/**"
    };

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    ApiKeyAuthFilter apiKeyAuthFilter(ApiKeyService apiKeyService) {
        List<RequestMatcher> matchers = java.util.Arrays.stream(PUBLIC_ENDPOINTS)
            .map(AntPathRequestMatcher::new)
            .collect(Collectors.toList());
        return new ApiKeyAuthFilter(apiKeyService, matchers);
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
            ApiKeyAuthFilter apiKeyAuthFilter,
            JwtAuthFilter jwtAuthFilter,
            CorsConfigurationSource corsConfigurationSource) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // JWT filter first, then API key filter as fallback
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(apiKeyAuthFilter, JwtAuthFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
