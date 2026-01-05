-- ============================================================
-- Insert Exercise Videos Data
-- 插入练习视频数据到 AWS RDS
-- ============================================================

-- Insert all exercise videos (using ON CONFLICT to avoid duplicates)
INSERT INTO exercise_videos (exercise_slug, exercise_name, video_url, youtube_id, r2_key, platform, is_short, primary_category, secondary_category)
VALUES
  -- Plank
  ('plank', 'Plank', 'https://youtube.com/shorts/Pkp3SOvipZ0?si=JCVsJ3wFW-ClgtJU', 'Pkp3SOvipZ0', 'exercises/plank/Pkp3SOvipZ0.mp4', 'youtube', TRUE, 'Core', 'Shoulders'),
  ('plank', 'Plank', 'https://youtube.com/shorts/xe2MXatLTUw?si=ZBx7EbqxaAyfr0kO', 'xe2MXatLTUw', 'exercises/plank/xe2MXatLTUw.mp4', 'youtube', TRUE, 'Core', 'Shoulders'),
  
  -- Lunge
  ('lunge', 'Lunge', 'https://youtube.com/shorts/BYe4uyGF-h4?si=XNpHlrNSe1tmmvOQ', 'BYe4uyGF-h4', 'exercises/lunge/BYe4uyGF-h4.mp4', 'youtube', TRUE, 'Legs', 'Glutes'),
  
  -- Squat
  ('squat', 'Squat', 'https://youtube.com/shorts/CsPAsICeRsM?si=O6VvUfDkRMAozKph', 'CsPAsICeRsM', 'exercises/squat/CsPAsICeRsM.mp4', 'youtube', TRUE, 'Legs', 'Glutes'),
  
  -- Push up
  ('push-up', 'Push up', 'https://youtube.com/shorts/EiCjxcfBAPQ?si=Xt81UfrvAHYlr1qm', 'EiCjxcfBAPQ', 'exercises/push-up/EiCjxcfBAPQ.mp4', 'youtube', TRUE, 'Chest', 'Arms'),
  ('push-up', 'Push up', 'https://youtube.com/shorts/A2bs-JzC3Qk?si=PVjVodLHtCn6s_PV', 'A2bs-JzC3Qk', 'exercises/push-up/A2bs-JzC3Qk.mp4', 'youtube', TRUE, 'Chest', 'Arms'),
  
  -- Pectoral fly machine
  ('pectoral-fly-machine', 'Pectoral fly machine', 'https://youtube.com/shorts/fEdkcOlW8EA?si=Wwd3RKjveIHQL8xC', 'fEdkcOlW8EA', 'exercises/pectoral-fly-machine/fEdkcOlW8EA.mp4', 'youtube', TRUE, 'Chest', 'Shoulders'),
  ('pectoral-fly-machine', 'Pectoral fly machine', 'https://youtube.com/shorts/qTxF0PhK294?si=7jRKhGGMG7koLd1C', 'qTxF0PhK294', 'exercises/pectoral-fly-machine/qTxF0PhK294.mp4', 'youtube', TRUE, 'Chest', 'Shoulders'),
  ('pectoral-fly-machine', 'Pectoral fly machine', 'https://youtube.com/shorts/u3KFH5s3Iyo?si=s50B4OjD8ziyyPt2', 'u3KFH5s3Iyo', 'exercises/pectoral-fly-machine/u3KFH5s3Iyo.mp4', 'youtube', TRUE, 'Chest', 'Shoulders'),
  
  -- Lateral raise
  ('lateral-raise', 'Lateral raise', 'https://youtube.com/shorts/U2gMn8GXr2A?si=kObd5mWHHqOGVV0g', 'U2gMn8GXr2A', 'exercises/lateral-raise/U2gMn8GXr2A.mp4', 'youtube', TRUE, 'Shoulders', NULL),
  ('lateral-raise', 'Lateral raise', 'https://youtube.com/shorts/G-piLwLu0d4?si=KsaIatLIEW3LcEsN', 'G-piLwLu0d4', 'exercises/lateral-raise/G-piLwLu0d4.mp4', 'youtube', TRUE, 'Shoulders', NULL),
  ('lateral-raise', 'Lateral raise', 'https://youtube.com/shorts/lMJUXEvcMkQ?si=hFxkBqp0UUQ8G4Oq', 'lMJUXEvcMkQ', 'exercises/lateral-raise/lMJUXEvcMkQ.mp4', 'youtube', TRUE, 'Shoulders', NULL),
  
  -- Abductor
  ('abductor', 'Abductor', 'https://youtube.com/shorts/QSsTDz32y_w?si=SwFgEfBD9Pi1ztVe', 'QSsTDz32y_w', 'exercises/abductor/QSsTDz32y_w.mp4', 'youtube', TRUE, 'Glutes', 'Legs'),
  
  -- Dip assist
  ('dip-assist', 'Dip assist', 'https://youtube.com/shorts/s57YI3rmc5Q?si=LVxdJwgkofIRH08S', 's57YI3rmc5Q', 'exercises/dip-assist/s57YI3rmc5Q.mp4', 'youtube', TRUE, 'Arms', 'Chest'),
  
  -- Chin assist
  ('chin-assist', 'Chin assist', 'https://youtube.com/shorts/75tpN6zeR8U?si=vh3MEwXaaeNsG_5K', '75tpN6zeR8U', 'exercises/chin-assist/75tpN6zeR8U.mp4', 'youtube', TRUE, 'Back', 'Arms'),
  
  -- Shoulder press
  ('shoulder-press', 'Shoulder press', 'https://youtube.com/shorts/6v4nrRVySj0?si=i538YqL0U48I9cQ_', '6v4nrRVySj0', 'exercises/shoulder-press/6v4nrRVySj0.mp4', 'youtube', TRUE, 'Shoulders', 'Arms'),
  ('shoulder-press', 'Shoulder press', 'https://youtube.com/shorts/BGlB8hN-4CI?si=SDx6cwGeUxOE25ve', 'BGlB8hN-4CI', 'exercises/shoulder-press/BGlB8hN-4CI.mp4', 'youtube', TRUE, 'Shoulders', 'Arms'),
  
  -- Ab crunch
  ('ab-crunch', 'Ab crunch', 'https://youtube.com/shorts/b6ONE9Rfgl8?si=Bvw9RNoIvAlSGdxx', 'b6ONE9Rfgl8', 'exercises/ab-crunch/b6ONE9Rfgl8.mp4', 'youtube', TRUE, 'Core', NULL),
  
  -- Leg curl
  ('leg-curl', 'Leg curl', 'https://youtube.com/shorts/iQ92TuvBqRo?si=ltZJUXN5RawP3akC', 'iQ92TuvBqRo', 'exercises/leg-curl/iQ92TuvBqRo.mp4', 'youtube', TRUE, 'Legs', 'Glutes'),
  
  -- Leg extension
  ('leg-extension', 'Leg extension', 'https://youtube.com/shorts/ZgmufzNpEPk?si=uugqSAOvvgaeTVep', 'ZgmufzNpEPk', 'exercises/leg-extension/ZgmufzNpEPk.mp4', 'youtube', TRUE, 'Legs', NULL),
  
  -- Chest press
  ('chest-press', 'Chest press', 'https://youtube.com/shorts/2awX3rTGa1k?si=JB1vE7Ur1keYd2QW', '2awX3rTGa1k', 'exercises/chest-press/2awX3rTGa1k.mp4', 'youtube', TRUE, 'Chest', 'Arms'),
  ('chest-press', 'Chest press', 'https://youtube.com/shorts/YXjhMV7uz4c?si=s6LK138s_uv3Hw1_', 'YXjhMV7uz4c', 'exercises/chest-press/YXjhMV7uz4c.mp4', 'youtube', TRUE, 'Chest', 'Arms'),
  
  -- Dumbbell chest press
  ('dumbbell-chest-press', 'Dumbbell chest press', 'https://youtube.com/shorts/Cj96ZZlmJRU?si=eUPK7RALRyRnvxJG', 'Cj96ZZlmJRU', 'exercises/dumbbell-chest-press/Cj96ZZlmJRU.mp4', 'youtube', TRUE, 'Chest', 'Arms'),
  
  -- Linear leg press
  ('linear-leg-press', 'Linear leg press', 'https://youtube.com/shorts/BnacvXdaxq8?si=SM42LQyOuFWaYKvW', 'BnacvXdaxq8', 'exercises/linear-leg-press/BnacvXdaxq8.mp4', 'youtube', TRUE, 'Legs', 'Glutes'),
  
  -- Dual pulley pulldown
  ('dual-pulley-pulldown', 'Dual pulley pulldown', 'https://youtube.com/shorts/9GEzZkSHHYI?si=WXz0hRW0cKsAhIeR', '9GEzZkSHHYI', 'exercises/dual-pulley-pulldown/9GEzZkSHHYI.mp4', 'youtube', TRUE, 'Back', 'Arms'),
  ('dual-pulley-pulldown', 'Dual pulley pulldown', 'https://youtube.com/shorts/ZwF1N_dOlus?si=Kl-Jwkv3x-pY_f7Q', 'ZwF1N_dOlus', 'exercises/dual-pulley-pulldown/ZwF1N_dOlus.mp4', 'youtube', TRUE, 'Back', 'Arms'),
  
  -- Seated row
  ('seated-row', 'Seated row', 'https://youtube.com/shorts/DHA7QGDa2qg?si=8uqJQei6fMRY6wYx', 'DHA7QGDa2qg', 'exercises/seated-row/DHA7QGDa2qg.mp4', 'youtube', TRUE, 'Back', 'Arms'),
  ('seated-row', 'Seated row', 'https://youtube.com/shorts/qD1WZ5pSuvk?si=qMnPL-toCHSzuhYx', 'qD1WZ5pSuvk', 'exercises/seated-row/qD1WZ5pSuvk.mp4', 'youtube', TRUE, 'Back', 'Arms'),
  
  -- Dual adjustable pulley
  ('dual-adjustable-pulley', 'Dual adjustable pulley', 'https://youtube.com/shorts/em0ITdNJng4?si=5XIq42coP6y1r_hd', 'em0ITdNJng4', 'exercises/dual-adjustable-pulley/em0ITdNJng4.mp4', 'youtube', TRUE, 'Back', 'Arms'),
  
  -- Triceps extension
  ('triceps-extension', 'Triceps extension', 'https://youtube.com/shorts/4NWWB0f0vzQ?si=r4DsiwgmrNYId726', '4NWWB0f0vzQ', 'exercises/triceps-extension/4NWWB0f0vzQ.mp4', 'youtube', TRUE, 'Arms', NULL),
  
  -- Arm curl
  ('arm-curl', 'Arm curl', 'https://youtube.com/shorts/j1FjaWu5Am4?si=I0fZnRMbGDgr9Wfw', 'j1FjaWu5Am4', 'exercises/arm-curl/j1FjaWu5Am4.mp4', 'youtube', TRUE, 'Arms', NULL)

ON CONFLICT (youtube_id) DO UPDATE SET
  exercise_name = EXCLUDED.exercise_name,
  video_url = EXCLUDED.video_url,
  primary_category = EXCLUDED.primary_category,
  secondary_category = EXCLUDED.secondary_category,
  updated_at = NOW();

-- Display inserted count
SELECT 
  COUNT(*) as total_videos,
  COUNT(DISTINCT exercise_slug) as unique_exercises,
  primary_category,
  COUNT(*) as videos_per_category
FROM exercise_videos
GROUP BY primary_category
ORDER BY primary_category;
