# Nutrition Feature Implementation Guide

## Overview
This guide provides complete implementation details for the AI-powered food recognition feature with two main screens: NutritionScreen and ReviewMealScreen.

## Status
✅ API Layer - COMPLETED
- Extended nutritionApi.ts with analyzeFoodImage() and saveMealFromImage()
- Added types: DetectedFood, FoodRecognitionResponse, SaveMealPayload

🔄 Next Steps - Components & Screens Implementation

## Architecture

### Backend API Endpoints
- `POST /api/v1/nutrition/analyze` - Upload image, get AI analysis
- `POST /api/v1/nutrition/meals` - Save meal log
- `GET /api/v1/nutrition/summary/daily` - Get daily summary

### Frontend Structure
```
src/
  screens/
    NutritionScreen.tsx      ← Main nutrition page
    ReviewMealScreen.tsx     ← AI analysis results page
  components/
    nutrition/
      SummaryCard.tsx           ← Today's nutrition summary
      AddFoodButton.tsx         ← Gradient button with breathing animation
      MealListItem.tsx          ← Individual meal row
      MacroPill.tsx             ← Protein/Carbs/Fat pill
      DetectedItemRow.tsx       ← Food item with amount adjuster
      NutritionSummaryCard.tsx  ← Total nutrition card
  hooks/
    useDailyNutrition.ts      ← Fetch & cache daily data
  services/
    nutritionApi.ts           ← ✅ DONE
```

## Implementation Plan

### Phase 1: Core Hooks & Types ✅
```typescript
// hooks/useDailyNutrition.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import nutritionApi from '@/services/nutritionApi';

export interface DailyNutritionData {
  calories: number;
  goal: number;
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fat: { current: number; goal: number };
  meals: Array<{
    id: string;
    name: string;
    calories: number;
    imageUrl?: string;
    consumedAt: string;
  }>;
}

export function useDailyNutrition() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dailyNutrition'],
    queryFn: async (): Promise<DailyNutritionData> => {
      const summary = await nutritionApi.getDailySummary('default-user');

      // Transform backend response to our format
      return {
        calories: summary.totalCalories || 0,
        goal: 2100, // TODO: Get from user profile
        protein: { current: summary.totalProtein || 0, goal: 150 },
        carbs: { current: summary.totalCarbs || 0, goal: 200 },
        fat: { current: summary.totalFat || 0, goal: 65 },
        meals: summary.meals?.map(m => ({
          id: m.id.toString(),
          name: m.recipeName || 'Unknown',
          calories: m.calories || 0,
          imageUrl: undefined, // TODO: Add image support
          consumedAt: m.consumedAt,
        })) || [],
      };
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dailyNutrition'] });
  };

  return {
    data: data || {
      calories: 0,
      goal: 2100,
      protein: { current: 0, goal: 150 },
      carbs: { current: 0, goal: 200 },
      fat: { current: 0, goal: 65 },
      meals: [],
    },
    isLoading,
    error,
    refresh,
    refetch,
  };
}
```

### Phase 2: UI Components

#### 1. MacroPill Component
```typescript
// components/nutrition/MacroPill.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MacroPillProps {
  label: string;
  current: number;
  goal: number;
  unit?: string;
  color: string;
}

export function MacroPill({ label, current, goal, unit = 'g', color }: MacroPillProps) {
  const percentage = Math.min((current / goal) * 100, 100);

  return (
    <View style={styles.container}>
      <View style={[styles.progress, { width: `${percentage}%`, backgroundColor: color }]} />
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {Math.round(current)}/{goal}{unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    position: 'relative',
  },
  progress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    opacity: 0.2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});
```

#### 2. SummaryCard Component with Animation
```typescript
// components/nutrition/SummaryCard.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { MacroPill } from './MacroPill';

interface SummaryCardProps {
  calories: number;
  goal: number;
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fat: { current: number; goal: number };
}

export function SummaryCard({ calories, goal, protein, carbs, fat }: SummaryCardProps) {
  const progressWidth = useSharedValue(0);
  const caloriesValue = useSharedValue(0);

  useEffect(() => {
    const percentage = Math.min((calories / goal) * 100, 100);
    progressWidth.value = withTiming(percentage, { duration: 600 });
    caloriesValue.value = withTiming(calories, { duration: 800 });
  }, [calories, goal]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const percentage = Math.round((calories / goal) * 100);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })}</Text>
      </View>

      <Text style={styles.calories}>
        {Math.round(calories)} <Text style={styles.caloriesGoal}>of {goal} kcal</Text>
      </Text>

      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>

      <View style={styles.macros}>
        <MacroPill label="Protein" {...protein} color="#E91E63" />
        <MacroPill label="Carbs" {...carbs} color="#9C27B0" />
        <MacroPill label="Fat" {...fat} color="#673AB7" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  date: {
    fontSize: 14,
    color: '#999',
  },
  calories: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  caloriesGoal: {
    fontSize: 18,
    fontWeight: '400',
    color: '#999',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9C27B0',
    borderRadius: 4,
  },
  macros: {
    gap: 8,
  },
});
```

