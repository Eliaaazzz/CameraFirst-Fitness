package com.fitnessapp.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import com.fitnessapp.backend.youtube.YouTubeService;
import com.fitnessapp.backend.importer.DataImportService;
import com.fitnessapp.backend.importer.RecipeImportService;

@SpringBootTest(
    properties = {
        "spring.profiles.active=test",
        "spring.test.context.cache.maxSize=1",
        "app.seed.enabled=false"
    }
)
class FitnessAppApplicationTests {

    @MockBean private YouTubeService youTubeService;
    @MockBean private DataImportService dataImportService;
    @MockBean private RecipeImportService recipeImportService;

	@Test
	void contextLoads() {
	}

}
