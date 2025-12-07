package com.fitnessapp.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableCaching
@EnableJpaRepositories(basePackages = {
    "com.fitnessapp.backend.user.repository",
    "com.fitnessapp.backend.recipe.repository",
    "com.fitnessapp.backend.nutrition.repository",
    "com.fitnessapp.backend.workout.repository",
    "com.fitnessapp.backend.usda.repository",
    "com.fitnessapp.backend.repository"
})
public class FitnessAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(FitnessAppApplication.class, args);
    }

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
}



