/**
 * Image Recognition API
 * Handles workout and recipe image uploads and recognition
 * 
 * Note: The backend currently doesn't have real computer vision.
 * It uses metadata (equipment choice) to filter workouts/recipes.
 * This file includes fallback logic to fetch random recommendations
 * when image recognition fails.
 */

import type { RecipeCard, UploadRecipePayload, UploadWorkoutPayload, WorkoutCard } from '@/types';
import {
    resolveRecipeImageUrls,
    type RecipeImageUrls
} from '@/utils/spoonacular';
import { api, get } from './apiClient';

/**
 * Get placeholder image based on recipe title keywords.
 * Uses hash-based distribution to ensure variety even within same category.
 */
function getPlaceholderImage(title: string): RecipeImageUrls {
  const lowerTitle = title.toLowerCase();

  // Define image pools for each category
  let imagePool: string[];

  if (lowerTitle.includes('chicken')) {
    imagePool = [
      'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800',
      'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800',
      'https://images.unsplash.com/photo-1562967914-608f82629710?w=800',
      'https://images.unsplash.com/photo-1632634735548-24fbb85c3989?w=800',
    ];
  } else if (lowerTitle.includes('salmon') || lowerTitle.includes('fish')) {
    imagePool = [
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
      'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=800',
      'https://images.unsplash.com/photo-1580959375944-064e72a8fc34?w=800',
    ];
  } else if (lowerTitle.includes('beef') || lowerTitle.includes('steak')) {
    imagePool = [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
      'https://images.unsplash.com/photo-1558030006-450675393462?w=800',
      'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800',
    ];
  } else if (lowerTitle.includes('pasta')) {
    imagePool = [
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
      'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
      'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800',
    ];
  } else if (lowerTitle.includes('salad') || lowerTitle.includes('veggie') || lowerTitle.includes('vegetable')) {
    imagePool = [
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
      'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=800',
    ];
  } else if (lowerTitle.includes('egg') || lowerTitle.includes('omelette')) {
    imagePool = [
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
      'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=800',
    ];
  } else if (lowerTitle.includes('tofu')) {
    imagePool = [
      'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?w=800',
      'https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=800',
    ];
  } else if (lowerTitle.includes('shrimp') || lowerTitle.includes('prawn')) {
    imagePool = [
      'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800',
      'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800',
    ];
  } else if (lowerTitle.includes('soup') || lowerTitle.includes('lentil')) {
    imagePool = [
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
      'https://images.unsplash.com/photo-1588566565463-180a5b2090d2?w=800',
      'https://images.unsplash.com/photo-1604908815453-6146b857f1c6?w=800',
    ];
  } else {
    // Default pool for unmatched recipes
    imagePool = [
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800', // Food market
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', // Cooking
      'https://images.unsplash.com/photo-1547592180-85f173990554?w=800', // Healthy meal
      'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800', // Food platter
    ];
  }

  // Use hash to select from the pool - ensures variety within same category
  const hash = title.split('').reduce((acc, char) => acc + (char.codePointAt(0) || 0), 0);
  const url = imagePool[hash % imagePool.length];

  return {
    thumb: url,
    medium: url,
    large: url,
    original: url,
  };
}

/**
 * Normalize raw recipe data to include proper image URLs.
 * This ensures all recipes have consistent image data.
 * Includes enhanced error handling and fallback logic.
 */
