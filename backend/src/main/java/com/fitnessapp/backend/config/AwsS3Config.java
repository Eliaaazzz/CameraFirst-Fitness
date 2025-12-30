package com.fitnessapp.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * AWS S3 Configuration.
 * Provides S3Client and S3Presigner beans.
 */
@Configuration
@Slf4j
public class AwsS3Config {

    @Value("${aws.s3.region}")
    private String region;

    @Value("${aws.s3.access-key:${AWS_ACCESS_KEY_ID:}}")
    private String accessKey;

    @Value("${aws.s3.secret-key:${AWS_SECRET_ACCESS_KEY:}}")
    private String secretKey;

    @Bean
    public S3Client s3Client() {
        log.info("Creating S3Client for region: {}", region);

        var builder = S3Client.builder().region(Region.of(region));

        if (hasCredentials()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey)));
        }

        return builder.build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        var builder = S3Presigner.builder().region(Region.of(region));

        if (hasCredentials()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey)));
        }

        return builder.build();
    }

    private boolean hasCredentials() {
        return accessKey != null && !accessKey.isEmpty()
            && secretKey != null && !secretKey.isEmpty();
    }
}
