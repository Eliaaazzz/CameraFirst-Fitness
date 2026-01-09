import { Button, Card, Container, SafeAreaWrapper, Text } from '@/components';
import { SmartRecipeImage } from '@/components/RecipeImage';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useRecipeById, useRemoveRecipe, useSavedRecipes, useSaveRecipe } from '@/services';
import type { RecipeImageUrls } from '@/types';
import { radii, spacing } from '@/utils';
import { getTheme } from '@/utils/theme';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

// Default food images for recipes without images (using reliable Unsplash source URLs)
const DEFAULT_FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
];

/**
 * Get a placeholder image based on recipe ID
 */
function getPlaceholderImageUrls(id: string, title: string): RecipeImageUrls {
  const seed = id || title;
  const hash = seed.split('').reduce((acc, char, idx) => acc + (char.codePointAt(0) || 0) * (idx + 1), 0);
  const url = DEFAULT_FOOD_IMAGES[hash % DEFAULT_FOOD_IMAGES.length];
  return { thumb: url, medium: url, large: url };
}

/**
 * Format nutrition value with appropriate unit
 */
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

export const RecipeDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const routeRecipe = route.params?.recipe;

  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const savedRecipes = useSavedRecipes(userId);
  const saveRecipe = useSaveRecipe(userId);
  const removeRecipe = useRemoveRecipe(userId);

  // Check if we need to fetch full recipe (missing ingredients or steps)
  const needsFullRecipe = routeRecipe && (
    !routeRecipe.ingredients ||
    routeRecipe.ingredients.length === 0 ||
    !routeRecipe.steps ||
    (Array.isArray(routeRecipe.steps) && routeRecipe.steps.length === 0) ||
    (typeof routeRecipe.steps === 'object' && Object.keys(routeRecipe.steps).length === 0)
  );

  // Fetch full recipe details if needed
  const fullRecipeQuery = useRecipeById(needsFullRecipe ? routeRecipe?.id : undefined);

  // Use full recipe if available, otherwise use route recipe
  const recipe = fullRecipeQuery.data || routeRecipe;

  const isSaved = savedRecipes.data?.some((r) => r.id === recipe?.id) ?? false;

  // Build image URLs with fallback
  const imageUrls = useMemo((): RecipeImageUrls => {
    if (recipe?.image) {
      return recipe.image;
    }
    if (recipe?.imageUrl) {
      return {
        thumb: recipe.imageUrl,
        medium: recipe.imageUrl,
        large: recipe.imageUrl,
      };
    }
    // Provide placeholder if no image available
    return getPlaceholderImageUrls(recipe?.id || '', recipe?.title || '');
  }, [recipe]);

  if (!routeRecipe) {
    return (
      <SafeAreaWrapper>
        <Container>
          <Card>
            <Text variant="body">Recipe not found</Text>
            <Button title="Go Back" onPress={() => navigation.goBack()} />
          </Card>
        </Container>
      </SafeAreaWrapper>
    );
  }

  // Always use light mode
  const theme = getTheme('light');
  const isLoadingFullRecipe = needsFullRecipe && fullRecipeQuery.isLoading;

  const handleSaveToggle = async () => {
    if (isSaved) {
      await removeRecipe.mutateAsync(recipe.id);
    } else {
      await saveRecipe.mutateAsync(recipe.id);
    }
  };

  return (
    <SafeAreaWrapper>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
        showsVerticalScrollIndicator={true}
        bounces={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* Header with Back Button */}
        <View style={styles.headerBar}>
          <Button
            title=""
            variant="outline"
            size="small"
            onPress={() => navigation.goBack()}
            icon={<Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />}
          />
          <Text variant="heading3" weight="semibold" style={{ flex: 1, textAlign: 'center' }}>
            Recipe Details
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <SmartRecipeImage
            image={imageUrls}
            variant="large"
            style={styles.heroImage}
            borderRadius={0}
            accessibilityLabel={`${recipe.title} hero image`}
          />
          <View style={styles.imageOverlay}>
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
              <Text variant="label" style={{ color: '#FFF' }}>
                {recipe.difficulty?.toUpperCase() || 'EASY'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.lg }}>
          {/* Title & Quick Info */}
          <View style={styles.titleSection}>
            <Text variant="heading1" weight="bold" style={{ color: theme.colors.textPrimary }}>
              {recipe.title}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Feather name="clock" size={16} color={theme.colors.textSecondary} />
                <Text variant="body" style={{ color: theme.colors.textSecondary, marginLeft: 4 }}>
                  {recipe.timeMinutes} min
                </Text>
              </View>
              {recipe.calories && (
                <View style={styles.metaItem}>
                  <Feather name="zap" size={16} color={theme.colors.textSecondary} />
                  <Text variant="body" style={{ color: theme.colors.textSecondary, marginLeft: 4 }}>
                    {recipe.calories} cal
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Nutrition Summary */}
          {(recipe.nutritionSummary || recipe.nutrition) && (
            <Card style={styles.nutritionCard}>
              <Text variant="heading3" weight="semibold" style={{ marginBottom: spacing.sm }}>
                Nutrition
              </Text>
              <View style={styles.nutritionGrid}>
                {Object.entries(recipe.nutritionSummary || recipe.nutrition || {}).map(([key, value]) => (
                  <View key={key} style={styles.nutritionItem}>
                    <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Text>
                    <Text variant="body" weight="semibold">
                      {formatNutritionValue(key, value)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text variant="heading3" weight="semibold" style={{ marginBottom: spacing.sm }}>
                Tags
              </Text>
              <View style={styles.tagsRow}>
                {recipe.tags.map((tag: string, index: number) => (
                  <View key={index} style={[styles.tag, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              title={isSaved ? 'Saved to Library' : 'Save to Library'}
              variant={isSaved ? 'secondary' : 'primary'}
              onPress={handleSaveToggle}
              loading={saveRecipe.isPending || removeRecipe.isPending}
              icon={
                isSaved ? (
                  <View style={{ backgroundColor: theme.colors.primary, borderRadius: 4, padding: 2 }}>
                    <Feather name="check" size={14} color="#FFF" />
                  </View>
                ) : (
                  <Feather name="bookmark" size={18} color="#FFF" />
                )
              }
            />
          </View>

          {/* Ingredients Section */}
          {isLoadingFullRecipe ? (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Feather name="list" size={20} color={theme.colors.primary} />
                <Text variant="heading3" weight="semibold" style={{ marginLeft: spacing.sm }}>
                  Ingredients
                </Text>
              </View>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text variant="caption" style={{ color: theme.colors.textSecondary, marginLeft: spacing.sm }}>
                  Loading ingredients...
                </Text>
              </View>
            </Card>
          ) : recipe.ingredients && recipe.ingredients.length > 0 ? (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Feather name="list" size={20} color={theme.colors.primary} />
                <Text variant="heading3" weight="semibold" style={{ marginLeft: spacing.sm }}>
                  Ingredients ({recipe.ingredients.length})
                </Text>
              </View>
              <View style={styles.ingredientsList}>
                {recipe.ingredients.map((ing: any, index: number) => {
                  // Handle both object format {name, quantity, unit} and string format
                  const isString = typeof ing === 'string';
                  const name = isString ? ing : ing.name;
                  const quantity = isString ? null : ing.quantity;
                  const unit = isString ? null : ing.unit;

                  return (
                    <View key={index} style={styles.ingredientItem}>
                      <View style={[styles.ingredientBullet, { backgroundColor: theme.colors.primary }]} />
                      <Text variant="body" style={{ flex: 1 }}>
                        {quantity ? `${quantity} ` : ''}
                        {unit ? `${unit} ` : ''}
                        {name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : (
            <Card style={styles.infoCard}>
              <Feather name="info" size={20} color={theme.colors.textSecondary} style={{ marginBottom: spacing.xs }} />
              <Text variant="body" style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
                Ingredients not available for this recipe.
              </Text>
            </Card>
          )}

          {/* Steps Section */}
          {isLoadingFullRecipe ? (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Feather name="check-circle" size={20} color={theme.colors.primary} />
                <Text variant="heading3" weight="semibold" style={{ marginLeft: spacing.sm }}>
                  Instructions
                </Text>
              </View>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text variant="caption" style={{ color: theme.colors.textSecondary, marginLeft: spacing.sm }}>
                  Loading instructions...
                </Text>
              </View>
            </Card>
          ) : recipe.steps && (Array.isArray(recipe.steps) ? recipe.steps.length > 0 : Object.keys(recipe.steps).length > 0) ? (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Feather name="check-circle" size={20} color={theme.colors.primary} />
                <Text variant="heading3" weight="semibold" style={{ marginLeft: spacing.sm }}>
                  Instructions ({Array.isArray(recipe.steps) ? recipe.steps.length : Object.keys(recipe.steps).length} steps)
                </Text>
              </View>
              <View style={styles.stepsList}>
                {(Array.isArray(recipe.steps) ? recipe.steps : Object.values(recipe.steps)).map((step: any, index: number) => {
                  // Handle multiple formats: string, {instruction}, {description}, {step, instruction}
                  let stepText = '';
                  if (typeof step === 'string') {
                    stepText = step;
                  } else if (step.instruction) {
                    stepText = step.instruction;
                  } else if (step.description) {
                    stepText = step.description;
                  } else if (step.text) {
                    stepText = step.text;
                  } else {
                    stepText = JSON.stringify(step);
                  }

                  // Use step number from object if available, otherwise use index
                  const stepNumber = step.step || index + 1;

                  return (
                    <View key={index} style={styles.stepItem}>
                      <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
                        <Text variant="label" style={{ color: '#FFF' }}>{stepNumber}</Text>
                      </View>
                      <Text variant="body" style={{ flex: 1, lineHeight: 24 }}>
                        {stepText}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : (
            <Card style={styles.infoCard}>
              <Feather name="info" size={20} color={theme.colors.textSecondary} style={{ marginBottom: spacing.xs }} />
              <Text variant="body" style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
                Cooking steps not available for this recipe.
              </Text>
            </Card>
          )}

          <View style={{ height: spacing.xl }} />
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 280,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  titleSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutritionCard: {
    marginBottom: spacing.md,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  nutritionItem: {
    minWidth: 80,
  },
  tagsSection: {
    marginBottom: spacing.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  actions: {
    marginVertical: spacing.lg,
  },
  infoCard: {
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ingredientsList: {
    gap: spacing.sm,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ingredientBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepsList: {
    gap: spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RecipeDetailScreen;



























