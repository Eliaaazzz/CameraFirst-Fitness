import { Button, Container, SafeAreaWrapper, Text } from '@/components';
import { SmartRecipeImage } from '@/components/RecipeImage';
import { BulletListItem, NumberedListItem, SaveButton, SectionCard } from '@/components/recipe';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useRecipeById, useRemoveRecipe, useSavedRecipes, useSaveRecipe } from '@/services';
import type { RecipeImageUrls } from '@/types';
import { BRAND_COLORS } from '@/utils';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// DESIGN TOKENS - Single source of truth for layout
// ============================================================================
const PAGE_X = 20; // Global horizontal padding
const MAX_CONTENT_WIDTH = 760; // Max width for large screens (web)
const SECTION_GAP = 14; // Vertical gap between section cards
const CARD_BORDER_RADIUS = 20;
const IMAGE_BORDER_RADIUS = 16;
const IMAGE_HEIGHT = 280;

// Typography
const TITLE_FONT_SIZE = 30;
const SECTION_TITLE_SIZE = 18;
const BODY_FONT_SIZE = 16;
const BODY_LINE_HEIGHT = 22;

// Colors
const PRIMARY_COLOR = BRAND_COLORS.primary;
const SECONDARY_COLOR = BRAND_COLORS.secondary;
const TEXT_PRIMARY = '#1A1A2E';
const TEXT_SECONDARY = '#6B6B7A';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Default food images for recipes without images
const DEFAULT_FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
];

function getPlaceholderImageUrls(id: string, title: string): RecipeImageUrls {
  const seed = id || title;
  const hash = seed.split('').reduce((acc, char, idx) => acc + (char.codePointAt(0) || 0) * (idx + 1), 0);
  const url = DEFAULT_FOOD_IMAGES[hash % DEFAULT_FOOD_IMAGES.length];
  return { thumb: url, medium: url, large: url };
}

const formatNutritionValue = (key: string, value: unknown): string => {
  const num = Number(value);
  if (isNaN(num)) return String(value);

  switch (key.toLowerCase()) {
    case 'calories':
      return `${Math.round(num)} kcal`;
    case 'protein':
    case 'carbs':
    case 'fat':
    case 'fiber':
    case 'sugar':
      return `${Math.round(num)}g`;
    case 'sodium':
      return `${Math.round(num)}mg`;
    case 'servings':
      return String(Math.round(num));
    default:
      return String(num);
  }
};

