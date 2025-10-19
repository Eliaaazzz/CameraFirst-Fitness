#!/bin/bash

echo "=========================================="
echo "🔍 Deep Database Diagnosis"
echo "=========================================="
echo ""

echo "1️⃣  PostgreSQL Direct Query (psql)"
echo "-------------------------------------------"
docker exec -i camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp -c "
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
"

echo ""
echo "2️⃣  Application EntityManager Query"
echo "-------------------------------------------"
curl -s http://localhost:8080/api/debug/database-info | python3 -m json.tool

echo ""
echo "3️⃣  Check for transaction locks"
echo "-------------------------------------------"
docker exec -i camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp -c "
SELECT 
    pid,
    state,
    query_start,
    state_change,
    waiting,
    query
FROM pg_stat_activity 
WHERE datname = 'fitness_mvp' 
  AND state != 'idle'
ORDER BY query_start;
"

echo ""
echo "4️⃣  Check pg_class for all relations"
echo "-------------------------------------------"
docker exec -i camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp -c "
SELECT 
    n.nspname as schema,
    c.relname as name,
    CASE c.relkind 
        WHEN 'r' THEN 'table'
        WHEN 'v' THEN 'view'
        WHEN 'i' THEN 'index'
        WHEN 'S' THEN 'sequence'
        WHEN 's' THEN 'special'
    END as type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','v')
ORDER BY c.relname;
"

echo ""
echo "5️⃣  Test direct SQL query via app"
echo "-------------------------------------------"
curl -s http://localhost:8080/api/debug/connection-test | python3 -m json.tool

echo ""
echo "=========================================="
echo "📊 Analysis Complete"
echo "=========================================="
