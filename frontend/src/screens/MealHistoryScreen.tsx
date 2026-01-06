/**
 * Meal History Screen
 * Displays paginated list of user's meal logs with date filtering
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';
import { TourGuideZone } from 'rn-tourguide';

import { Card, SafeAreaWrapper, Text } from '@/components';
import { MealImage } from '@/components/nutrition/MealImage';
import { MEAL_HISTORY_TOUR_STEP } from '@/config/tourSteps';
import { useMealHistory } from '@/hooks/useMealHistory';
import type { MealHistoryItem } from '@/types/mealHistory';
import { BRAND_COLORS, spacing } from '@/utils';

// Simple date formatting helper (avoiding date-fns dependency)
const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const MealHistoryScreen = () => {
  const navigation = useNavigation();
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, error, refetch, isFetching } = useMealHistory({
    page,
    size: pageSize,
    sort: 'consumedAt,desc', // Most recent first
  });

  // Refetch data when screen comes into focus (for real-time sync after meal snap)
  useFocusEffect(
    useCallback(() => {
      // Reset to first page and refetch when screen is focused
      if (page === 0) {
        refetch();
      } else {
        setPage(0);
      }
    }, [refetch, page])
  );

  const handleLoadMore = () => {
    // Spring Page uses flat structure: data.totalPages, not data.page.totalPages
    if (data && page < data.totalPages - 1 && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  const handleRefresh = () => {
    setPage(0);
    refetch();
  };

  const renderMealItem = ({ item }: { item: MealHistoryItem }) => {
    const dateStr = formatDate(item.consumedAt);
    const timeStr = formatTime(item.consumedAt);

    // Get meal type icon
    const getMealIcon = (type: string) => {
      switch (type.toLowerCase()) {
        case 'breakfast':
          return 'coffee';
        case 'lunch':
          return 'food-apple';
        case 'dinner':
          return 'food-steak';
        case 'snack':
          return 'cookie';
        default:
          return 'silverware-fork-knife';
      }
    };

    return (
      <Card style={styles.mealCard}>
        <View style={styles.mealCardContent}>
          {/* Image on the left */}
          <MealImage
            imageUrl={item.imageUrl}
            size={100}
            borderRadius={12}
            fallbackIcon={getMealIcon(item.mealType)}
            fallbackIconSize={40}
          />

          {/* Details on the right */}
          <View style={styles.mealDetailsContainer}>
            <View style={styles.mealHeader}>
              <View style={styles.mealTypeRow}>
                <MaterialCommunityIcons
                  name={getMealIcon(item.mealType) as any}
                  size={18}
                  color={BRAND_COLORS.primary}
                />
                <Text variant="body" weight="semibold" style={styles.mealType}>
                  {item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)}
                </Text>
              </View>
              <View style={styles.dateTimeContainer}>
                <Text variant="caption" style={styles.dateText}>
                  {dateStr}
                </Text>
                <Text variant="caption" style={styles.timeText}>
                  {timeStr}
                </Text>
              </View>
            </View>

            {/* Food Items */}
            <View style={styles.foodItemsContainer}>
              {item.foodItems?.slice(0, 2).map((food, index) => (
                <View key={index} style={styles.foodItem}>
                  <Text variant="caption" style={styles.foodName} numberOfLines={1}>
                    {food.displayName}
                  </Text>
                  <Text variant="caption" style={styles.foodGrams}>
                    {food.grams}g
                  </Text>
                </View>
              ))}
              {item.foodItems && item.foodItems.length > 2 && (
                <Text variant="caption" style={styles.moreFoods}>
                  +{item.foodItems.length - 2} more
                </Text>
              )}
            </View>

            {/* Nutrition Summary */}
            <View style={styles.nutritionRow}>
              <View style={styles.nutritionItem}>
                <MaterialCommunityIcons name="fire" size={14} color="#EF4444" />
                <Text variant="caption" weight="semibold" style={styles.nutritionValue}>
                  {item.totalCalories}
                </Text>
              </View>

              <View style={styles.nutritionItem}>
                <Text variant="caption" style={styles.nutritionValue}>
                  P: {Math.round(item.totalProtein || 0)}g
                </Text>
              </View>

              <View style={styles.nutritionItem}>
                <Text variant="caption" style={styles.nutritionValue}>
                  C: {Math.round(item.totalCarbs || 0)}g
                </Text>
              </View>

              <View style={styles.nutritionItem}>
                <Text variant="caption" style={styles.nutritionValue}>
                  F: {Math.round(item.totalFat || 0)}g
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notes if present */}
        {item.notes && (
          <View style={styles.notesContainer}>
            <Text variant="caption" style={styles.notesText} numberOfLines={2}>
              {item.notes}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="food-off"
        size={64}
        color={BRAND_COLORS.textSecondary}
      />
      <Text variant="body" style={styles.emptyText}>
        No meal history yet
      </Text>
      <Text variant="caption" style={styles.emptySubtext}>
        Start logging your meals to see them here
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isFetching || page === 0) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={BRAND_COLORS.primary} />
      </View>
    );
  };

  if (error) {
    return (
      <SafeAreaWrapper>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
          <Text variant="body" style={styles.errorText}>
            Failed to load meal history
          </Text>
          <Text variant="caption" style={styles.errorSubtext}>
            {error.message}
          </Text>
          <Pressable style={styles.retryButton} onPress={handleRefresh}>
            <Text variant="body" weight="semibold" style={styles.retryText}>
              Try Again
            </Text>
          </Pressable>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        {/* Header - Tour Zone 4 */}
        <TourGuideZone
          zone={MEAL_HISTORY_TOUR_STEP.zone}
          text={MEAL_HISTORY_TOUR_STEP.text}
          shape="rectangle"
          borderRadius={8}
        >
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Pressable
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={24}
                  color={BRAND_COLORS.textPrimary}
                />
              </Pressable>
              <View style={styles.headerTextContainer}>
                <Text variant="heading2" weight="bold">
                  Meal History
                </Text>
                {data && (
                  <Text variant="caption" style={styles.totalCount}>
                    {data.totalElements} meals logged
                  </Text>
                )}
              </View>
            </View>
          </View>
        </TourGuideZone>

        {/* List */}
        <FlatList
          data={data?.content || []}
          renderItem={renderMealItem}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={isLoading ? null : renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && page === 0}
              onRefresh={handleRefresh}
              tintColor={BRAND_COLORS.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.surfaceVariant,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
    borderRadius: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  totalCount: {
    color: BRAND_COLORS.textSecondary,
    marginTop: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  mealCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  mealCardContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  mealDetailsContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mealTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealType: {
    marginLeft: spacing.xs,
    color: BRAND_COLORS.textPrimary,
  },
  dateTimeContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 11,
  },
  timeText: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  foodItemsContainer: {
    gap: 2,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  foodName: {
    color: BRAND_COLORS.textPrimary,
    flex: 1,
  },
  foodGrams: {
    color: BRAND_COLORS.textSecondary,
  },
  moreFoods: {
    color: BRAND_COLORS.textSecondary,
    fontStyle: 'italic',
    fontSize: 11,
  },
  nutritionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  nutritionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  nutritionValue: {
    color: BRAND_COLORS.textSecondary,
  },
  nutritionLabel: {
    color: BRAND_COLORS.textSecondary,
  },
  notesContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: BRAND_COLORS.surface,
    borderRadius: 8,
  },
  notesText: {
    color: BRAND_COLORS.textSecondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    color: BRAND_COLORS.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    color: BRAND_COLORS.textSecondary,
    marginTop: spacing.xs,
  },
  footerLoader: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    color: BRAND_COLORS.textPrimary,
    marginTop: spacing.md,
  },
  errorSubtext: {
    color: BRAND_COLORS.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
  },
});
