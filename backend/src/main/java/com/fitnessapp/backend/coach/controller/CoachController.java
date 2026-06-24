package com.fitnessapp.backend.coach.controller;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.fitnessapp.backend.coach.service.AgentEvent;
import com.fitnessapp.backend.coach.service.CoachAgentService;
import com.fitnessapp.backend.security.AuthenticatedUser;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.PreDestroy;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;

/**
 * Streaming endpoint for the AI Coach agent.
 *
 * <p>Returns a Server-Sent Events stream of {@link AgentEvent}s: {@code meta} (session id),
 * {@code tool_call} / {@code tool_result} as the agent runs its plan→act→observe loop, {@code token}
 * deltas as the final answer streams in, and a terminal {@code done} (or {@code error}).</p>
 *
 * <p>Each stream runs on a virtual thread (Java 21) so thousands of concurrent conversations cost
 * little memory. The Go realtime gateway (P2) proxies this SSE stream onto client WebSockets.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/coach")
@Tag(name = "Coach", description = "Streaming AI nutrition/fitness coach agent")
public class CoachController {

    private static final long STREAM_TIMEOUT_MS = 180_000L;

    private final CoachAgentService coachAgentService;
    private final ExecutorService streamExecutor = Executors.newVirtualThreadPerTaskExecutor();

    public CoachController(CoachAgentService coachAgentService) {
        this.coachAgentService = coachAgentService;
    }

    @Operation(summary = "Chat with the AI Coach (SSE stream of tokens + tool events)")
    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@Valid @RequestBody CoachChatRequest request,
                           @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (currentUser == null || currentUser.userId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User authentication required");
        }

        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        streamExecutor.execute(() -> {
            Consumer<AgentEvent> sink = event -> {
                try {
                    emitter.send(SseEmitter.event().name(event.type()).data(event.data()));
                } catch (IOException e) {
                    throw new StreamClosedException(e); // client disconnected — abort the agent loop
                }
            };
            try {
                coachAgentService.streamChat(currentUser.userId(), request.sessionId(), request.message(), sink);
                emitter.complete();
            } catch (StreamClosedException e) {
                log.debug("Coach SSE client disconnected");
                emitter.completeWithError(e.getCause());
            } catch (Exception e) {
                log.warn("Coach stream failed: {}", e.getMessage());
                try {
                    emitter.send(SseEmitter.event().name("error").data("Coach is temporarily unavailable."));
                } catch (IOException ignored) {
                    // client already gone
                }
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }

    @PreDestroy
    void shutdown() {
        streamExecutor.shutdownNow();
    }

    private static final class StreamClosedException extends RuntimeException {
        StreamClosedException(Throwable cause) {
            super(cause);
        }
    }
}
