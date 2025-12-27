-- V29: Loosen exercise_videos category constraints to avoid data loss
-- Context: V28 reintroduced a narrow whitelist. This migration removes the whitelist
-- and only enforces non-empty categories, allowing real-world values while still
-- preventing empty strings.

-- 1) Drop the strict category constraints added previously (names may vary by DB)
ALTER TABLE exercise_videos DROP CONSTRAINT IF EXISTS exercise_videos_primary_category_check;
ALTER TABLE exercise_videos DROP CONSTRAINT IF EXISTS exercise_videos_secondary_category_check;

-- 2) Add permissive checks: require non-empty primary_category; allow any non-empty
--    secondary_category or NULL. No enumerated whitelist to avoid blocking imports.
ALTER TABLE exercise_videos
    ADD CONSTRAINT exercise_videos_primary_category_check
    CHECK (
        primary_category IS NOT NULL
        AND length(trim(primary_category)) > 0
    );

ALTER TABLE exercise_videos
    ADD CONSTRAINT exercise_videos_secondary_category_check
    CHECK (
        secondary_category IS NULL
        OR length(trim(secondary_category)) > 0
    );
