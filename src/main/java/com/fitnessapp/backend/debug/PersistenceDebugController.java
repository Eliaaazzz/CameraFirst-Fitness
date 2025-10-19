package com.fitnessapp.backend.debug;

import com.fitnessapp.backend.repository.RecipeRepository;
import com.fitnessapp.backend.repository.WorkoutVideoRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Debug endpoint to compare Hibernate persistence context counts vs actual database counts.
 * Helps diagnose synchronization issues between JPA and PostgreSQL.
 */
@Slf4j
@RestController
@RequestMapping("/api/debug")
@RequiredArgsConstructor
public class PersistenceDebugController {

    private final RecipeRepository recipeRepository;
    private final WorkoutVideoRepository workoutVideoRepository;
    private final DataSource dataSource;
    
    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Compare JPA count() vs native SQL countActual() for recipes.
     * 
     * @return Map with both counts and any discrepancies
     */
    @GetMapping("/recipe-counts")
    public Map<String, Object> getRecipeCounts() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // JPA count (uses Hibernate session cache)
            long jpaCount = recipeRepository.count();
            log.info("RecipeRepository.count() (JPA): {}", jpaCount);
            
            // Native SQL count (direct database query)
            long nativeCount = recipeRepository.countActual();
            log.info("RecipeRepository.countActual() (Native SQL): {}", nativeCount);
            
            result.put("jpa_count", jpaCount);
            result.put("native_count", nativeCount);
            result.put("match", jpaCount == nativeCount);
            result.put("discrepancy", Math.abs(jpaCount - nativeCount));
            
