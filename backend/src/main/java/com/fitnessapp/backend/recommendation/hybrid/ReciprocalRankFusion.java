package com.fitnessapp.backend.recommendation.hybrid;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Reciprocal Rank Fusion (Cormack et al.): merge several ranked lists into one ranking by summing
 * {@code 1 / (k + rank)} contributions. Rank-based (not score-based), so it fuses heterogeneous
 * signals — e.g. pgvector content similarity and collaborative filtering — without score calibration.
 */
public final class ReciprocalRankFusion {

    /** Standard RRF constant; dampens the influence of top ranks so lower ranks still contribute. */
    public static final int DEFAULT_K = 60;

    private ReciprocalRankFusion() {
    }

    public static <T> List<RankedItem<T>> fuse(List<List<T>> rankedLists) {
        return fuse(rankedLists, DEFAULT_K);
    }

    public static <T> List<RankedItem<T>> fuse(List<List<T>> rankedLists, int k) {
        Map<T, Double> scores = new LinkedHashMap<>();
        Map<T, Set<Integer>> sources = new LinkedHashMap<>();
        for (int listIndex = 0; listIndex < rankedLists.size(); listIndex++) {
            List<T> list = rankedLists.get(listIndex);
            for (int rank = 0; rank < list.size(); rank++) {
                T id = list.get(rank);
                scores.merge(id, 1.0 / (k + rank + 1), Double::sum);
                final int li = listIndex;
                sources.computeIfAbsent(id, x -> new TreeSet<>()).add(li);
            }
        }
        return scores.entrySet().stream()
                .map(e -> new RankedItem<>(e.getKey(), e.getValue(), sources.get(e.getKey())))
                .sorted((a, b) -> Double.compare(b.score(), a.score()))
                .toList();
    }

    /** A fused item: the id, its RRF score, and which input lists (by index) contributed it. */
    public record RankedItem<T>(T id, double score, Set<Integer> sourceLists) {
    }
}
