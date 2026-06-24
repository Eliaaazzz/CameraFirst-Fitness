package com.fitnessapp.backend.coach.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.coach.agent.AgentToolRegistry;
import com.fitnessapp.backend.coach.entity.ChatMessage;
import com.fitnessapp.backend.coach.repository.ChatMessageRepository;
import com.fitnessapp.backend.coach.repository.ChatSessionRepository;
import com.fitnessapp.backend.common.ai.GeminiClient;
import com.fitnessapp.backend.common.ai.GeminiModels.GeminiFunctionCall;
import com.fitnessapp.backend.common.ai.GeminiModels.GeminiResponse;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

class CoachAgentServiceTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void runsPlanActObserveLoopThenStreamsFinalAnswer() {
        GeminiClient gemini = mock(GeminiClient.class);
        AgentToolRegistry registry = mock(AgentToolRegistry.class);
        ChatSessionRepository sessionRepo = mock(ChatSessionRepository.class);
        ChatMessageRepository messageRepo = mock(ChatMessageRepository.class);

        when(registry.declarations()).thenReturn(List.of());
        when(registry.execute(any(), any(), any())).thenReturn(mapper.createObjectNode().put("ok", true));
        when(sessionRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(messageRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(messageRepo.findBySessionIdOrderByCreatedAtDesc(any(), any())).thenReturn(List.of(
                ChatMessage.builder().id(UUID.randomUUID()).role(ChatMessage.ROLE_USER)
                        .content("what should I eat?").createdAt(OffsetDateTime.now()).build()));

        // 1st call: model asks to run a tool. 2nd call: model is done (no tool calls).
        GeminiResponse withTool = GeminiResponse.builder()
                .functionCall(GeminiFunctionCall.builder().name("get_user_goals")
                        .args(mapper.createObjectNode()).build())
                .finishReason("STOP").build();
        GeminiResponse done = GeminiResponse.builder().text("").finishReason("STOP").build();
        when(gemini.generate(any())).thenReturn(withTool, done);
        when(gemini.generateStream(any(), any())).thenAnswer(inv -> {
            Consumer<String> sink = inv.getArgument(1);
            sink.accept("Here");
            sink.accept(" you go");
            return "Here you go";
        });

        CoachAgentService service = new CoachAgentService(
                gemini, registry, sessionRepo, messageRepo, mapper, new SimpleMeterRegistry());

        List<AgentEvent> events = new ArrayList<>();
        UUID sessionId = service.streamChat(UUID.randomUUID(), null, "what should I eat?", events::add);

        assertThat(sessionId).isNotNull();
        assertThat(events).extracting(AgentEvent::type)
                .contains("meta", "tool_call", "tool_result", "token", "done");

        String streamed = events.stream().filter(e -> e.type().equals("token"))
                .map(e -> (String) e.data()).reduce("", String::concat);
        assertThat(streamed).isEqualTo("Here you go");

        // The agent looped once for the tool, then made a final (no-tool) decision => 2 generate calls.
        verify(gemini, times(2)).generate(any());
        verify(gemini, times(1)).generateStream(any(), any());
        // Persisted the user turn and the model answer.
        verify(messageRepo, times(2)).save(any());
        verify(registry, times(1)).execute(any(), any(), any());
    }
}