            if (jpaCount != nativeCount) {
                log.warn("⚠️  MISMATCH: JPA count ({}) != Native count ({})", jpaCount, nativeCount);
                result.put("warning", "Persistence context out of sync with database");
            } else {
                log.info("✅ Counts match: JPA and database are in sync");
            }
            
        } catch (Exception e) {
            log.error("Error checking recipe counts", e);
            result.put("error", e.getMessage());
            result.put("error_type", e.getClass().getSimpleName());
        }
        
        return result;
    }

    /**
     * Get counts for all entities to check database connectivity.
     * 
     * @return Map with counts for recipes and workouts
     */
    @GetMapping("/all-counts")
    public Map<String, Object> getAllCounts() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Recipe counts
            long recipeJpaCount = recipeRepository.count();
            long recipeNativeCount = recipeRepository.countActual();
            
            Map<String, Object> recipeData = new HashMap<>();
            recipeData.put("jpa_count", recipeJpaCount);
            recipeData.put("native_count", recipeNativeCount);
            recipeData.put("match", recipeJpaCount == recipeNativeCount);
            result.put("recipes", recipeData);
            
            // Workout counts
            long workoutJpaCount = workoutVideoRepository.count();
            
            Map<String, Object> workoutData = new HashMap<>();
            workoutData.put("jpa_count", workoutJpaCount);
            // Note: WorkoutVideoRepository doesn't have countActual(), using JPA only
            result.put("workouts", workoutData);
            
            log.info("All counts - Recipes: JPA={}, Native={} | Workouts: JPA={}", 
                recipeJpaCount, recipeNativeCount, workoutJpaCount);
            
        } catch (Exception e) {
            log.error("Error checking all counts", e);
            result.put("error", e.getMessage());
            result.put("error_type", e.getClass().getSimpleName());
            result.put("stack_trace", e.getStackTrace()[0].toString());
        }
        
        return result;
    }

    /**
     * Test database connectivity by executing a simple native query.
     * 
     * @return Connection status
     */
    @GetMapping("/connection-test")
    public Map<String, Object> testConnection() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // This will fail fast if there's a connection issue
            long count = recipeRepository.countActual();
            result.put("status", "SUCCESS");
            result.put("message", "Database connection healthy");
            result.put("native_query_result", count);
            log.info("✅ Database connection test passed. Recipe count: {}", count);
            
        } catch (org.springframework.dao.InvalidDataAccessResourceUsageException e) {
            result.put("status", "SCHEMA_ERROR");
            result.put("message", "Table not found or schema mismatch");
            result.put("error", e.getMessage());
            log.error("❌ Schema error: {}", e.getMessage());
            
        } catch (Exception e) {
            result.put("status", "ERROR");
            result.put("message", "Database connection failed");
            result.put("error", e.getMessage());
            result.put("error_type", e.getClass().getSimpleName());
            log.error("❌ Database connection test failed", e);
        }
        
        return result;
    }
    
    /**
     * Get actual database connection info using native query.
     * 
     * @return Current database, schema, and table list
     */
    @GetMapping("/database-info")
    public Map<String, Object> getDatabaseInfo() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Get current database
            String currentDb = (String) entityManager.createNativeQuery(
                "SELECT current_database()").getSingleResult();
            result.put("current_database", currentDb);
            
            // Get current schema
            String currentSchema = (String) entityManager.createNativeQuery(
                "SELECT current_schema()").getSingleResult();
            result.put("current_schema", currentSchema);
            
            // Get search path
            String searchPath = (String) entityManager.createNativeQuery(
                "SHOW search_path").getSingleResult();
            result.put("search_path", searchPath);
            
            // List all tables in public schema
            @SuppressWarnings("unchecked")
            List<String> tables = entityManager.createNativeQuery(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
                .getResultList();
            result.put("tables_in_public_schema", tables);
            result.put("table_count", tables.size());
            
            log.info("Database info: {} / {} / tables: {}", currentDb, currentSchema, tables.size());
            result.put("status", "SUCCESS");
            
        } catch (Exception e) {
            result.put("status", "ERROR");
            result.put("error", e.getMessage());
            result.put("error_type", e.getClass().getSimpleName());
            log.error("Failed to get database info", e);
        }
        
        return result;
    }
    
    /**
     * Use raw JDBC connection to bypass Hibernate and test database directly.
     * 
     * @return Database info via raw JDBC
     */
    @GetMapping("/jdbc-direct-test")
    public Map<String, Object> jdbcDirectTest() {
        Map<String, Object> result = new HashMap<>();
        
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            
            // Get connection metadata
            result.put("jdbc_url", conn.getMetaData().getURL());
            result.put("jdbc_username", conn.getMetaData().getUserName());
            result.put("jdbc_database_product", conn.getMetaData().getDatabaseProductName());
            result.put("jdbc_database_version", conn.getMetaData().getDatabaseProductVersion());
            
            // Get current database
            try (ResultSet rs = stmt.executeQuery("SELECT current_database(), current_schema()")) {
                if (rs.next()) {
                    result.put("current_database", rs.getString(1));
                    result.put("current_schema", rs.getString(2));
                }
            }
            
            // List all tables using JDBC
            List<String> jdbcTables = new ArrayList<>();
            try (ResultSet rs = stmt.executeQuery(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")) {
                while (rs.next()) {
                    jdbcTables.add(rs.getString(1));
                }
            }
            result.put("tables_via_jdbc", jdbcTables);
            result.put("jdbc_table_count", jdbcTables.size());
            
            // Try to count recipes directly
            try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM recipe")) {
                if (rs.next()) {
                    result.put("recipe_count_via_jdbc", rs.getLong(1));
                    result.put("jdbc_query_success", true);
                }
            } catch (Exception e) {
                result.put("jdbc_query_success", false);
                result.put("jdbc_query_error", e.getMessage());
            }
            
            // Try to count workouts directly
            try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM workout_video")) {
                if (rs.next()) {
                    result.put("workout_count_via_jdbc", rs.getLong(1));
                }
            } catch (Exception e) {
                result.put("workout_query_error", e.getMessage());
            }
            
            result.put("status", "SUCCESS");
            log.info("✅ JDBC direct test passed. Tables found: {}", jdbcTables.size());
            
        } catch (Exception e) {
            result.put("status", "ERROR");
            result.put("error", e.getMessage());
            result.put("error_type", e.getClass().getSimpleName());
            log.error("❌ JDBC direct test failed", e);
        }
        
        return result;
    }
}