function normalizeRecipeData(raw: any): RecipeCard {
  let image: RecipeImageUrls;

  try {
    // Try to resolve image URLs from available data
    image = resolveRecipeImageUrls({
      id: raw.id,
      imageType: raw.imageType,
      image: raw.image,
      imageUrl: raw.imageUrl,
    });

    // Validate that we have all required variants
    if (!image.thumb || !image.medium || !image.large) {
      console.warn(`[normalizeRecipeData] Recipe ${raw.id} (${raw.title}) missing image URLs, using placeholder. Image data:`, {
        id: raw.id,
        imageType: raw.imageType,
        hasImage: !!raw.image,
        hasImageUrl: !!raw.imageUrl,
      });
      throw new Error('Invalid image URLs structure');
    }
  } catch (error) {
    // Fallback to title-based placeholder
    console.warn(`[normalizeRecipeData] Failed to resolve image for recipe ${raw.id}:`, error);
    image = getPlaceholderImage(raw.title || `Recipe ${raw.id}`);
  }

  return {
    id: raw.id,
    title: raw.title || 'Untitled Recipe',
    // Legacy imageUrl uses medium size
    imageUrl: image.medium,
    // New image object with all variants
    image,
    timeMinutes: raw.timeMinutes || raw.readyInMinutes || 0,
    difficulty: raw.difficulty || 'medium',
    calories: raw.calories,
    nutritionSummary: raw.nutritionSummary ?? raw.nutrition,
    ingredients: Array.isArray(raw.ingredients)
      ? raw.ingredients.map((ing: any) => (typeof ing === 'string' ? { name: ing } : ing))
      : raw.ingredients,
    steps: raw.steps,
    tags: raw.tags,
    isAiGenerated: raw.isAiGenerated,
  };
}

/**
 * Fallback: Get workouts from admin API when image upload fails
 */
async function getFallbackWorkouts(equipment?: string): Promise<WorkoutCard[]> {
  try {
    // The admin endpoint returns workouts in a simple array format
    const workouts = await get<any[]>('/api/admin/workouts');
    
    // Filter by equipment if provided, otherwise return first 10
    let filtered = workouts;
    if (equipment) {
      filtered = workouts.filter((w: any) => 
        w.equipment?.some((e: string) => e.toLowerCase().includes(equipment.toLowerCase()))
      );
    }
    
    // Transform to WorkoutCard format and limit results
    return filtered.slice(0, 10).map((w: any) => ({
      id: w.youtubeId || w.id,
      youtubeId: w.youtubeId,
      title: w.title,
      durationMinutes: w.durationMinutes,
      level: w.level,
      equipment: w.equipment || [],
      bodyPart: w.bodyPart || [],
      viewCount: w.viewCount || 0,
    }));
  } catch (error) {
    console.error('Fallback workouts fetch failed:', error);
    return [];
  }
}

/**
 * Fallback: Get recipes from admin API when image upload fails
 */
async function getFallbackRecipes(): Promise<RecipeCard[]> {
  try {
    const recipes = await get<any[]>('/api/admin/recipes');
    
    // Transform to RecipeCard format with normalized images and limit results
    return recipes.slice(0, 10).map(normalizeRecipeData);
  } catch (error) {
    console.error('Fallback recipes fetch failed:', error);
    return [];
  }
}

/**
 * Upload an image to get workout recommendations
 * Falls back to list API if image recognition fails
 */
export async function uploadWorkoutImage(
  imageUri: string,
  metadata?: UploadWorkoutPayload
): Promise<WorkoutCard[]> {
  try {
    const response = await api.uploadImage<{ workouts: WorkoutCard[] }>(
      '/api/v1/workouts/from-image',
      imageUri,
      metadata
    );
    
    // The API returns { workouts: [...], detectedEquipment: [...], ... }
    if (response && Array.isArray(response.workouts) && response.workouts.length > 0) {
      return response.workouts;
    }
    
    // If no workouts returned, use fallback
    console.log('No workouts from image API, using fallback');
    return getFallbackWorkouts(metadata?.equipment?.[0]);
  } catch (error) {
    console.error('uploadWorkoutImage failed, using fallback:', error);
    // Use fallback when API fails
    return getFallbackWorkouts(metadata?.equipment?.[0]);
  }
}

/**
 * Upload an image to get recipe recommendations
 * Falls back to list API if image recognition fails
 */
