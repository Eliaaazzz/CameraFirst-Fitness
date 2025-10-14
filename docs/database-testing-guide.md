# Database Testing Guide
**Date:** October 14, 2025  
**Database:** PostgreSQL 16 with Flyway migrations

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [Verify Sample Data](#verify-sample-data)
3. [Test Indexes](#test-indexes)
4. [Test Query Performance](#test-query-performance)
5. [Common Operations](#common-operations)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Start Docker Containers
```bash
# Start all services (PostgreSQL, Redis, app)
docker compose up -d

# Check if containers are running
docker compose ps

# View logs
docker compose logs -f postgres
```

### 2. Connect to Database
```bash
# Method 1: Using docker compose exec (recommended)
docker compose exec postgres psql -U fitnessuser -d fitness_mvp

# Method 2: Using psql directly (if installed locally)
psql -h localhost -p 5432 -U fitnessuser -d fitness_mvp
# Password: fitness123
```

### 3. Quick Health Check
```sql
-- Check Flyway migration status
SELECT * FROM flyway_schema_history ORDER BY installed_rank;

-- Count all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Quick row counts
SELECT 
    'users' as table_name, COUNT(*) as rows FROM users
UNION ALL
SELECT 'workout_video', COUNT(*) FROM workout_video
UNION ALL
SELECT 'recipe', COUNT(*) FROM recipe
UNION ALL
SELECT 'ingredient', COUNT(*) FROM ingredient
UNION ALL
SELECT 'recipe_ingredient', COUNT(*) FROM recipe_ingredient
UNION ALL
SELECT 'image_query', COUNT(*) FROM image_query
UNION ALL
SELECT 'retrieval_result', COUNT(*) FROM retrieval_result
UNION ALL
SELECT 'user_saved_workout', COUNT(*) FROM user_saved_workout
UNION ALL
SELECT 'user_saved_recipe', COUNT(*) FROM user_saved_recipe
UNION ALL
SELECT 'feedback', COUNT(*) FROM feedback;
```

**Expected Output:**
```
table_name           | rows
---------------------|------
users                | 2
workout_video        | 5
recipe               | 5
ingredient           | 6
recipe_ingredient    | 15
image_query          | 6
retrieval_result     | 18
user_saved_workout   | 4
user_saved_recipe    | 4
feedback             | 6
```

---

## Verify Sample Data

### Check Users
```sql
-- View all users
SELECT id, email, display_name, created_at 
FROM users 
ORDER BY created_at;
```

**Expected:** 2 users (John Doe, Jane Smith)

---

### Check Workout Videos
```sql
-- View all workouts with key fields
SELECT 
    title,
    level,
    duration_minutes,
    equipment,
    body_part,
    view_count
FROM workout_video
ORDER BY title;
```

**Expected:** 5 workouts (Full Body HIIT, Upper Body Strength, Cardio Blast, Yoga Flow, Core Crusher)

---

### Check Recipes
```sql
-- View all recipes with key fields
SELECT 
    title,
    difficulty,
    time_minutes,
    servings,
    calories_per_serving
FROM recipe
ORDER BY title;
```

**Expected:** 5 recipes (Chicken Stir Fry, Protein Smoothie, Grilled Salmon, Quinoa Buddha Bowl, Greek Salad)

---

### Check Ingredients
```sql
-- View all ingredients
SELECT name, category 
FROM ingredient 
ORDER BY category, name;
```

**Expected:** 6 ingredients (chicken breast, spinach, quinoa, salmon, feta cheese, greek yogurt)

---

### Check Recipe Ingredients Relationships
```sql
-- See which ingredients are in which recipes
SELECT 
    r.title AS recipe,
    i.name AS ingredient,
    ri.quantity,
    ri.unit
FROM recipe r
JOIN recipe_ingredient ri ON r.id = ri.recipe_id
JOIN ingredient i ON ri.ingredient_id = i.id
ORDER BY r.title, i.name;
```

**Expected:** 15 relationships (3 ingredients per recipe)

---

### Check Image Queries
```sql
-- View all user queries
SELECT 
    type,
    detected_hints,
    context,
    created_at
FROM image_query
ORDER BY created_at;
```

**Expected:** 6 queries (3 recipe queries, 3 workout queries)

---

### Check Retrieval Results
```sql
-- See what results were returned for each query
SELECT 
    iq.type AS query_type,
    iq.detected_hints,
    rr.item_type,
    CASE 
        WHEN rr.item_type = 'recipe' THEN r.title
        WHEN rr.item_type = 'workout_video' THEN w.title
    END AS item_title,
    rr.rank,
    rr.score
FROM retrieval_result rr
JOIN image_query iq ON rr.query_id = iq.id
LEFT JOIN recipe r ON rr.item_type = 'recipe' AND rr.item_id = r.id
LEFT JOIN workout_video w ON rr.item_type = 'workout_video' AND rr.item_id = w.id
ORDER BY iq.created_at, rr.rank;
```

**Expected:** 18 results (6 queries × 3 results each)

---

### Check User Saved Content
```sql
-- View what content users have saved
SELECT 
    u.display_name,
    'workout' AS type,
    w.title,
    usw.created_at
FROM user_saved_workout usw
JOIN users u ON usw.user_id = u.id
JOIN workout_video w ON usw.workout_id = w.id
UNION ALL
SELECT 
    u.display_name,
    'recipe' AS type,
    r.title,
    usr.created_at
FROM user_saved_recipe usr
JOIN users u ON usr.user_id = u.id
JOIN recipe r ON usr.recipe_id = r.id
ORDER BY created_at;
```

**Expected:** 8 saved items (4 workouts + 4 recipes)

---

### Check Feedback
```sql
-- View all user feedback
SELECT 
    u.display_name,
    f.item_type,
    CASE 
        WHEN f.item_type = 'recipe' THEN r.title
        WHEN f.item_type = 'workout_video' THEN w.title
    END AS item_title,
    f.rating,
    f.comment
FROM feedback f
JOIN users u ON f.user_id = u.id
LEFT JOIN recipe r ON f.item_type = 'recipe' AND f.item_id = r.id
LEFT JOIN workout_video w ON f.item_type = 'workout_video' AND f.item_id = w.id
ORDER BY f.created_at;
```

**Expected:** 6 feedback entries (mix of 4-5 star ratings)

---

## Test Indexes

### List All Indexes
```sql
-- View all indexes in the database
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Expected:** 20 indexes total (plus automatic PK indexes)

---

### Verify Specific Indexes Exist
```sql
-- Check critical indexes
SELECT 
    tablename, 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_ingredient_name_trgm',           -- Fuzzy search
    'idx_recipe_ingredient_ingredient',   -- Reverse lookup
    'idx_image_query_hints',              -- JSONB search
    'idx_workout_level',                  -- Filter
    'idx_recipe_difficulty'               -- Filter
);
```

**Expected:** All 5 indexes should be present

---

### Test Index Usage with EXPLAIN
```sql
-- Test 1: Fuzzy ingredient search (should use trigram index)
EXPLAIN ANALYZE
SELECT * FROM ingredient
WHERE name % 'chicken';

-- Look for: "Index Scan using idx_ingredient_name_trgm"
```

```sql
-- Test 2: Reverse recipe lookup (should use ingredient index)
EXPLAIN ANALYZE
SELECT r.title 
FROM recipe r
JOIN recipe_ingredient ri ON r.id = ri.recipe_id
WHERE ri.ingredient_id = (SELECT id FROM ingredient WHERE name = 'chicken breast' LIMIT 1);

-- Look for: "Index Scan using idx_recipe_ingredient_ingredient"
```

```sql
-- Test 3: JSONB containment (should use GIN index)
EXPLAIN ANALYZE
SELECT * FROM image_query
WHERE detected_hints @> '["chicken"]'::jsonb;

-- Look for: "Bitmap Index Scan on idx_image_query_hints"
```

```sql
-- Test 4: Filter by level (should use B-tree index)
EXPLAIN ANALYZE
SELECT * FROM workout_video
WHERE level = 'beginner';

-- Look for: "Index Scan using idx_workout_level"
```

---

## Test Query Performance

### Test 1: Photo → Recipe Recommendations (Most Critical)
```sql
-- Simulate: User uploads photo of chicken and spinach
EXPLAIN ANALYZE
WITH detected_hints AS (
    SELECT jsonb_array_elements_text('["chicken", "spinach"]'::jsonb) AS hint
),
matched_ingredients AS (
    SELECT DISTINCT i.id, i.name, 
           MAX(similarity(i.name, dh.hint)) as score
    FROM ingredient i, detected_hints dh
    WHERE i.name % dh.hint  -- Trigram similarity
    GROUP BY i.id, i.name
    HAVING MAX(similarity(i.name, dh.hint)) > 0.3
)
SELECT 
    r.id, 
    r.title, 
    r.difficulty,
    r.time_minutes,
    COUNT(*) as matched_ingredient_count,
    AVG(mi.score) as avg_confidence
FROM recipe r
JOIN recipe_ingredient ri ON r.id = ri.recipe_id
JOIN matched_ingredients mi ON ri.ingredient_id = mi.id
GROUP BY r.id, r.title, r.difficulty, r.time_minutes
ORDER BY matched_ingredient_count DESC, avg_confidence DESC
LIMIT 5;
```

**Expected Results:** Should return "Chicken Stir Fry" as top match (contains both chicken and spinach)

**Performance Target:** < 50ms on 10k recipes

---

### Test 2: Workout Recommendations
```sql
-- Simulate: User wants beginner workouts under 30 minutes with dumbbells
EXPLAIN ANALYZE
SELECT 
    w.title,
    w.level,
    w.duration_minutes,
    w.equipment,
    w.view_count
FROM workout_video w
WHERE w.level = 'beginner'
  AND w.duration_minutes <= 30
  AND w.equipment && ARRAY['dumbbells']::text[]  -- Array overlap operator
ORDER BY w.view_count DESC
LIMIT 10;
```

**Expected Results:** Should return "Full Body HIIT" and other beginner workouts

**Performance Target:** < 20ms

---

### Test 3: User Query History
```sql
-- Simulate: Get user's recent queries (paginated)
EXPLAIN ANALYZE
SELECT 
    iq.type,
    iq.detected_hints,
    iq.context,
    iq.created_at,
    COUNT(rr.id) as result_count
FROM image_query iq
LEFT JOIN retrieval_result rr ON iq.id = rr.query_id
WHERE iq.user_id = (SELECT id FROM users WHERE email = 'john@example.com' LIMIT 1)
GROUP BY iq.id, iq.type, iq.detected_hints, iq.context, iq.created_at
ORDER BY iq.created_at DESC
LIMIT 20 OFFSET 0;
```

**Performance Target:** < 30ms

---

### Test 4: Recipe Analytics
```sql
-- Simulate: Which queries recommended a specific recipe?
EXPLAIN ANALYZE
SELECT 
    iq.id,
    iq.detected_hints,
    iq.created_at,
    rr.rank,
    rr.score
FROM retrieval_result rr
JOIN image_query iq ON rr.query_id = iq.id
WHERE rr.item_type = 'recipe'
  AND rr.item_id = (SELECT id FROM recipe WHERE title = 'Chicken Stir Fry' LIMIT 1)
ORDER BY rr.created_at DESC;
```

**Performance Target:** < 25ms (should use idx_retrieval_result_item)

---

### Test 5: Average Recipe Ratings
```sql
-- Simulate: Calculate average rating for each recipe
EXPLAIN ANALYZE
SELECT 
    r.title,
    COUNT(f.id) as review_count,
    AVG(f.rating) as avg_rating
FROM recipe r
LEFT JOIN feedback f ON r.id = f.item_id AND f.item_type = 'recipe'
GROUP BY r.id, r.title
HAVING COUNT(f.id) > 0
ORDER BY avg_rating DESC, review_count DESC;
```

**Performance Target:** < 40ms

---

## Common Operations

### Insert New Data

#### Add a New User
```sql
INSERT INTO users (email, password_hash, display_name)
VALUES (
    'test@example.com',
    'hashed_password_here',  -- In production, use bcrypt
    'Test User'
);
```

#### Add a New Recipe
```sql
-- Step 1: Insert recipe
INSERT INTO recipe (
    title, description, difficulty, time_minutes, 
    servings, calories_per_serving, steps
)
VALUES (
    'Test Recipe',
    'A delicious test recipe',
    'easy',
    20,
    2,
    350,
    '["Step 1: Prepare ingredients", "Step 2: Cook", "Step 3: Serve"]'::jsonb
)
RETURNING id;  -- Save this ID for next step

-- Step 2: Link ingredients (use the ID from above)
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
VALUES 
    ('<recipe-id-from-above>', (SELECT id FROM ingredient WHERE name = 'chicken breast'), '200', 'grams'),
    ('<recipe-id-from-above>', (SELECT id FROM ingredient WHERE name = 'spinach'), '100', 'grams');
```

#### Add a New Image Query
```sql
INSERT INTO image_query (
    user_id, 
    type, 
    detected_hints, 
    context
)
VALUES (
    (SELECT id FROM users WHERE email = 'john@example.com'),
    'recipe',
    '["tomato", "pasta"]'::jsonb,
    '{"location": "home", "meal_type": "dinner"}'::jsonb
)
RETURNING id;  -- Save for adding results
```

---

### Update Data

#### Update Recipe Difficulty
```sql
UPDATE recipe
SET difficulty = 'medium'
WHERE title = 'Chicken Stir Fry';
```

#### Update User Profile
```sql
UPDATE users
SET display_name = 'John Smith'
WHERE email = 'john@example.com';
```

---

### Delete Data

#### Delete a Saved Workout
```sql
DELETE FROM user_saved_workout
WHERE user_id = (SELECT id FROM users WHERE email = 'john@example.com')
  AND workout_id = (SELECT id FROM workout_video WHERE title = 'Full Body HIIT Workout');
```

#### Delete a Recipe (cascades to recipe_ingredient)
```sql
-- This will automatically delete related recipe_ingredient rows
DELETE FROM recipe
WHERE title = 'Test Recipe';
```

---

### Search Operations

#### Fuzzy Search Ingredients
```sql
-- Find ingredients similar to "chiken" (typo)
SELECT 
    name, 
    similarity(name, 'chiken') AS score
FROM ingredient
WHERE name % 'chiken'  -- % is the trigram similarity operator
ORDER BY score DESC;
```

**Expected:** Should still find "chicken breast" despite the typo

#### Search Recipes by Ingredient
```sql
-- Find all recipes containing "chicken"
SELECT DISTINCT r.title, r.difficulty, r.time_minutes
FROM recipe r
JOIN recipe_ingredient ri ON r.id = ri.recipe_id
JOIN ingredient i ON ri.ingredient_id = i.id
WHERE i.name ILIKE '%chicken%'
ORDER BY r.title;
```

#### Search by Multiple Hints
```sql
-- Find recipes that match ANY of these hints
WITH hints AS (
    SELECT unnest(ARRAY['chicken', 'protein', 'healthy']) AS hint
)
SELECT DISTINCT r.title, r.difficulty
FROM recipe r
JOIN recipe_ingredient ri ON r.id = ri.recipe_id
JOIN ingredient i ON ri.ingredient_id = i.id
CROSS JOIN hints h
WHERE i.name % h.hint
ORDER BY r.title;
```

---

## Troubleshooting

### Issue 1: Containers Not Starting
```bash
# Check Docker daemon status
docker info

# If not running, start Docker Desktop
open -a Docker  # macOS
# Wait 30 seconds, then retry

# Check logs for errors
docker compose logs postgres
```

---

### Issue 2: Migration Hasn't Run
```sql
-- Check Flyway history
SELECT * FROM flyway_schema_history;

-- If empty, check application logs
docker compose logs app | grep -i flyway
```

**Fix:** Restart application container
```bash
docker compose restart app
docker compose logs -f app
```

---

### Issue 3: Index Not Being Used
```sql
-- Check if index exists
SELECT indexname FROM pg_indexes 
WHERE tablename = 'ingredient' AND indexname = 'idx_ingredient_name_trgm';

-- Force index usage (for testing)
SET enable_seqscan = OFF;
EXPLAIN ANALYZE SELECT * FROM ingredient WHERE name % 'chicken';
SET enable_seqscan = ON;
```

---

### Issue 4: Slow Queries
```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Vacuum and analyze tables
VACUUM ANALYZE;
```

---

### Issue 5: Connection Refused
```bash
# Check if PostgreSQL port is accessible
nc -zv localhost 5432

# Check container status
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres | tail -50
```

**Fix:** Ensure PostgreSQL is healthy
```bash
docker compose exec postgres pg_isready -U fitnessuser -d fitness_mvp
```

---

## Useful PostgreSQL Commands

### Database Information
```sql
-- Current database and user
SELECT current_database(), current_user;

-- PostgreSQL version
SELECT version();

-- List all extensions
SELECT * FROM pg_extension;

-- Database size
SELECT pg_size_pretty(pg_database_size('fitness_mvp'));
```

---

### Table Information
```sql
-- List all tables with row counts
SELECT 
    schemaname,
    tablename,
    n_tup_ins AS "rows inserted",
    n_tup_upd AS "rows updated",
    n_tup_del AS "rows deleted",
    n_live_tup AS "live rows"
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Show table structure
\d+ recipe  -- Detailed info about 'recipe' table
```

---

### Performance Monitoring
```sql
-- Show slow queries (if logging is enabled)
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Show index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan AS "index scans",
    idx_tup_read AS "tuples read",
    idx_tup_fetch AS "tuples fetched"
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## Quick Test Script

Save this as `test_database.sh`:

```bash
#!/bin/bash

# Database Testing Script
echo "🚀 Testing CameraFirst Fitness Database..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Connection
echo -e "\n📡 Test 1: Database Connection"
if docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connection successful${NC}"
else
    echo -e "${RED}✗ Connection failed${NC}"
    exit 1
fi

# Test 2: Tables exist
echo -e "\n📋 Test 2: Tables Exist"
TABLE_COUNT=$(docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" | tr -d ' ')
if [ "$TABLE_COUNT" -eq 10 ]; then
    echo -e "${GREEN}✓ All 10 tables exist${NC}"
else
    echo -e "${RED}✗ Expected 10 tables, found $TABLE_COUNT${NC}"
fi

# Test 3: Sample data loaded
echo -e "\n📊 Test 3: Sample Data"
USER_COUNT=$(docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
if [ "$USER_COUNT" -ge 2 ]; then
    echo -e "${GREEN}✓ Sample data loaded ($USER_COUNT users)${NC}"
else
    echo -e "${RED}✗ Sample data missing${NC}"
fi

# Test 4: Indexes created
echo -e "\n🔍 Test 4: Indexes"
INDEX_COUNT=$(docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';" | tr -d ' ')
if [ "$INDEX_COUNT" -ge 20 ]; then
    echo -e "${GREEN}✓ All indexes created ($INDEX_COUNT indexes)${NC}"
else
    echo -e "${RED}✗ Expected 20+ indexes, found $INDEX_COUNT${NC}"
fi

# Test 5: Extensions loaded
echo -e "\n🔧 Test 5: Extensions"
PGCRYPTO=$(docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname = 'pgcrypto';" | tr -d ' ')
PGTRGM=$(docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname = 'pg_trgm';" | tr -d ' ')
if [ "$PGCRYPTO" -eq 1 ] && [ "$PGTRGM" -eq 1 ]; then
    echo -e "${GREEN}✓ Extensions loaded (pgcrypto, pg_trgm)${NC}"
else
    echo -e "${RED}✗ Extensions missing${NC}"
fi

echo -e "\n✅ Database testing complete!\n"
```

Make it executable and run:
```bash
chmod +x test_database.sh
./test_database.sh
```

---

## Next Steps

1. ✅ **Verify Sample Data** - Run all queries in "Verify Sample Data" section
2. ✅ **Test Indexes** - Run EXPLAIN ANALYZE on key queries
3. ✅ **Performance Test** - Benchmark query times
4. 📝 **Add More Sample Data** - Populate with realistic volumes (1000+ recipes)
5. 🔄 **Test in Application** - Connect Spring Boot app and test APIs
6. 📊 **Monitor Performance** - Set up pg_stat_statements for production

---

**Happy Testing! 🎉**
