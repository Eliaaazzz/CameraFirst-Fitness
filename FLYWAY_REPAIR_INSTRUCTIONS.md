# Flyway Migration Repair Instructions

## What This Fix Does

This fix adds a temporary Flyway migration strategy to the `FitnessAppApplication` class that:

1. **Repairs** the `flyway_schema_history` table to fix checksum mismatches
2. **Migrates** the database schema to apply any pending migrations

This is necessary because there are duplicate V14 migration files with different checksums:
- `V14__create_usda_food_tables.sql`
- `V14__seed_default_api_key.sql`

## How to Use This Fix

### Step 1: Start the Application

Run the backend application using Gradle:

```bash
cd backend
./gradlew bootRun
```

Or if you prefer the start script:

```bash
cd backend
./start.sh
```

### Step 2: Verify Successful Startup

Watch the console logs for:
- `Successfully repaired schema history table` (from Flyway repair)
- `Successfully applied X migrations` or `Schema is up to date` (from Flyway migrate)
- `Started FitnessAppApplication` (indicating successful startup)

### Step 3: **IMPORTANT** - Remove the Repair Bean

Once the application starts successfully, **immediately** remove the temporary repair code:

1. Open `backend/src/main/java/com/fitnessapp/backend/FitnessAppApplication.java`

2. Delete the `repairStrategy()` method and its documentation:
   ```java
   // DELETE THESE LINES:
   /**
    * Temporary Flyway migration strategy to repair checksum mismatches.
    * This bean performs a Flyway repair operation before running migrations,
    * which fixes any checksum inconsistencies in the flyway_schema_history table.
    * 
    * IMPORTANT: This bean should be removed after the application starts successfully
    * and the database schema history is repaired. It's only needed for one-time repair.
    */
   @Bean
   public FlywayMigrationStrategy repairStrategy() {
       return flyway -> {
           // Repair the schema history table to fix checksum mismatches
           flyway.repair();
           // Then proceed with normal migration
           flyway.migrate();
       };
   }
   ```

3. Also remove the import that's no longer needed:
   ```java
   // DELETE THIS LINE:
   import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
   
   // DELETE THIS LINE:
   import org.springframework.context.annotation.Bean;
   ```

4. Save the file

5. Restart the application to verify it still works without the repair strategy

## Why Remove the Bean?

The repair strategy should only run **once** to fix the checksum mismatch. Keeping it in the code means:
- It will run on every application startup (unnecessary overhead)
- It could mask future migration problems
- It's not needed once the database schema history is corrected

## What If It Doesn't Work?

If the application fails to start with this fix:

1. Check the error logs for specific Flyway errors
2. Verify your database connection settings in `application.yml`
3. Ensure PostgreSQL is running and accessible
4. Check that you have the correct database credentials

## Root Cause

The issue occurred because two migration files were created with the same version number (V14):
- One for creating USDA food tables
- One for seeding default API keys

Flyway expects each migration version to be unique and immutable. When the content of a migration changes, its checksum changes, causing validation failures.

## Long-term Solution

To prevent this in the future:
1. Always use unique version numbers for migrations
2. Never modify existing migration files after they've been applied
3. Use incremental version numbers (V16, V17, V18, etc.)
4. Consider renaming one of the V14 files to V16 or higher in a future clean migration