export async function uploadRecipeImage(
  imageUri: string,
  payload?: UploadRecipePayload
): Promise<RecipeCard[]> {
  try {
    const response = await api.uploadImage<{ recipes: RecipeCard[] }>(
      '/api/v1/recipes/from-image',
      imageUri,
      payload
    );
    
    // The API returns { recipes: [...], detectedIngredients: [...], ... }
    if (response && Array.isArray(response.recipes) && response.recipes.length > 0) {
      return response.recipes;
    }
    
    // If no recipes returned, use fallback
    console.log('No recipes from image API, using fallback');
    return getFallbackRecipes();
  } catch (error) {
    console.error('uploadRecipeImage failed, using fallback:', error);
    // Use fallback when API fails
    return getFallbackRecipes();
  }
}

/**
 * Search workouts by keyword
 */
export async function searchWorkouts(query: string, level?: string): Promise<WorkoutCard[]> {
  try {
    const workouts = await get<any[]>('/api/admin/workouts');
    const lowerQuery = query.toLowerCase();
    
    return workouts
      .filter((w: any) => {
        const matchesQuery = 
          w.title?.toLowerCase().includes(lowerQuery) ||
          w.equipment?.some((e: string) => e.toLowerCase().includes(lowerQuery)) ||
          w.bodyPart?.some((b: string) => b.toLowerCase().includes(lowerQuery));
        const matchesLevel = !level || w.level === level;
        return matchesQuery && matchesLevel;
      })
      .slice(0, 20)
      .map((w: any) => ({
        id: w.youtubeId || w.id,
        youtubeId: w.youtubeId,
        title: w.title,
        durationMinutes: w.durationMinutes,
        level: w.level,
        equipment: w.equipment || [],
        bodyPart: w.bodyPart || [],
        viewCount: w.viewCount || 0,
      }));
  } catch (error) {
    console.error('searchWorkouts failed:', error);
    return [];
  }
}

/**
 * Search recipes by keyword
 * Returns recipes with normalized image URLs for all sizes.
 */
export async function searchRecipes(query: string): Promise<RecipeCard[]> {
  try {
    // Use admin list and filter client-side (the /api/v1/recipes/search returns 403)
    const recipes = await get<any[]>('/api/admin/recipes');
    const lowerQuery = query.toLowerCase();
    
    return recipes
      .filter((r: any) => {
        // Search in title, ingredients, and tags
        const titleMatch = r.title?.toLowerCase().includes(lowerQuery);
        const ingredientMatch = r.ingredients?.some((ing: any) => 
          ing.name?.toLowerCase().includes(lowerQuery)
        );
        const tagMatch = r.tags?.some((tag: string) => 
          tag.toLowerCase().includes(lowerQuery)
        );
        return titleMatch || ingredientMatch || tagMatch;
      })
      .slice(0, 20)
      .map(normalizeRecipeData);
  } catch (error) {
    console.error('searchRecipes failed:', error);
    return [];
  }
}

const MAX_RECOMMENDATIONS = 6;

/**
 * Normalize goal for API (match backend normalization)
 */
const normalizeGoalForApi = (fitnessGoal?: string | null): string[] => {
  if (!fitnessGoal) return ['MAINTAIN'];
  const upper = fitnessGoal.toUpperCase().trim();
  if (upper.includes('FAT') || upper.includes('LOSS') || upper.includes('LOSE')) return ['FAT_LOSS'];
  if (upper.includes('MUSCLE') || upper.includes('GAIN') || upper.includes('BUILD')) return ['BUILD_MUSCLE'];
  if (upper.includes('STRENGTH') || upper.includes('POWER')) return ['STRENGTH'];
  if (upper.includes('BLOOD') || upper.includes('SUGAR') || upper.includes('DIABETES')) return ['BLOOD_SUGAR_CONTROL'];
  if (upper.includes('MAINTAIN') || upper.includes('HEALTH') || upper.includes('BALANCE')) return ['MAINTAIN'];
  return [upper];
};

/**
 * Recommendation response from POST /api/v1/recommendations/generate
 */
