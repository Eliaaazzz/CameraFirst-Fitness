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
 * Cloudflare R2 storage service.
 * Single bucket, different folders via pathPrefix parameter.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class R2StorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${r2.bucket:${R2_BUCKET_NAME}}")
    private String bucket;

    @Value("${r2.public-url:${R2_PUBLIC_URL}}")
    private String publicUrl;

    /**
     * Generate a presigned URL for client-side direct upload.
     */
    public PresignedUploadResult generatePresignedUrl(String pathPrefix, UUID userId, String contentType) {
        String extension = getExtension(contentType);
        String fileKey = String.format("%s/%s/%s%s", pathPrefix, userId, UUID.randomUUID(), extension);

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(fileKey)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(putObjectRequest)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);
        String uploadUrl = presignedRequest.url().toString();
        String filePublicUrl = buildPublicUrl(fileKey);

        log.info("Generated R2 presigned URL for {}/{}", pathPrefix, userId);
        return new PresignedUploadResult(uploadUrl, filePublicUrl, fileKey);
    }

    /**
     * Upload a file directly to R2 (server-side).
     */
    public String uploadFile(MultipartFile file, String pathPrefix) {
        if (file == null || file.isEmpty()) {
            log.warn("Cannot upload empty file");
            return null;
        }

        String fileKey = String.format("%s/%s-%s", pathPrefix, UUID.randomUUID(), file.getOriginalFilename());

        try {
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(fileKey)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            String filePublicUrl = buildPublicUrl(fileKey);
            log.info("Uploaded file to R2: {}", fileKey);
            return filePublicUrl;
        } catch (IOException e) {
            log.error("Failed to upload file to R2: {}", e.getMessage());
            throw new RuntimeException("Failed to upload file to R2", e);
        }
    }

    /**
     * Delete a file from R2.
     */
    public void deleteFile(String fileKey) {
        if (fileKey == null || fileKey.isEmpty()) {
            return;
        }

        DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(fileKey)
                .build();
        s3Client.deleteObject(deleteRequest);
        log.info("Deleted file from R2: {}", fileKey);
    }

    private String buildPublicUrl(String fileKey) {
        return String.format("%s/%s", publicUrl, fileKey);
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
