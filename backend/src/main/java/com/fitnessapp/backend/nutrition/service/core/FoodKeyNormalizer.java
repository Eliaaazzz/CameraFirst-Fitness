package com.fitnessapp.backend.nutrition.service.core;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

/**
 * Service for normalizing food keys from AI recognition results.
 * Handles text normalization, common variations, and synonym mapping.
 */
@Slf4j
@Service
public class FoodKeyNormalizer {

    // Pattern to remove non-alphanumeric characters (except underscores and Chinese)
    private static final Pattern NON_WORD_PATTERN = Pattern.compile("[^a-z0-9_\\u4e00-\\u9fff]");
    
    // Pattern to collapse multiple underscores
    private static final Pattern MULTI_UNDERSCORE_PATTERN = Pattern.compile("_+");
    
    // Pattern to remove diacritics
    private static final Pattern DIACRITICS_PATTERN = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    // Common word variations and corrections
    private static final Map<String, String> WORD_CORRECTIONS = new HashMap<>();
    
    // Common phrase mappings (multi-word to canonical)
    private static final Map<String, String> PHRASE_MAPPINGS = new HashMap<>();

    static {
        // Common spelling variations and typos
        WORD_CORRECTIONS.put("vegatable", "vegetable");
        WORD_CORRECTIONS.put("vegatables", "vegetables");
        WORD_CORRECTIONS.put("veggie", "vegetable");
        WORD_CORRECTIONS.put("veggies", "vegetables");
        WORD_CORRECTIONS.put("chiken", "chicken");
        WORD_CORRECTIONS.put("chickin", "chicken");
        WORD_CORRECTIONS.put("beaf", "beef");
        WORD_CORRECTIONS.put("stake", "steak");
        WORD_CORRECTIONS.put("scrambed", "scrambled");
        WORD_CORRECTIONS.put("boild", "boiled");
        WORD_CORRECTIONS.put("friedrice", "fried_rice");
        WORD_CORRECTIONS.put("steamedrice", "steamed_rice");
        WORD_CORRECTIONS.put("whitrice", "steamed_rice");
        WORD_CORRECTIONS.put("stirfry", "stir_fry");
        WORD_CORRECTIONS.put("stirfried", "stir_fried");
        
        // Singular/plural normalization
        WORD_CORRECTIONS.put("eggs", "egg");
        WORD_CORRECTIONS.put("noodle", "noodles");
        WORD_CORRECTIONS.put("dumpling", "dumplings");
        WORD_CORRECTIONS.put("vegetables", "vegetable");
        
        // Common phrase mappings
        PHRASE_MAPPINGS.put("white rice", "steamed_rice");
        PHRASE_MAPPINGS.put("plain rice", "steamed_rice");
        PHRASE_MAPPINGS.put("cooked rice", "steamed_rice");
        PHRASE_MAPPINGS.put("bowl of rice", "steamed_rice");
        PHRASE_MAPPINGS.put("egg fried rice", "fried_rice");
        PHRASE_MAPPINGS.put("yangzhou fried rice", "fried_rice");
        PHRASE_MAPPINGS.put("stir fry vegetables", "stir_fried_vegetables");
        PHRASE_MAPPINGS.put("stir fried vegetables", "stir_fried_vegetables");
        PHRASE_MAPPINGS.put("mixed vegetables", "stir_fried_vegetables");
        PHRASE_MAPPINGS.put("sauteed vegetables", "stir_fried_vegetables");
        PHRASE_MAPPINGS.put("hard boiled egg", "boiled_egg");
        PHRASE_MAPPINGS.put("soft boiled egg", "boiled_egg");
        PHRASE_MAPPINGS.put("sunny side up", "fried_egg");
        PHRASE_MAPPINGS.put("over easy", "fried_egg");
        PHRASE_MAPPINGS.put("tomato and egg", "tomato_egg");
        PHRASE_MAPPINGS.put("egg and tomato", "tomato_egg");
        PHRASE_MAPPINGS.put("scrambled eggs", "scrambled_egg");
        PHRASE_MAPPINGS.put("grilled chicken", "chicken_breast");
        PHRASE_MAPPINGS.put("chicken fillet", "chicken_breast");
        PHRASE_MAPPINGS.put("pan fried chicken", "chicken_breast");
        PHRASE_MAPPINGS.put("braised pork belly", "braised_pork");
        PHRASE_MAPPINGS.put("red cooked pork", "braised_pork");
        PHRASE_MAPPINGS.put("dongpo pork", "braised_pork");
        PHRASE_MAPPINGS.put("pork belly", "braised_pork");
        PHRASE_MAPPINGS.put("beef stir fry", "beef_stir_fry");
        PHRASE_MAPPINGS.put("stir fried beef", "beef_stir_fry");
        PHRASE_MAPPINGS.put("mapo doufu", "mapo_tofu");
        PHRASE_MAPPINGS.put("ma po tofu", "mapo_tofu");
        PHRASE_MAPPINGS.put("kung pao chicken", "kung_pao_chicken");
        PHRASE_MAPPINGS.put("gong bao chicken", "kung_pao_chicken");
        PHRASE_MAPPINGS.put("steamed dumpling", "dumpling");
        PHRASE_MAPPINGS.put("pot sticker", "dumpling");
        PHRASE_MAPPINGS.put("jiaozi", "dumpling");
        PHRASE_MAPPINGS.put("gyoza", "dumpling");
        PHRASE_MAPPINGS.put("baozi", "steamed_bun");
        PHRASE_MAPPINGS.put("bao", "steamed_bun");
        PHRASE_MAPPINGS.put("char siu bao", "steamed_bun");
        
        // Chinese phrase mappings
        PHRASE_MAPPINGS.put("番茄炒蛋", "tomato_egg");
        PHRASE_MAPPINGS.put("西红柿炒蛋", "tomato_egg");
        PHRASE_MAPPINGS.put("红烧肉", "braised_pork");
        PHRASE_MAPPINGS.put("东坡肉", "braised_pork");
        PHRASE_MAPPINGS.put("宫保鸡丁", "kung_pao_chicken");
        PHRASE_MAPPINGS.put("宫爆鸡丁", "kung_pao_chicken");
        PHRASE_MAPPINGS.put("麻婆豆腐", "mapo_tofu");
        PHRASE_MAPPINGS.put("蛋炒饭", "fried_rice");
        PHRASE_MAPPINGS.put("扬州炒饭", "fried_rice");
        PHRASE_MAPPINGS.put("白米饭", "steamed_rice");
        PHRASE_MAPPINGS.put("米饭", "steamed_rice");
        PHRASE_MAPPINGS.put("白饭", "steamed_rice");
    }