// ScrollView style for Web compatibility
const scrollViewStyle: ViewStyle = {
  flex: 1,
  overflow: 'scroll' as any,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const RecipeDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const routeRecipe = route.params?.recipe;

  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const savedRecipes = useSavedRecipes(userId);
  const saveRecipe = useSaveRecipe(userId);
  const removeRecipe = useRemoveRecipe(userId);

  // Check if we need to fetch full recipe
  const needsFullRecipe = routeRecipe && (
    !routeRecipe.ingredients ||
    routeRecipe.ingredients.length === 0 ||
    !routeRecipe.steps ||
    (Array.isArray(routeRecipe.steps) && routeRecipe.steps.length === 0) ||
    (typeof routeRecipe.steps === 'object' && Object.keys(routeRecipe.steps).length === 0)
  );

  const fullRecipeQuery = useRecipeById(needsFullRecipe ? routeRecipe?.id : undefined);
  const recipe = fullRecipeQuery.data || routeRecipe;
  const isSaved = savedRecipes.data?.some((r) => r.id === recipe?.id) ?? false;
  const isLoadingFullRecipe = needsFullRecipe && fullRecipeQuery.isLoading;

  // Build image URLs with fallback
  const imageUrls = useMemo((): RecipeImageUrls => {
    if (recipe?.image) return recipe.image;
    if (recipe?.imageUrl) {
      return { thumb: recipe.imageUrl, medium: recipe.imageUrl, large: recipe.imageUrl };
    }
    return getPlaceholderImageUrls(recipe?.id || '', recipe?.title || '');
  }, [recipe]);

  // Not found state
  if (!routeRecipe) {
    return (
      <SafeAreaWrapper>
        <Container>
          <SectionCard>
            <Text variant="body">Recipe not found</Text>
            <Button title="Go Back" onPress={() => navigation.goBack()} />
          </SectionCard>
        </Container>
      </SafeAreaWrapper>
    );
  }

  const handleSaveToggle = async () => {
    if (isSaved) {
      await removeRecipe.mutateAsync(recipe.id);
    } else {
      await saveRecipe.mutateAsync(recipe.id);
    }
  };

  // Parse ingredient text
  const getIngredientText = (ing: any): string => {
    if (typeof ing === 'string') return ing;
    const { name, quantity, unit } = ing;
    return `${quantity ? `${quantity} ` : ''}${unit ? `${unit} ` : ''}${name}`;
  };

  // Parse step text
  const getStepText = (step: any): string => {
    if (typeof step === 'string') return step;
    return step.instruction || step.description || step.text || JSON.stringify(step);
  };

  const getStepNumber = (step: any, index: number): number => {
    return typeof step === 'object' && step.step ? step.step : index + 1;
  };

  return (
    <SafeAreaWrapper>
      <ScrollView
        style={scrollViewStyle}
        contentContainerStyle={{
          // CRITICAL: All horizontal padding controlled here
          paddingHorizontal: PAGE_X,
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={true}
        bounces={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Content wrapper for max-width centering on large screens */}
        <View style={styles.contentWrapper}>
          {/* Header with Back Button */}
          <View style={styles.headerBar}>
            <Button
              title=""
              variant="outline"
              size="small"
              onPress={() => navigation.goBack()}
              icon={<Feather name="arrow-left" size={20} color={TEXT_PRIMARY} />}
            />
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Recipe Details
              </Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          {/* Hero Image */}
          <View style={styles.imageContainer}>
            <SmartRecipeImage
              image={imageUrls}
              variant="large"
              style={styles.heroImage}
              borderRadius={IMAGE_BORDER_RADIUS}
              accessibilityLabel={`${recipe.title} hero image`}
            />
            <View style={styles.imageOverlay}>
              <View style={styles.difficultyBadge}>
                <Text style={styles.difficultyText}>
                  {recipe.difficulty?.toUpperCase() || 'EASY'}
                </Text>
              </View>
            </View>
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.recipeTitle}>{recipe.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Feather name="clock" size={16} color={SECONDARY_COLOR} />
                <Text style={styles.metaText}>{recipe.timeMinutes} min</Text>
              </View>
              {recipe.calories && (
                <View style={styles.metaItem}>
                  <Feather name="zap" size={16} color={SECONDARY_COLOR} />
                  <Text style={styles.metaText}>{recipe.calories} cal</Text>
                </View>
              )}
            </View>
          </View>

          {/* Nutrition Card */}
          {(recipe.nutritionSummary || recipe.nutrition) && (
            <SectionCard title="Nutrition" style={styles.sectionCard}>
              <View style={styles.nutritionGrid}>
                {Object.entries(recipe.nutritionSummary || recipe.nutrition || {}).map(([key, value]) => (
                  <View key={key} style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Text>
                    <Text style={styles.nutritionValue}>
                      {formatNutritionValue(key, value)}
                    </Text>
                  </View>
                ))}
              </View>
            </SectionCard>
          )}

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsRow}>
                {recipe.tags.map((tag: string, index: number) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Save Button */}
          <View style={styles.saveButtonContainer}>
            <SaveButton
              isSaved={isSaved}
              isLoading={saveRecipe.isPending || removeRecipe.isPending}
              onPress={handleSaveToggle}
            />
          </View>

          {/* Ingredients Card */}
          {isLoadingFullRecipe ? (
            <SectionCard
              title="Ingredients"
              icon={<Feather name="list" size={20} color={PRIMARY_COLOR} />}
              style={styles.sectionCard}
            >
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                <Text style={styles.loadingText}>Loading ingredients...</Text>
              </View>
            </SectionCard>
          ) : recipe.ingredients && recipe.ingredients.length > 0 ? (
            <SectionCard
              title={`Ingredients (${recipe.ingredients.length})`}
              icon={<Feather name="list" size={20} color={PRIMARY_COLOR} />}
              style={styles.sectionCard}
            >
              <View style={styles.listContainer}>
                {recipe.ingredients.map((ing: any, index: number) => (
                  <BulletListItem
                    key={index}
                    text={getIngredientText(ing)}
                    bulletColor={PRIMARY_COLOR}
                  />
                ))}
              </View>
            </SectionCard>
          ) : (
            <SectionCard style={styles.sectionCard}>
              <View style={styles.emptyState}>
                <Feather name="info" size={20} color={TEXT_SECONDARY} />
                <Text style={styles.emptyText}>Ingredients not available for this recipe.</Text>
              </View>
            </SectionCard>
          )}

          {/* Instructions Card */}
          {isLoadingFullRecipe ? (
            <SectionCard
              title="Instructions"
              icon={<Feather name="check-circle" size={20} color={PRIMARY_COLOR} />}
              style={styles.sectionCard}
            >
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                <Text style={styles.loadingText}>Loading instructions...</Text>
              </View>
            </SectionCard>
          ) : recipe.steps && (Array.isArray(recipe.steps) ? recipe.steps.length > 0 : Object.keys(recipe.steps).length > 0) ? (
            <SectionCard
              title={`Instructions (${Array.isArray(recipe.steps) ? recipe.steps.length : Object.keys(recipe.steps).length} steps)`}
              icon={<Feather name="check-circle" size={20} color={PRIMARY_COLOR} />}
              style={styles.sectionCard}
            >
              <View style={styles.listContainer}>
                {(Array.isArray(recipe.steps) ? recipe.steps : Object.values(recipe.steps)).map((step: any, index: number) => (
                  <NumberedListItem
                    key={index}
                    number={getStepNumber(step, index)}
                    text={getStepText(step)}
                    numberColor={PRIMARY_COLOR}
                  />
                ))}
              </View>
            </SectionCard>
          ) : (
            <SectionCard style={styles.sectionCard}>
              <View style={styles.emptyState}>
                <Feather name="info" size={20} color={TEXT_SECONDARY} />
                <Text style={styles.emptyText}>Cooking steps not available for this recipe.</Text>
              </View>
            </SectionCard>
          )}

          {/* Bottom spacer */}
          <View style={{ height: 24 }} />
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // Content wrapper - handles max-width for large screens
  contentWrapper: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },

  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  headerTitleContainer: {
    flex: 1,
    minWidth: 0, // CRITICAL: Prevents text overflow in flex row
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SECTION_TITLE_SIZE,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },

  // Hero Image
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: IMAGE_HEIGHT,
    marginBottom: 16,
    borderRadius: IMAGE_BORDER_RADIUS,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  difficultyBadge: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Title Section
  titleSection: {
    marginBottom: 16,
  },
  recipeTitle: {
    fontSize: TITLE_FONT_SIZE,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    lineHeight: 36,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0, // Prevent overflow
  },
  metaText: {
    fontSize: BODY_FONT_SIZE,
    color: TEXT_SECONDARY,
    marginLeft: 6,
  },

  // Section Cards
  sectionCard: {
    marginBottom: SECTION_GAP,
  },

  // Nutrition Grid
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  nutritionItem: {
    minWidth: 80,
  },
  nutritionLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 2,
  },
  nutritionValue: {
    fontSize: BODY_FONT_SIZE,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },

  // Tags
  tagsSection: {
    marginBottom: SECTION_GAP,
  },
  sectionTitle: {
    fontSize: SECTION_TITLE_SIZE,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: `${SECONDARY_COLOR}14`,
    borderWidth: 1,
    borderColor: `${SECONDARY_COLOR}30`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },

  // Save Button
  saveButtonContainer: {
    marginVertical: 16,
  },

  // List containers
  listContainer: {
    gap: 12,
  },

  // Loading state
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginLeft: 10,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
});

export default RecipeDetailScreen;