#### 3. AddFoodButton with Breathing Animation
```typescript
// components/nutrition/AddFoodButton.tsx
import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface AddFoodButtonProps {
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AddFoodButton({ onPress }: AddFoodButtonProps) {
  const scale = useSharedValue(1);
  const breathingScale = useSharedValue(1);

  // Breathing animation
  useEffect(() => {
    breathingScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      false
    );
  }, []);

  const breathingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingScale.value * scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 100 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, breathingStyle]}
    >
      <LinearGradient
        colors={['#E91E63', '#9C27B0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Ionicons name="camera" size={24} color="#FFF" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Add food with photo</Text>
          <Text style={styles.subtitle}>Take a photo or choose from gallery</Text>
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
});
```

#### 4. MealListItem Component
```typescript
// components/nutrition/MealListItem.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';

interface Meal {
  id: string;
  name: string;
  calories: number;
  imageUrl?: string;
  consumedAt: string;
}

interface MealListItemProps {
  meal: Meal;
  onPress?: () => void;
}

export function MealListItem({ meal, onPress }: MealListItemProps) {
  const time = new Date(meal.consumedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      {meal.imageUrl ? (
        <Image source={{ uri: meal.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>🍽️</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {meal.name}
        </Text>
        <Text style={styles.time}>{time}</Text>
      </View>

      <Text style={styles.calories}>{Math.round(meal.calories)} kcal</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pressed: {
    backgroundColor: '#F5F5F5',
    transform: [{ scale: 0.98 }],
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },
  placeholder: {
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  time: {
    fontSize: 13,
    color: '#999',
  },
  calories: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9C27B0',
  },
});
```

### Phase 3: NutritionScreen Implementation
```typescript
// screens/NutritionScreen.tsx
import React, { useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  StyleSheet,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { SummaryCard } from '@/components/nutrition/SummaryCard';
import { AddFoodButton } from '@/components/nutrition/AddFoodButton';
import { MealListItem } from '@/components/nutrition/MealListItem';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';

export function NutritionScreen({ navigation }: any) {
  const { data, refresh } = useDailyNutrition();

  useFocusEffect(
    useCallback(() => {
      // Refresh when returning from ReviewMeal screen
      refresh();
    }, [refresh])
  );

  const handleAddPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await handleTakePhoto();
          } else if (buttonIndex === 2) {
            await handleChooseFromGallery();
          }
        }
      );
    } else {
      Alert.alert(
        'Add Food',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: handleTakePhoto },
          { text: 'Choose from Gallery', onPress: handleChooseFromGallery },
        ]
      );
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      navigation.navigate('ReviewMeal', { imageUri: result.assets[0].uri });
    }
  };

  const handleChooseFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      navigation.navigate('ReviewMeal', { imageUri: result.assets[0].uri });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nutrition</Text>
      </View>

      <ScrollView>
        <SummaryCard
          calories={data.calories}
          goal={data.goal}
          protein={data.protein}
          carbs={data.carbs}
          fat={data.fat}
        />

        <AddFoodButton onPress={handleAddPress} />

        <View style={styles.mealsSection}>
          <Text style={styles.sectionTitle}>Today's meals</Text>
          {data.meals.length === 0 ? (
            <Text style={styles.emptyText}>No meals logged yet</Text>
          ) : (
            data.meals.map((meal) => (
              <MealListItem key={meal.id} meal={meal} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  mealsSection: {
    marginTop: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 16,
  },
});
```

### Phase 4: ReviewMealScreen Components

#### DetectedItemRow
```typescript
// components/nutrition/DetectedItemRow.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DetectedFood } from '@/services/nutritionApi';

interface DetectedItemRowProps {
  item: DetectedFood;
  onIncrease: () => void;
  onDecrease: () => void;
}

export function DetectedItemRow({ item, onIncrease, onDecrease }: DetectedItemRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.nutrition}>
          {Math.round(item.calories)} kcal · {Math.round(item.protein)}g protein
        </Text>
      </View>

      <View style={styles.amountControl}>
        <Pressable onPress={onDecrease} style={styles.button}>
          <Text style={styles.buttonText}>-</Text>
        </Pressable>
        <Text style={styles.amount}>
          {item.amount} {item.unit}
        </Text>
        <Pressable onPress={onIncrease} style={styles.button}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  nutrition: {
    fontSize: 13,
    color: '#999',
  },
  amountControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9C27B0',
  },
  amount: {
    fontSize: 15,
    fontWeight: '500',
    minWidth: 60,
    textAlign: 'center',
  },
});
```

#### NutritionSummaryCard
```typescript
// components/nutrition/NutritionSummaryCard.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

interface Total {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionSummaryCardProps {
  total: Total;
}

export function NutritionSummaryCard({ total }: NutritionSummaryCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(100, withTiming(0, { duration: 400 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Text style={styles.title}>Total for this meal</Text>
      <Text style={styles.calories}>{Math.round(total.calories)} kcal</Text>
      <Text style={styles.macros}>
        Protein {Math.round(total.protein)}g · Carbs {Math.round(total.carbs)}g · Fat {Math.round(total.fat)}g
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  calories: {
    fontSize: 36,
    fontWeight: '700',
    color: '#9C27B0',
    marginBottom: 8,
  },
  macros: {
    fontSize: 14,
    color: '#999',
  },
});
```

