import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  Platform,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  ZoomIn,
} from 'react-native-reanimated';

interface Food {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  imageUrl?: string;
  consumedAt: string;
}

interface TodaysMealDetailProps {
  meals: Food[];
  totalCalories: number;
  onClose: () => void;
  onEditMeal?: (mealId: string) => void;
}

export function TodaysMealDetail({
  meals,
  totalCalories,
  onClose,
  onEditMeal,
}: TodaysMealDetailProps) {
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);

  const getMealTime = (consumedAt: string) => {
    const date = new Date(consumedAt);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderMealItem = ({ item: meal, index }: { item: Food; index: number }) => {
    const isSelected = selectedMealId === meal.id;

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        style={styles.mealItemContainer}
      >
        <Pressable
          style={[
            styles.mealItem,
            isSelected && styles.mealItemSelected,
          ]}
          onPress={() => setSelectedMealId(isSelected ? null : meal.id)}
        >
          {/* Food Image */}
          <View style={styles.mealImageWrapper}>
            {meal.imageUrl ? (
              <Image
                source={{ uri: meal.imageUrl }}
                style={styles.mealImage}
              />
            ) : (
              <View style={[styles.mealImage, styles.mealImagePlaceholder]}>
                <Text style={styles.placeholderEmoji}>🍽️</Text>
              </View>
            )}
          </View>

          {/* Meal Info */}
          <View style={styles.mealInfo}>
            <Text style={styles.mealName} numberOfLines={2}>
              {meal.name}
            </Text>
            <Text style={styles.mealTime}>{getMealTime(meal.consumedAt)}</Text>

            {/* Macro info on hover/selected */}
            {isSelected && (
              <View style={styles.macrosPreview}>
                {meal.protein && (
                  <Text style={styles.macroText}>
                    🥛 <Text style={styles.macroValue}>{meal.protein.toFixed(1)}g</Text> protein
                  </Text>
                )}
                {meal.carbs && (
                  <Text style={styles.macroText}>
                    🌾 <Text style={styles.macroValue}>{meal.carbs.toFixed(1)}g</Text> carbs
                  </Text>
                )}
                {meal.fat && (
                  <Text style={styles.macroText}>
                    🧈 <Text style={styles.macroValue}>{meal.fat.toFixed(1)}g</Text> fat
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Calories Badge */}
          <View style={styles.caloriesBadge}>
            <Text style={styles.caloriesText}>
              {Math.round(meal.calories)}
            </Text>
            <Text style={styles.caloriesUnit}>kcal</Text>
          </View>

          {/* Edit Button */}
          {onEditMeal && (
            <Pressable
              style={({ pressed }) => [
                styles.editButton,
                pressed && styles.editButtonPressed,
              ]}
              onPress={() => onEditMeal(meal.id)}
            >
              <Text style={styles.editButtonText}>✎</Text>
            </Pressable>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <Animated.View
      style={styles.container}
      entering={ZoomIn.springify()}
      exiting={FadeOutUp}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Today's Meals</Text>
            <Text style={styles.headerSubtitle}>
              {meals.length} meal{meals.length !== 1 ? 's' : ''} logged
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Calories</Text>
          <Text style={styles.summaryValue}>
            {Math.round(totalCalories)}
            <Text style={styles.summaryUnit}> kcal</Text>
          </Text>
        </View>

        {/* Meals List */}
        {meals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>No meals logged yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add your first meal</Text>
          </View>
        ) : (
          <FlatList
            data={meals}
            renderItem={renderMealItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={true}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    marginTop: Platform.OS === 'web' ? 0 : 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryUnit: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  mealItemContainer: {
    marginBottom: 12,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mealItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mealImageWrapper: {
    marginRight: 12,
  },
  mealImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  mealImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  macrosPreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  macroText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  macroValue: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  caloriesBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    paddingHorizontal: 8,
  },
  caloriesText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  caloriesUnit: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButtonPressed: {
    backgroundColor: 'rgba(76, 175, 80, 0.35)',
  },
  editButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});
