package com.fitnessapp.backend.recommendation.hybrid;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.fitnessapp.backend.recommendation.hybrid.ReciprocalRankFusion.RankedItem;

/** Offline correctness/eval checks for the RRF fusion used by the hybrid recommender. */
class ReciprocalRankFusionTest {

    @Test
    void itemInBothListsOutranksItemInOnlyOne() {
        List<String> content = List.of("a", "b", "c");
        List<String> social = List.of("b", "d");

        List<RankedItem<String>> fused = ReciprocalRankFusion.fuse(List.of(content, social));

        // "b" appears in both lists, so it must rank first.
        assertThat(fused.get(0).id()).isEqualTo("b");
        assertThat(fused.get(0).sourceLists()).containsExactlyInAnyOrder(0, 1);
    }

    @Test
    void higherRankedSingleListItemBeatsLowerRanked() {
        List<RankedItem<String>> fused =
                ReciprocalRankFusion.fuse(List.of(List.of("x", "y", "z")));
        assertThat(fused.stream().map(RankedItem::id)).containsExactly("x", "y", "z");
    }

    @Test
    void fusionRecallCoversUnionOfInputs() {
        List<RankedItem<String>> fused =
                ReciprocalRankFusion.fuse(List.of(List.of("a", "b"), List.of("c", "d")));
        assertThat(fused.stream().map(RankedItem::id))
                .containsExactlyInAnyOrder("a", "b", "c", "d");
    }

    @Test
    void emptyListsProduceEmptyResult() {
        assertThat(ReciprocalRankFusion.fuse(List.of(List.<String>of(), List.<String>of()))).isEmpty();
    }
}