### Phase 5: ReviewMealScreen Implementation
```typescript
// screens/ReviewMealScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import nutritionApi, { DetectedFood, FoodRecognitionResponse } from '@/services/nutritionApi';
import { DetectedItemRow } from '@/components/nutrition/DetectedItemRow';
import { NutritionSummaryCard } from '@/components/nutrition/NutritionSummaryCard';

export function ReviewMealScreen({ route, navigation }: any) {
  const { imageUri } = route.params;
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [items, setItems] = useState<DetectedFood[]>([]);
  const [total, setTotal] = useState<FoodRecognitionResponse['total'] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(2), 1200);
    const timer2 = setTimeout(() => setPhase(3), 2400);

    const analyze = async () => {
      try {
        const response = await nutritionApi.analyzeFoodImage(imageUri);
        setItems(response.detectedFoods);
        setTotal(response.total);
      } catch (error) {
        console.error('Food analysis failed:', error);
        Alert.alert('Error', 'Failed to analyze the image. Please try again.');
        navigation.goBack();
      } finally {
        setLoading(false);
        clearTimeout(timer1);
        clearTimeout(timer2);
      }
    };

    analyze();

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [imageUri]);

  const handleAmountChange = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newAmount = Math.max(0, item.amount + delta);
          const ratio = newAmount / item.amount;

          return {
            ...item,
            amount: newAmount,
            calories: item.calories * ratio,
            protein: item.protein * ratio,
            carbs: item.carbs * ratio,
            fat: item.fat * ratio,
          };
        }
        return item;
      })
    );

    // Recalculate total
    const newTotal = items.reduce(
      (acc, item) => {
        if (item.id === id) {
          const newAmount = Math.max(0, item.amount + delta);
          const ratio = newAmount / item.amount;
          return {
            calories: acc.calories + item.calories * (ratio - 1),
            protein: acc.protein + item.protein * (ratio - 1),
            carbs: acc.carbs + item.carbs * (ratio - 1),
            fat: acc.fat + item.fat * (ratio - 1),
          };
        }
        return acc;
      },
      total || { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    setTotal(newTotal);
  };

  const handleSave = async () => {
    if (!total) return;

    setSaving(true);
    try {
      await nutritionApi.saveMealFromImage({
        imageUri,
        detectedFoods: items,
        total,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Meal saved to today!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Nutrition'),
        },
      ]);
    } catch (error) {
      console.error('Save failed:', error);
      Alert.alert('Error', 'Failed to save meal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const loadingText =
    phase === 1
      ? 'Detecting food…'
      : phase === 2
      ? 'Estimating portion size…'
      : 'Calculating nutrition…';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Review your meal</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} />
          <View style={styles.photoTag}>
            <Text style={styles.photoTagText}>Photo</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9C27B0" />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Detected items</Text>
            {items.map((item) => (
              <DetectedItemRow
                key={item.id}
                item={item}
                onIncrease={() => handleAmountChange(item.id, 10)}
                onDecrease={() => handleAmountChange(item.id, -10)}
              />
            ))}

            {total && <NutritionSummaryCard total={total} />}
          </>
        )}
      </ScrollView>

      {!loading && (
        <View style={styles.bottomBar}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save to today</Text>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    paddingBottom: 100,
  },
  imageContainer: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  photoTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  photoTagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  saveButton: {
    backgroundColor: '#9C27B0',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
```

### Phase 6: Navigation Updates
```typescript
// navigation/AppNavigator.tsx
// Add to your stack navigator:

import { NutritionScreen } from '@/screens/NutritionScreen';
import { ReviewMealScreen } from '@/screens/ReviewMealScreen';

// In your Stack.Navigator:
<Stack.Screen
  name="Nutrition"
  component={NutritionScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="ReviewMeal"
  component={ReviewMealScreen}
  options={{ headerShown: false }}
/>
```

## Testing Checklist
- [ ] Backend API responds to /api/v1/nutrition/analyze
- [ ] Image upload works from camera
- [ ] Image upload works from gallery
- [ ] Detected items display correctly
- [ ] Amount adjustment updates totals
- [ ] Save meal logs to database
- [ ] Return to Nutrition screen refreshes data
- [ ] All animations work smoothly
- [ ] Haptic feedback works

## Next Steps
1. Create each component file from the code above
2. Test NutritionScreen standalone
3. Test ReviewMealScreen with sample image
4. Verify backend integration
5. Add error handling and edge cases
6. Polish animations and transitions

## Notes
- All components use Reanimated 3 for smooth animations
- Haptic feedback requires Expo Haptics
- Image picker requires permissions
- Backend must have ANTHROPIC_API_KEY configured
