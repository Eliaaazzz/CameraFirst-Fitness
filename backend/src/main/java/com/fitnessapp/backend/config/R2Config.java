package com.fitnessapp.backend.config;

import java.net.URI;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * Cloudflare R2 storage configuration.
 * R2 uses S3-compatible API.
 */
@Configuration
@Slf4j
public class R2Config {

    @Value("${r2.endpoint:${R2_ENDPOINT:http://localhost:9000}}")
    private String endpoint;

    @Value("${r2.access-key:${R2_ACCESS_KEY:test-access-key}}")
    private String accessKey;

    @Value("${r2.secret-key:${R2_SECRET_ACCESS_KEY:test-secret-key}}")
    private String secretKey;

    @Bean
    public S3Client s3Client() {
        log.info("Creating R2 client with endpoint: {}", endpoint);

        return S3Client.builder()
            .region(Region.of("auto"))
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey)))
            .serviceConfiguration(S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .build())
            .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
            .region(Region.of("auto"))
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey)))
            .serviceConfiguration(S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .build())
            .build();
    }
}
