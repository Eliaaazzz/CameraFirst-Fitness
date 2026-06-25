package com.fitnessapp.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ConfigurationPropertiesScan(basePackages = {
    "com.fitnessapp.backend.config"
})
@ComponentScan(basePackages = {
    "com.fitnessapp.backend",
    "com.aura"
})
@EntityScan(basePackages = {
    "com.fitnessapp.backend",
    "com.aura"
})
@EnableCaching
// Scan the whole base package (matching @EntityScan/@ComponentScan above) rather than a
// hand-maintained allowlist — the old explicit list silently dropped any new repository
// package (e.g. social, coach), causing UnsatisfiedDependency failures only at context boot.
@EnableJpaRepositories(basePackages = {
    "com.fitnessapp.backend",
    "com.aura"
})
public class FitnessAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(FitnessAppApplication.class, args);
    }
}


