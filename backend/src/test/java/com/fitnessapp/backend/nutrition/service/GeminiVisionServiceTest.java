package com.fitnessapp.backend.nutrition.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import com.fitnessapp.backend.nutrition.exception.FoodRecognitionException;

import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Protocol;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * Unit tests for GeminiVisionService
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("GeminiVisionService Tests")
class GeminiVisionServiceTest {

    @Mock
    private OkHttpClient mockHttpClient;

    @Mock
    private Call mockCall;

    private GeminiVisionServiceImpl geminiVisionService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        geminiVisionService = new GeminiVisionServiceImpl(objectMapper, "test-api-key", "gemini-2.0-flash");

        // Replace the real HTTP client with mock
        ReflectionTestUtils.setField(geminiVisionService, "httpClient", mockHttpClient);
    }

    @Test
    @DisplayName("Should successfully recognize foods from image")
    void testRecognizeFoods_Success() throws IOException {
        // Given: A valid image file
        MultipartFile imageFile = new MockMultipartFile(
            "image",
            "food.jpg",
            "image/jpeg",
            "fake-image-content".getBytes()
        );

        // Mock successful Gemini API response
        String geminiResponse = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [
                      {
                        "text": "{\\"items\\":[{\\"food_key\\":\\"steamed_rice\\",\\"display_name\\":\\"白米饭\\",\\"estimated_grams\\":200,\\"cooking_method\\":\\"steamed\\",\\"confidence\\":0.95}],\\"meal_type\\":\\"lunch\\"}"
                      }
                    ]
                  }
                }
              ]
            }
            """;

        Response mockResponse = new Response.Builder()
            .request(new Request.Builder().url("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=test-api-key").build())
            .protocol(Protocol.HTTP_1_1)
            .code(200)
            .message("OK")
            .body(ResponseBody.create(geminiResponse, MediaType.parse("application/json")))
            .build();

        when(mockHttpClient.newCall(any(Request.class))).thenReturn(mockCall);
        when(mockCall.execute()).thenReturn(mockResponse);

        // When
        FoodRecognitionResult result = geminiVisionService.recognizeFoods(imageFile);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getMealType()).isEqualTo("lunch");

        RecognizedFood food = result.getItems().get(0);
        assertThat(food.getFoodKey()).isEqualTo("steamed_rice");
        assertThat(food.getDisplayName()).isEqualTo("白米饭");
        assertThat(food.getEstimatedGrams()).isEqualTo(200);
        assertThat(food.getConfidence()).isEqualTo(0.95);

        // Verify API call was made
        verify(mockHttpClient).newCall(any(Request.class));
    }

    @Test
    @DisplayName("Should reject image that is too large")
    void testRecognizeFoods_ImageTooLarge() {
        // Given: An image larger than 10MB
        byte[] largeImage = new byte[11 * 1024 * 1024]; // 11MB
        MultipartFile imageFile = new MockMultipartFile(
            "image", "large.jpg", "image/jpeg", largeImage
        );

        // When/Then
        assertThatThrownBy(() -> geminiVisionService.recognizeFoods(imageFile))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Image too large");
    }

    @Test
    @DisplayName("Should reject unsupported image type")
    void testRecognizeFoods_UnsupportedImageType() {
        // Given: A non-image file
        MultipartFile imageFile = new MockMultipartFile(
            "file", "document.pdf", "application/pdf", "content".getBytes()
        );

        // When/Then
        assertThatThrownBy(() -> geminiVisionService.recognizeFoods(imageFile))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Unsupported image type");
    }

    @Test
    @DisplayName("Should fail when API key is not configured")
    void testRecognizeFoods_NoApiKey() {
        // Given: Service without API key
        GeminiVisionServiceImpl serviceWithoutKey = new GeminiVisionServiceImpl(objectMapper, "", "gemini-2.0-flash");

        MultipartFile imageFile = new MockMultipartFile(
            "image", "food.jpg", "image/jpeg", "content".getBytes()
        );

        // When/Then
        assertThatThrownBy(() -> serviceWithoutKey.recognizeFoods(imageFile))
            .isInstanceOf(FoodRecognitionException.class)
            .hasMessageContaining("not configured");
    }

    @Test
    @DisplayName("Should include correct headers in API request")
    void testRecognizeFoods_CorrectHeaders() throws IOException {
        // Given
        MultipartFile imageFile = new MockMultipartFile(
            "image", "food.jpg", "image/jpeg", "content".getBytes()
        );

        String geminiResponse = """
            {
              "candidates": [{"content": {"parts": [{"text": "{\\"items\\":[],\\"meal_type\\":\\"unknown\\"}"}]}}]
            }
            """;

        Response mockResponse = new Response.Builder()
            .request(new Request.Builder().url("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=test-api-key").build())
            .protocol(Protocol.HTTP_1_1)
            .code(200)
            .message("OK")
            .body(ResponseBody.create(geminiResponse, MediaType.parse("application/json")))
            .build();

        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        when(mockHttpClient.newCall(requestCaptor.capture())).thenReturn(mockCall);
        when(mockCall.execute()).thenReturn(mockResponse);

        // When
        geminiVisionService.recognizeFoods(imageFile);

        // Then
        Request capturedRequest = requestCaptor.getValue();
        assertThat(capturedRequest.header("content-type")).isEqualTo("application/json");
        assertThat(capturedRequest.url().toString()).contains("key=test-api-key");
    }

    @Test
    @DisplayName("Should handle rate limit error (429)")
    void testRecognizeFoods_RateLimit() throws IOException {
        // Given
        MultipartFile imageFile = new MockMultipartFile(
            "image", "food.jpg", "image/jpeg", "content".getBytes()
        );

        Response mockResponse = new Response.Builder()
            .request(new Request.Builder().url("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=test-api-key").build())
            .protocol(Protocol.HTTP_1_1)
            .code(429)
            .message("Too Many Requests")
            .body(ResponseBody.create("{\"error\":\"rate_limit\"}", MediaType.parse("application/json")))
            .build();

        when(mockHttpClient.newCall(any(Request.class))).thenReturn(mockCall);
        when(mockCall.execute()).thenReturn(mockResponse);

        // When/Then - After retries, wraps original exception
        assertThatThrownBy(() -> geminiVisionService.recognizeFoods(imageFile))
            .isInstanceOf(FoodRecognitionException.class)
            .hasMessageContaining("Failed to recognize foods after");
    }

    @Test
    @DisplayName("Should handle server error (500)")
    void testRecognizeFoods_ServerError() throws IOException {
        // Given
        MultipartFile imageFile = new MockMultipartFile(
            "image", "food.jpg", "image/jpeg", "content".getBytes()
        );

        Response mockResponse = new Response.Builder()
            .request(new Request.Builder().url("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=test-api-key").build())
            .protocol(Protocol.HTTP_1_1)
            .code(500)
            .message("Internal Server Error")
            .body(ResponseBody.create("{\"error\":\"internal\"}", MediaType.parse("application/json")))
            .build();

        when(mockHttpClient.newCall(any(Request.class))).thenReturn(mockCall);
        when(mockCall.execute()).thenReturn(mockResponse);

        // When/Then - After retries, wraps original exception
        assertThatThrownBy(() -> geminiVisionService.recognizeFoods(imageFile))
            .isInstanceOf(FoodRecognitionException.class)
            .hasMessageContaining("Failed to recognize foods after");
    }

    @Test
    @DisplayName("Should retry on failure")
    void testRecognizeFoods_RetryLogic() throws IOException {
        // Given
        String base64Image = "dGVzdC1pbWFnZQ=="; // "test-image" in base64

        // First call fails, second succeeds
        Response failResponse = new Response.Builder()
            .request(new Request.Builder().url("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=test-api-key").build())
            .protocol(Protocol.HTTP_1_1)
            .code(500)
            .message("Error")
            .body(ResponseBody.create("{}", MediaType.parse("application/json")))
            .build();

        String successResponse = """
            {
              "candidates": [{"content": {"parts": [{"text": "{\\"items\\":[],\\"meal_type\\":\\"breakfast\\"}"}]}}]
            }
            """;

        Response okResponse = new Response.Builder()
            .request(new Request.Builder().url("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=test-api-key").build())
            .protocol(Protocol.HTTP_1_1)
            .code(200)
            .message("OK")
            .body(ResponseBody.create(successResponse, MediaType.parse("application/json")))
            .build();

        when(mockHttpClient.newCall(any(Request.class))).thenReturn(mockCall);
        when(mockCall.execute())
            .thenReturn(failResponse)
            .thenReturn(okResponse);

        // When
        FoodRecognitionResult result = geminiVisionService.recognizeFoods(base64Image, "image/jpeg");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getMealType()).isEqualTo("breakfast");
        verify(mockHttpClient, times(2)).newCall(any(Request.class));
    }

    @Test
    @DisplayName("Should fail after max retries")
    void testRecognizeFoods_MaxRetriesExceeded() throws IOException {
        // Given
        String base64Image = "dGVzdA==";

        Response errorResponse = new Response.Builder()
            .request(new Request.Builder().url("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=test-api-key").build())
            .protocol(Protocol.HTTP_1_1)
            .code(500)
            .message("Error")
            .body(ResponseBody.create("{}", MediaType.parse("application/json")))
            .build();

        when(mockHttpClient.newCall(any(Request.class))).thenReturn(mockCall);
        when(mockCall.execute()).thenReturn(errorResponse);

        // When/Then
        assertThatThrownBy(() -> geminiVisionService.recognizeFoods(base64Image, "image/jpeg"))
            .isInstanceOf(FoodRecognitionException.class)
            .hasMessageContaining("Failed to recognize foods after 2 attempts");

        verify(mockHttpClient, times(2)).newCall(any(Request.class));
    }

    @Test
    @DisplayName("Should handle empty items in response")
    void testRecognizeFoods_EmptyItems() throws IOException {
        // Given
        MultipartFile imageFile = new MockMultipartFile(
            "image", "unclear.jpg", "image/jpeg", "content".getBytes()
        );

        String geminiResponse = """
            {
              "candidates": [{"content": {"parts": [{"text": "{\\"items\\":[],\\"meal_type\\":\\"unknown\\"}"}]}}]
            }
            """;

        Response mockResponse = new Response.Builder()
            .request(new Request.Builder().url("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=test-api-key").build())
            .protocol(Protocol.HTTP_1_1)
            .code(200)
            .message("OK")
            .body(ResponseBody.create(geminiResponse, MediaType.parse("application/json")))
            .build();

        when(mockHttpClient.newCall(any(Request.class))).thenReturn(mockCall);
        when(mockCall.execute()).thenReturn(mockResponse);

        // When
        FoodRecognitionResult result = geminiVisionService.recognizeFoods(imageFile);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getItems()).isEmpty();
        assertThat(result.getMealType()).isEqualTo("unknown");
    }

    @Test
    @DisplayName("Should handle invalid JSON in response")
    void testRecognizeFoods_InvalidJSON() throws IOException {
        // Given
        String base64Image = "dGVzdA==";

        String geminiResponse = """
            {
              "candidates": [{"content": {"parts": [{"text": "This is not valid JSON"}]}}]
            }
            """;

        Response mockResponse = new Response.Builder()
            .request(new Request.Builder().url("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=test-api-key").build())
            .protocol(Protocol.HTTP_1_1)
            .code(200)
            .message("OK")
            .body(ResponseBody.create(geminiResponse, MediaType.parse("application/json")))
            .build();

        when(mockHttpClient.newCall(any(Request.class))).thenReturn(mockCall);
        when(mockCall.execute()).thenReturn(mockResponse);

        // When/Then - After retries, exception is wrapped
        assertThatThrownBy(() -> geminiVisionService.recognizeFoods(base64Image, "image/jpeg"))
            .isInstanceOf(FoodRecognitionException.class)
            .hasMessageContaining("Failed to recognize foods after");
    }

    @Test
    @DisplayName("Should recognize multiple foods from one image")
    void testRecognizeFoods_MultipleFoods() throws IOException {
        // Given
        MultipartFile imageFile = new MockMultipartFile(
            "image", "meal.jpg", "image/jpeg", "content".getBytes()
        );

        String geminiResponse = """
            {
              "candidates": [{
                "content": {
                  "parts": [{
                    "text": "{\\"items\\":[{\\"food_key\\":\\"steamed_rice\\",\\"display_name\\":\\"米饭\\",\\"estimated_grams\\":200,\\"cooking_method\\":\\"steamed\\",\\"confidence\\":0.95},{\\"food_key\\":\\"braised_pork\\",\\"display_name\\":\\"红烧肉\\",\\"estimated_grams\\":100,\\"cooking_method\\":\\"braised\\",\\"confidence\\":0.88}],\\"meal_type\\":\\"lunch\\"}"
                  }]
                }
              }]
            }
            """;

        Response mockResponse = new Response.Builder()
            .request(new Request.Builder().url("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=test-api-key").build())
            .protocol(Protocol.HTTP_1_1)
            .code(200)
            .message("OK")
            .body(ResponseBody.create(geminiResponse, MediaType.parse("application/json")))
            .build();

        when(mockHttpClient.newCall(any(Request.class))).thenReturn(mockCall);
        when(mockCall.execute()).thenReturn(mockResponse);

        // When
        FoodRecognitionResult result = geminiVisionService.recognizeFoods(imageFile);

        // Then
        assertThat(result.getItems()).hasSize(2);
        assertThat(result.getItems().get(0).getFoodKey()).isEqualTo("steamed_rice");
        assertThat(result.getItems().get(1).getFoodKey()).isEqualTo("braised_pork");
    }

    @Test
    @DisplayName("Should verify provider name is 'gemini'")
    void testGetProviderName() {
        assertThat(geminiVisionService.getProviderName()).isEqualTo("gemini");
    }

    @Test
    @DisplayName("Should verify model name is 'gemini-2.0-flash-exp'")
    void testGetModelName() {
        assertThat(geminiVisionService.getModelName()).isEqualTo("gemini-2.0-flash-exp");
    }

    @Test
    @DisplayName("Should verify priority is higher than Claude")
    void testGetPriority() {
        assertThat(geminiVisionService.getPriority()).isEqualTo(5);
        assertThat(geminiVisionService.getPriority()).isLessThan(10); // Lower number = higher priority
    }

    @Test
    @DisplayName("Should be available when API key is configured")
    void testIsAvailable_WithKey() {
        assertThat(geminiVisionService.isAvailable()).isTrue();
    }

    @Test
    @DisplayName("Should not be available when API key is not configured")
    void testIsAvailable_WithoutKey() {
        GeminiVisionServiceImpl serviceWithoutKey = new GeminiVisionServiceImpl(objectMapper, "", "gemini-2.0-flash");
        assertThat(serviceWithoutKey.isAvailable()).isFalse();
    }
}