    /**
     * Normalize a food key from AI recognition.
     * 
     * @param rawKey The raw food key from AI
     * @return Normalized canonical food key
     */
    public String normalize(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            return "unknown";
        }

        String key = rawKey.trim();
        log.debug("Normalizing food key: '{}'", key);

        // Step 1: Check phrase mappings first (before any transformation)
        String lowercaseKey = key.toLowerCase();
        if (PHRASE_MAPPINGS.containsKey(lowercaseKey)) {
            String mapped = PHRASE_MAPPINGS.get(lowercaseKey);
            log.debug("Phrase mapping found: '{}' -> '{}'", key, mapped);
            return mapped;
        }

        // Step 2: Basic normalization
        key = normalizeBasic(key);

        // Step 3: Check phrase mappings again after basic normalization
        if (PHRASE_MAPPINGS.containsKey(key.replace("_", " "))) {
            String mapped = PHRASE_MAPPINGS.get(key.replace("_", " "));
            log.debug("Phrase mapping found after normalization: '{}' -> '{}'", key, mapped);
            return mapped;
        }

        // Step 4: Apply word corrections
        key = applyWordCorrections(key);

        // Step 5: Final cleanup
        key = finalCleanup(key);

        log.debug("Final normalized key: '{}'", key);
        return key;
    }

    /**
     * Basic text normalization:
     * - Lowercase
     * - Remove diacritics
     * - Replace spaces with underscores
     * - Remove special characters
     */
    private String normalizeBasic(String key) {
        // Lowercase
        key = key.toLowerCase();

        // Remove diacritics (é -> e, etc.)
        key = Normalizer.normalize(key, Normalizer.Form.NFD);
        key = DIACRITICS_PATTERN.matcher(key).replaceAll("");

        // Replace spaces and hyphens with underscores
        key = key.replace(' ', '_').replace('-', '_');

        // Remove non-word characters (keep alphanumeric, underscore, Chinese)
        key = NON_WORD_PATTERN.matcher(key).replaceAll("");

        // Collapse multiple underscores
        key = MULTI_UNDERSCORE_PATTERN.matcher(key).replaceAll("_");

        // Trim underscores from start/end
        key = key.replaceAll("^_+|_+$", "");

        return key;
    }

    /**
     * Apply word-level corrections for common misspellings and variations
     */
    private String applyWordCorrections(String key) {
        // Check if entire key matches a correction
        if (WORD_CORRECTIONS.containsKey(key)) {
            return WORD_CORRECTIONS.get(key);
        }

        // Apply word-by-word corrections
        String[] parts = key.split("_");
        StringBuilder corrected = new StringBuilder();
        
        for (int i = 0; i < parts.length; i++) {
            String part = parts[i];
            if (WORD_CORRECTIONS.containsKey(part)) {
                part = WORD_CORRECTIONS.get(part);
            }
            if (i > 0) {
                corrected.append("_");
            }
            corrected.append(part);
        }

        return corrected.toString();
    }

    /**
     * Final cleanup and standardization
     */
    private String finalCleanup(String key) {
        // Remove common filler words
        key = key.replaceAll("_(with|and|of|the|a|an)_", "_");
        key = key.replaceAll("^(with|and|of|the|a|an)_", "");
        key = key.replaceAll("_(with|and|of|the|a|an)$", "");

        // Collapse multiple underscores again
        key = MULTI_UNDERSCORE_PATTERN.matcher(key).replaceAll("_");

        // Ensure not empty
        if (key.isBlank()) {
            return "unknown";
        }

        return key;
    }

    /**
     * Calculate similarity between two food keys using Levenshtein distance
     * 
     * @return Similarity score between 0.0 and 1.0
     */
    public double calculateSimilarity(String key1, String key2) {
        if (key1 == null || key2 == null) {
            return 0.0;
        }
        
        String normalized1 = normalize(key1);
        String normalized2 = normalize(key2);
        
        if (normalized1.equals(normalized2)) {
            return 1.0;
        }

        int distance = levenshteinDistance(normalized1, normalized2);
        int maxLength = Math.max(normalized1.length(), normalized2.length());
        
        if (maxLength == 0) {
            return 1.0;
        }
        
        return 1.0 - ((double) distance / maxLength);
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private int levenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];

        for (int i = 0; i <= s1.length(); i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= s2.length(); j++) {
            dp[0][j] = j;
        }

        for (int i = 1; i <= s1.length(); i++) {
            for (int j = 1; j <= s2.length(); j++) {
                int cost = s1.charAt(i - 1) == s2.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(
                    Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                    dp[i - 1][j - 1] + cost
                );
            }
        }

        return dp[s1.length()][s2.length()];
    }

    /**
     * Check if a food key matches a pattern with wildcards
     * 
     * @param key The food key
     * @param pattern Pattern with * wildcards
     * @return true if matches
     */
    public boolean matchesPattern(String key, String pattern) {
        String normalizedKey = normalize(key);
        String regexPattern = pattern.toLowerCase()
            .replace(".", "\\.")
            .replace("*", ".*")
            .replace("?", ".");
        return normalizedKey.matches(regexPattern);
    }
}
