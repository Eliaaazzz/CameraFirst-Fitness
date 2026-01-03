import { RecipeCard, Text, WorkoutCard } from '@/components';
import type { RecipeCard as Recipe, WorkoutCard as Workout } from '@/types';
import { colors, radii, spacing } from '@/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(280, SCREEN_WIDTH * 0.75);
const CARD_SPACING = spacing.md;

interface RecommendationSectionProps {
  goalLabel: string;
  workouts: Workout[];
  recipes: Recipe[];
  isLoading?: boolean;
  onWorkoutSave?: (id: string) => Promise<boolean> | boolean | void;
  onRecipeSave?: (id: string) => Promise<boolean> | boolean | void;
  onSeeAllWorkouts?: () => void;
  onSeeAllRecipes?: () => void;
}

/**
 * RecommendationSection - Netflix-style horizontal scrolling rows
 * Displays personalized workout and recipe recommendations
 */
export const RecommendationSection = ({
  goalLabel,
  workouts,
  recipes,
  isLoading = false,
  onWorkoutSave,
  onRecipeSave,
  onSeeAllWorkouts,
  onSeeAllRecipes,
}: RecommendationSectionProps) => {
  const dark = colors.dark;

  const renderWorkoutItem = ({ item, index }: { item: Workout; index: number }) => (
    <View style={[styles.cardWrapper, index === 0 && styles.firstCard]}>
      <WorkoutCard item={item} onSave={onWorkoutSave} />
    </View>
  );

  const renderRecipeItem = ({ item, index }: { item: Recipe; index: number }) => (
    <View style={[styles.cardWrapper, index === 0 && styles.firstCard]}>
      <RecipeCard item={item} onSave={onRecipeSave} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={dark.primary} />
        <Text variant="caption" style={styles.loadingText}>
          Finding your personalized recommendations...
        </Text>
      </View>
    );
  }

  const hasContent = workouts.length > 0 || recipes.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <LinearGradient
          colors={[`${dark.primary}20`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <MaterialCommunityIcons name="target" size={20} color={dark.primary} />
          <Text variant="body" weight="semibold" style={styles.headerText}>
            Recommended for {goalLabel}
          </Text>
        </LinearGradient>
      </View>

      {/* Workouts Row */}
      {workouts.length > 0 && (
        <View style={styles.rowContainer}>
          <View style={styles.rowHeader}>
            <View style={styles.rowTitleContainer}>
              <MaterialCommunityIcons name="dumbbell" size={18} color={dark.primary} />
              <Text variant="body" weight="semibold" style={styles.rowTitle}>
                Top Workouts
              </Text>
            </View>
            {onSeeAllWorkouts && (
              <Pressable onPress={onSeeAllWorkouts} style={styles.seeAllButton}>
                <Text variant="caption" style={{ color: dark.primary }}>
                  See All
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={dark.primary} />
              </Pressable>
            )}
          </View>

          <FlatList
            data={workouts}
            keyExtractor={(item) => item.id}
            renderItem={renderWorkoutItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            snapToAlignment="start"
          />
        </View>
      )}

      {/* Recipes Row */}
      {recipes.length > 0 && (
        <View style={styles.rowContainer}>
          <View style={styles.rowHeader}>
            <View style={styles.rowTitleContainer}>
              <MaterialCommunityIcons name="food-apple" size={18} color={dark.secondary} />
              <Text variant="body" weight="semibold" style={styles.rowTitle}>
                Healthy Recipes
              </Text>
            </View>
            {onSeeAllRecipes && (
              <Pressable onPress={onSeeAllRecipes} style={styles.seeAllButton}>
                <Text variant="caption" style={{ color: dark.secondary }}>
                  See All
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={dark.secondary} />
              </Pressable>
            )}
          </View>

          <FlatList
            data={recipes}
            keyExtractor={(item) => item.id}
            renderItem={renderRecipeItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            snapToAlignment="start"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    opacity: 0.6,
  },
  sectionHeader: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  headerText: {
    color: colors.light.textPrimary,
  },
  rowContainer: {
    marginBottom: spacing.lg,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  rowTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowTitle: {
    color: colors.light.textPrimary,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContent: {
    paddingRight: spacing.lg,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginLeft: CARD_SPACING,
    ...(Platform.OS === 'web' && {
      transition: 'transform 0.2s ease',
    }),
  },
  firstCard: {
    marginLeft: spacing.lg,
  },
});

export default RecommendationSection;
