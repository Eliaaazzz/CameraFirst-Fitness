package com.fitnessapp.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import com.fitnessapp.backend.repository.WorkoutVideoRepository;
import com.fitnessapp.backend.repository.RecipeRepository;
import com.fitnessapp.backend.youtube.YouTubeService;
import com.fitnessapp.backend.importer.DataImportService;
import com.fitnessapp.backend.importer.RecipeImportService;

@SpringBootTest(properties = {
        "spring.flyway.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:fitness_test;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration"
})
class FitnessAppApplicationTests {

    @MockBean private WorkoutVideoRepository workoutVideoRepository;
    @MockBean private RecipeRepository recipeRepository;
    @MockBean private YouTubeService youTubeService;
    @MockBean private DataImportService dataImportService;
    @MockBean private RecipeImportService recipeImportService;

	@Test
	void contextLoads() {
	}

}
