package com.fitnessapp.backend.nutrition.service;

import java.io.IOException;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
@Slf4j
public class S3Service {

  @Value("${aws.s3.bucket}")
  private String bucketName;

  @Value("${aws.s3.region}")
  private String region;

  @Value("${aws.s3.access-key}")
  private String accessKey;

  @Value("${aws.s3.secret-key}")
  private String secretKey;

  private S3Client s3Client;
  private boolean enabled;

  @PostConstruct
  public void init() {
    enabled = isConfigured();
    if (!enabled) {
      log.warn("S3 upload disabled: missing or placeholder AWS config");
      return;
    }

    this.s3Client = S3Client.builder()
        .region(Region.of(region))
        .credentialsProvider(StaticCredentialsProvider.create(
            AwsBasicCredentials.create(accessKey, secretKey)))
        .build();
  }

  /**
   * Upload an image to S3 and return its public URL.
   */
  public String uploadFile(MultipartFile file) {
    if (!enabled || s3Client == null) {
      return null;
    }

    String fileName = "meals/" + UUID.randomUUID() + "-" + file.getOriginalFilename();

    try {
      PutObjectRequest putRequest = PutObjectRequest.builder()
          .bucket(bucketName)
          .key(fileName)
          .contentType(file.getContentType())
          .build();

      s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

      return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, fileName);
    } catch (IOException e) {
      log.error("Failed to upload image to S3", e);
      throw new RuntimeException("Failed to upload image to S3", e);
    }
  }

  private boolean isConfigured() {
    return isValidValue(bucketName)
        && isValidValue(region)
        && isValidValue(accessKey)
        && isValidValue(secretKey);
  }

  private boolean isValidValue(String value) {
    if (value == null) {
      return false;
    }
    String trimmed = value.trim();
    if (trimmed.isEmpty()) {
      return false;
    }
    String lower = trimmed.toLowerCase();
    return !lower.startsWith("your-") && !lower.contains("your-");
  }
}
