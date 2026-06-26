package com.fitnessapp.backend.coach.knowledge;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Seeds {@link NutritionKnowledgeCorpus} into the knowledge table and embeds it with Gemini, once,
 * on startup. Idempotent: rows are keyed by a deterministic UUID of (source,title), so re-runs only
 * fill gaps. Skipped entirely when embeddings are unavailable (no key / Vertex) or the feature flag is
 * off — the agent then abstains on health questions rather than answering ungrounded.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NutritionKnowledgeSeeder {

    private final NutritionKnowledgeRepository repository;
    private final GeminiEmbeddingService embeddingService;

    @Value("${app.coach.knowledge.seed-enabled:true}")
    private boolean seedEnabled;

    /** Deterministic id so the same fact always maps to the same row (idempotent re-seeds). */
    private static UUID idFor(String source, String title) {
        return UUID.nameUUIDFromBytes((source + "|" + title).getBytes(StandardCharsets.UTF_8));
    }

    @EventListener(ApplicationReadyEvent.class)
    @Async
    public void seedOnStartup() {
        if (!seedEnabled) {
            log.info("Nutrition knowledge seeding disabled (app.coach.knowledge.seed-enabled=false)");
            return;
        }
        if (!embeddingService.isAvailable()) {
            log.warn("Nutrition knowledge NOT seeded: Gemini embedding service unavailable. "
                    + "The coach will abstain on health questions until a corpus is embedded.");
            return;
        }
        try {
            int seeded = seed();
            log.info("Nutrition knowledge ready: {} embedded rows ({} newly embedded this run)",
                    repository.countByEmbeddingIsNotNull(), seeded);
        } catch (Exception e) {
            log.error("Nutrition knowledge seeding failed: {}", e.getMessage(), e);
        }
    }

    /**
     * Insert any missing corpus rows, then embed any rows lacking an embedding. Returns the number of
     * rows embedded in this run. Each row is committed in its own unit so a single embed failure does
     * not roll back the rest.
     */
    public int seed() {
        List<NutritionKnowledgeCorpus.Doc> docs = NutritionKnowledgeCorpus.docs();
        int embedded = 0;
        for (NutritionKnowledgeCorpus.Doc doc : docs) {
            UUID id = idFor(doc.source(), doc.title());
            try {
                ensureRow(id, doc);
                if (embedRowIfNeeded(id, doc)) {
                    embedded++;
                }
            } catch (Exception e) {
                log.warn("Skipping knowledge row '{}/{}': {}", doc.source(), doc.title(), e.getMessage());
            }
        }
        return embedded;
    }

    // Both repository.save and repository.updateEmbedding manage their own transactions through the
    // repository proxy, so these helpers must NOT be @Transactional (self-invocation would bypass the
    // proxy and leave the @Modifying write with no transaction).
    private void ensureRow(UUID id, NutritionKnowledgeCorpus.Doc doc) {
        if (!repository.existsById(id)) {
            repository.save(new NutritionKnowledge(id, doc.source(), doc.title(), doc.content(), doc.url(), doc.tags()));
        }
    }

    /** Embeds the row if it has no embedding yet. Returns true if it embedded. */
    private boolean embedRowIfNeeded(UUID id, NutritionKnowledgeCorpus.Doc doc) {
        NutritionKnowledge row = repository.findById(id).orElse(null);
        if (row == null || row.getEmbedding() != null) {
            return false;
        }
        // Embed title + content so retrieval keys on both the topic and the claim.
        float[] vector = embeddingService.embed(doc.title() + ". " + doc.content());
        repository.updateEmbedding(id, toVectorString(vector), OffsetDateTime.now());
        return true;
    }

    private static String toVectorString(float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(String.format("%.8f", embedding[i]));
        }
        return sb.append(']').toString();
    }
}
