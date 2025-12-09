package com.fitnessapp.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ConfigurationPropertiesScan(basePackages = {
    "com.fitnessapp.backend.config"
})
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
}