interface RecommendationApiResponse {
  recommendationId: string;
  aiAdvice: string;
  recipes: Array<{
    id: string;
    title: string;
    imageUrl?: string;
    nutrition?: {
      calories?: number;
      protein?: number;
      sugar?: number;
      carbs?: number;
      fat?: number;
    };
    tags?: string[];
    matchScore?: number;
  }>;
  workouts: Array<{
    id: string;
    title: string;
    type?: string;
    durationMin?: number;
    difficulty?: string;
    thumbnailUrl?: string;
    videoUrl?: string;
    matchScore?: number;
  }>;
}

/**
 * Generate personalized recommendations using POST /api/v1/recommendations/generate
 */
const unwrapRecommendationResponse = (raw: any): RecommendationApiResponse | null => {
  if (!raw) return null;
  // New apiClient behavior unwraps ApiEnvelope automatically → raw is the RecommendationApiResponse
  if (raw.recommendationId && raw.workouts && raw.recipes) {
    return raw as RecommendationApiResponse;
  }
  // Legacy shape: ApiEnvelope<ApiResponse<T>> or ApiResponse<T>
  if (raw.data && raw.data.recommendationId) {
    return raw.data as RecommendationApiResponse;
  }
  return null;
};

async function generateRecommendations(goals: string[], limit: number = MAX_RECOMMENDATIONS): Promise<RecommendationApiResponse | null> {
  try {
    const response = await api.post<RecommendationApiResponse>(
      '/api/v1/recommendations/generate',
      {
        userProfile: {
          goals,
          metrics: {},
          preferences: {}
        },
        limit
      }
    );
    return unwrapRecommendationResponse(response);
  } catch (error) {
    console.error('generateRecommendations failed:', error);
    return null;
  }
}

/**
 * Get recommended workouts based on fitness goal.
 * Uses POST /api/v1/recommendations/generate endpoint.
 */
export async function getRecommendedWorkouts(fitnessGoal?: string | null): Promise<WorkoutCard[]> {
  try {
    const goals = normalizeGoalForApi(fitnessGoal);
    const response = await generateRecommendations(goals, MAX_RECOMMENDATIONS);

    if (!response || !Array.isArray(response.workouts)) {
      return [];
    }

    // Map API response to WorkoutCard format
    return response.workouts.map(w => ({
      id: w.id,
      title: w.title,
      youtubeId: w.videoUrl?.includes('youtube.com') ? w.videoUrl.split('/').pop() : undefined,
      durationMinutes: w.durationMin ?? 5,
      level: (w.difficulty?.toLowerCase() ?? 'intermediate') as any,
      equipment: [],
      bodyPart: w.type ? [w.type] : [],
      thumbnailUrl: w.thumbnailUrl,
    }));
  } catch (error) {
    console.error('getRecommendedWorkouts failed:', error);
    return [];
  }
}

/**
 * Get recommended recipes based on fitness goal.
 * Uses POST /api/v1/recommendations/generate endpoint.
 */
export async function getRecommendedRecipes(fitnessGoal?: string | null): Promise<RecipeCard[]> {
  try {
    const goals = normalizeGoalForApi(fitnessGoal);
    const response = await generateRecommendations(goals, MAX_RECOMMENDATIONS);

    if (response && Array.isArray(response.recipes) && response.recipes.length > 0) {
      return response.recipes.map(r => normalizeRecipeData({
        id: r.id,
        title: r.title,
        imageUrl: r.imageUrl,
        timeMinutes: 30, // Default if not provided
        difficulty: 'medium',
        nutrition: r.nutrition,
        ingredients: [],
        steps: [],
      }));
    }

    const fallbackGoal = goals[0] ?? 'MAINTAIN';
    const fallback = await get<any>(
      `/api/v1/recipes/by-goal?goal=${encodeURIComponent(fallbackGoal)}&limit=${MAX_RECOMMENDATIONS}`
    );
    const fallbackRecipes = Array.isArray(fallback) ? fallback : fallback?.recipes;
    if (!Array.isArray(fallbackRecipes)) {
      return [];
    }
    return fallbackRecipes.map(normalizeRecipeData);
  } catch (error) {
    console.error('getRecommendedRecipes failed:', error);
    return [];
  }
}
