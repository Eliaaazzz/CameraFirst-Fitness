package com.fitnessapp.backend.recipe.controller;

import com.fitnessapp.backend.recipe.service.IntelligentRecipeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST API for AI-powered recipe generation
 */
@RestController
@RequestMapping("/api/v1/recipes")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Intelligent Recipe Generation", description = "AI-powered personalized recipe generation")
public class IntelligentRecipeController {

  private final IntelligentRecipeService intelligentRecipeService;

  /**
   * Generate a personalized recipe for a user
   *
   * @param userId User ID
   * @param request Generation request parameters
   * @return Generated recipe
   */
  @PostMapping("/generate")
  @Operation(
      summary = "Generate AI-powered personalized recipe",
      description = "Generates a personalized recipe based on user profile, dietary preferences, and available equipment using GPT-4"
  )
  public ResponseEntity<IntelligentRecipeService.GeneratedRecipeResponse> generateRecipe(
      @Parameter(description = "User ID", required = true)
      @RequestHeader("X-User-ID") UUID userId,
      @RequestBody(required = false) GenerateRecipeRequest request) {

    log.info("Generating AI recipe for user: {}, mealType: {}, equipment: {}",
        userId,
        request != null ? request.mealType() : null,
        request != null ? request.equipment() : null);

    String mealType = request != null ? request.mealType() : null;
    List<String> equipment = request != null ? request.equipment() : null;

    IntelligentRecipeService.GeneratedRecipeResponse response =
        intelligentRecipeService.generateRecipe(userId, mealType, equipment);

    return ResponseEntity.ok(response);
  }

  /**
   * Request DTO for recipe generation
   */
  public record GenerateRecipeRequest(
      @Parameter(description = "Meal type (breakfast, lunch, dinner, snack)", example = "lunch")
      String mealType,

      @Parameter(description = "Available equipment", example = "[\"oven\", \"blender\", \"stove\"]")
      List<String> equipment
  ) {}
}
