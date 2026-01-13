-- V37: Import new exercise videos (YouTube Shorts)
-- Categories: HIIT, Yoga, Arms, Abs, Cardio, Stretch, Strength

INSERT INTO exercise_videos (id, exercise_slug, exercise_name, video_url, youtube_id, r2_key, platform, is_short, primary_category, secondary_category, thumbnail_url, created_at, updated_at)
VALUES
    -- HIIT
    (gen_random_uuid(), 'hiit-workout-1', 'HIIT Workout', 'https://www.youtube.com/shorts/Jx3KMqQFCXA', 'Jx3KMqQFCXA', 'exercise-videos/Jx3KMqQFCXA', 'youtube', true, 'HIIT', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- Yoga
    (gen_random_uuid(), 'yoga-flow-1', 'Yoga Flow', 'https://www.youtube.com/shorts/A6GKZCbvkrc', 'A6GKZCbvkrc', 'exercise-videos/A6GKZCbvkrc', 'youtube', true, 'Yoga', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'yoga-stretch-1', 'Yoga Stretch', 'https://www.youtube.com/shorts/vsn1cHLAzjY', 'vsn1cHLAzjY', 'exercise-videos/vsn1cHLAzjY', 'youtube', true, 'Yoga', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- Arms
    (gen_random_uuid(), 'arm-workout-1', 'Arm Workout', 'https://www.youtube.com/shorts/YEyFdtni3uU', 'YEyFdtni3uU', 'exercise-videos/YEyFdtni3uU', 'youtube', true, 'Arms', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'arm-workout-2', 'Arm Workout', 'https://www.youtube.com/shorts/TZd5Yi7Ic6s', 'TZd5Yi7Ic6s', 'exercise-videos/TZd5Yi7Ic6s', 'youtube', true, 'Arms', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- Abs
    (gen_random_uuid(), 'abs-workout-1', 'Abs Workout', 'https://www.youtube.com/shorts/pWxTXqZNTFw', 'pWxTXqZNTFw', 'exercise-videos/pWxTXqZNTFw', 'youtube', true, 'Abs', 'Core', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'abs-workout-2', 'Abs Workout', 'https://www.youtube.com/shorts/3xrjK4922wA', '3xrjK4922wA', 'exercise-videos/3xrjK4922wA', 'youtube', true, 'Abs', 'Core', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'abs-workout-3', 'Abs Workout', 'https://www.youtube.com/shorts/c6PafU0XbmA', 'c6PafU0XbmA', 'exercise-videos/c6PafU0XbmA', 'youtube', true, 'Abs', 'Core', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- Cardio
    (gen_random_uuid(), 'cardio-workout-1', 'Cardio Workout', 'https://www.youtube.com/shorts/nbNYJ1l8Iik', 'nbNYJ1l8Iik', 'exercise-videos/nbNYJ1l8Iik', 'youtube', true, 'Cardio', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'cardio-workout-2', 'Cardio Workout', 'https://www.youtube.com/shorts/sWUgK8FrEHg', 'sWUgK8FrEHg', 'exercise-videos/sWUgK8FrEHg', 'youtube', true, 'Cardio', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- Stretch
    (gen_random_uuid(), 'stretch-routine-1', 'Stretch Routine', 'https://www.youtube.com/shorts/kSPS_HIQv8E', 'kSPS_HIQv8E', 'exercise-videos/kSPS_HIQv8E', 'youtube', true, 'Stretch', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'stretch-routine-2', 'Stretch Routine', 'https://www.youtube.com/shorts/-avWRzrrH-o', '-avWRzrrH-o', 'exercise-videos/-avWRzrrH-o', 'youtube', true, 'Stretch', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- Strength
    (gen_random_uuid(), 'strength-training-1', 'Strength Training', 'https://www.youtube.com/shorts/9m08mfPZu_0', '9m08mfPZu_0', 'exercise-videos/9m08mfPZu_0', 'youtube', true, 'Strength', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'strength-training-2', 'Strength Training', 'https://www.youtube.com/shorts/o_AhdsD03qo', 'o_AhdsD03qo', 'exercise-videos/o_AhdsD03qo', 'youtube', true, 'Strength', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)

ON CONFLICT (youtube_id) DO NOTHING;
