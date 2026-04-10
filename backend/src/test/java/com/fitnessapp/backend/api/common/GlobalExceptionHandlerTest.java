package com.fitnessapp.backend.api.common;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.net.SocketTimeoutException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fitnessapp.backend.nutrition.exception.FoodRecognitionException;

class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void mapsRetriedProviderTimeoutsToRequestTimeout() throws Exception {
        mockMvc.perform(get("/test/timeout"))
                .andExpect(status().isRequestTimeout())
                .andExpect(jsonPath("$.code").value(ErrorCode.AI_TIMEOUT.getCode()))
                .andExpect(jsonPath("$.message").value("All providers failed: Failed after 2 attempt(s)"));
    }

    @Test
    void mapsRetriedProviderTransportFailuresToServiceUnavailable() throws Exception {
        mockMvc.perform(get("/test/unavailable"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value(ErrorCode.AI_SERVICE_UNAVAILABLE.getCode()))
                .andExpect(jsonPath("$.message").value("All providers failed: Failed after 1 attempt(s)"));
    }

    @RestController
    private static final class TestController {

        @GetMapping("/test/timeout")
        String timeout() {
            throw new FoodRecognitionException(
                    "All providers failed: Failed after 2 attempt(s)",
                    new FoodRecognitionException(
                            "Failed after 2 attempt(s)",
                            new SocketTimeoutException("Read timed out")));
        }

        @GetMapping("/test/unavailable")
        String unavailable() {
            throw new FoodRecognitionException(
                    "All providers failed: Failed after 1 attempt(s)",
                    new FoodRecognitionException(
                            "Failed after 1 attempt(s)",
                            new IOException("Transient Gemini API error: 503")));
        }
    }
}
