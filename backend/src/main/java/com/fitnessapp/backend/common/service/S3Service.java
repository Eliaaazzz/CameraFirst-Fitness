package com.fitnessapp.backend.common.service;

import java.io.IOException;
import java.time.Duration;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

/**
 * Unified S3 service for all file operations.
 * Single bucket, different folders via pathPrefix parameter.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class S3Service {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.s3.region}")
    private String region;

    /**
     * Generate a presigned URL for client-side direct upload.
     *
     * @param pathPrefix folder prefix (e.g., "avatars", "meals")
     * @param userId user identifier
     * @param contentType MIME type
     * @return presigned upload result
     */
    public PresignedUploadResult generatePresignedUrl(String pathPrefix, UUID userId, String contentType) {
        String extension = getExtension(contentType);
        String fileKey = String.format("%s/%s/%s%s", pathPrefix, userId, UUID.randomUUID(), extension);

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(fileKey)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(putObjectRequest)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);
        String uploadUrl = presignedRequest.url().toString();
        String publicUrl = buildPublicUrl(fileKey);

        log.info("Generated presigned URL for {}/{} with public-read ACL", pathPrefix, userId);
        return new PresignedUploadResult(uploadUrl, publicUrl, fileKey);
    }

    /**
     * Upload a file directly to S3 (server-side).
     *
     * @param file the file to upload
     * @param pathPrefix folder prefix (e.g., "avatars", "meals")
     * @return public URL of the uploaded file
     */
    public String uploadFile(MultipartFile file, String pathPrefix) {
        if (file == null || file.isEmpty()) {
            log.warn("Cannot upload empty file");
            return null;
        }

        String fileKey = String.format("%s/%s-%s", pathPrefix, UUID.randomUUID(), file.getOriginalFilename());

        try {
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileKey)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            String publicUrl = buildPublicUrl(fileKey);
            log.info("Uploaded file to S3: {}", fileKey);
            return publicUrl;
        } catch (IOException e) {
            log.error("Failed to upload file to S3: {}", e.getMessage());
            throw new RuntimeException("Failed to upload file to S3", e);
        }
    }

    /**
     * Delete a file from S3.
     */
    public void deleteFile(String fileKey) {
        if (fileKey == null || fileKey.isEmpty()) {
            return;
        }

        DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(fileKey)
                .build();
        s3Client.deleteObject(deleteRequest);
        log.info("Deleted file from S3: {}", fileKey);
    }

    private String buildPublicUrl(String fileKey) {
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, fileKey);
    }

    private String getExtension(String contentType) {
        if (contentType == null) return "";
        return switch (contentType.toLowerCase()) {
            case "image/jpeg", "image/jpg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> "";
        };
    }

    public record PresignedUploadResult(String uploadUrl, String publicUrl, String fileKey) {}
}