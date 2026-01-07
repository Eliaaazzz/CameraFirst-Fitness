import React, { useCallback, useEffect, useRef, useState } from 'react';

import { TourGuideZone, TourScrollView, useTourGuideController, useTourNavigation } from '@/components/tour/TourProvider';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View
} from 'react-native';

import { Card, SafeAreaWrapper, Text } from '@/components';
import { StateView } from '@/components/common/StateView';
import { MealImage } from '@/components/nutrition/MealImage';
import WelcomeTourCard from '@/components/WelcomeTourCard';
import { DASHBOARD_TOUR_STEPS } from '@/config/tourSteps';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { useTourStatus } from '@/hooks/useTourStatus';
import { GeneratedGoals, GoalType } from '@/services/geminiApi';
import { useGoals, useGoalStatistics } from '@/services/goalsApi';
import { BRAND_COLORS, colors, spacing, useContentBottomPadding } from '@/utils';
import { GENERATED_GOALS_KEY } from './ProfileScreen';

// Goal type display config
const GOAL_TYPE_CONFIG: Record<GoalType, { label: string; icon: string; color: string }> = {
  fat_loss: { label: 'Fat Loss', icon: 'fire', color: '#EF4444' },
  muscle_gain: { label: 'Build Muscle', icon: 'arm-flex', color: '#10B981' },
  diabetes_control: { label: 'Blood Sugar', icon: 'heart-pulse', color: '#3B82F6' },
};

const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId || '';

  const { data: nutritionData, refresh } = useDailyNutrition();
  const goals = useGoals(userId);
  const stats = useGoalStatistics(userId);

  // Tour guide controller and navigation
  const { canStart, start, eventEmitter } = useTourGuideController();
  useTourNavigation(); // Enable cross-screen tour navigation
  const { hasSeenTour, isLoading: tourStatusLoading, markTourComplete, markTourSkipped } = useTourStatus();

  // Calculate proper bottom padding for tab bar
  const contentBottomPadding = useContentBottomPadding(spacing.lg);

  // Fetch personalized recommendations based on fitness goal

  const [refreshing, setRefreshing] = useState(false);
  const [generatedGoals, setGeneratedGoals] = useState<GeneratedGoals | null>(null);
  const lastLoadedGoalsRef = useRef<string | null>(null);
  const [showWelcomeCard, setShowWelcomeCard] = useState(false);

  // Show welcome card for new users
  useEffect(() => {
    if (!tourStatusLoading && !hasSeenTour) {
      setShowWelcomeCard(true);
    }
  }, [tourStatusLoading, hasSeenTour]);

  // Handle tour events
  useEffect(() => {
    const handleStop = () => {
      markTourComplete();
      setShowWelcomeCard(false);
    };

    eventEmitter?.on('stop', handleStop);

    return () => {
      eventEmitter?.off('stop', handleStop);
    };
  }, [eventEmitter, markTourComplete]);

  // Start tour handler
  const handleStartTour = useCallback(() => {
    if (canStart) {
      setShowWelcomeCard(false);
      start();
    }
  }, [canStart, start]);

  // Skip tour handler
  const handleSkipTour = useCallback(() => {
    markTourSkipped();
    setShowWelcomeCard(false);
  }, [markTourSkipped]);

  // Load generated goals from AsyncStorage
  const loadGeneratedGoals = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(GENERATED_GOALS_KEY);
      if (saved && saved !== lastLoadedGoalsRef.current) {
        const parsed = JSON.parse(saved);
        setGeneratedGoals(parsed);
        lastLoadedGoalsRef.current = parsed;
      }
    } catch (error) {
      console.error('Failed to load generated goals:', error);
    }
  }, []);

  // Load goals on focus (so it updates after generation)
  // Note: We intentionally exclude stats from dependencies to prevent infinite loops
  // stats.refetch is a stable function reference from react-query
  useFocusEffect(
    useCallback(() => {
      loadGeneratedGoals();
      refresh();
      stats.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadGeneratedGoals, refresh])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refresh(),
      goals.refetch(),
      stats.refetch(),
      loadGeneratedGoals(),
    ]);
    setRefreshing(false);
  };

  const handleAddFood = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });

    if (Platform.OS === 'web') {
      await handleChooseFromGallery();
      return;
    }

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
      Alert.alert('Add Food', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handleChooseFromGallery },
      ]);
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Camera not supported', 'Please choose a photo from your device on web.');
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        navigation.navigate('ReviewMeal', { imageUri: result.assets[0].uri });
      }
    } catch (err) {
      console.error('Camera capture failed', err);
      Alert.alert('Error', 'Could not take photo');
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Gallery permission is required');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        navigation.navigate('ReviewMeal', { imageUri: result.assets[0].uri });
      }
    } catch (err) {
      console.error('Gallery pick failed', err);
      Alert.alert('Error', 'Could not open gallery');
    }
  };

  // Use generated goals for calorie target if available
  const calorieGoal = generatedGoals?.dailyCalories.target || nutritionData.goal;
  const proteinGoal = generatedGoals?.macros_grams.protein_g || nutritionData.protein.goal;
  const carbsGoal = generatedGoals?.macros_grams.carbs_g || nutritionData.carbs.goal;
  const fatGoal = generatedGoals?.macros_grams.fat_g || nutritionData.fat.goal;
  const netCarbsGoal = nutritionData.netCarbs?.goal || Math.max(0, carbsGoal - 25);
  const normalizedFitnessGoal = generatedGoals?.goalType || currentUser.data?.profile?.fitnessGoal?.toString().toLowerCase();
  const isBloodSugarGoal = normalizedFitnessGoal === 'blood_sugar_control'
    || normalizedFitnessGoal === 'diabetes_control'
    || normalizedFitnessGoal === 'maintain';


  // Calculate progress percentage
  const calorieProgress = calorieGoal > 0
    ? Math.min((nutritionData.calories / calorieGoal) * 100, 100)
    : 0;

  const renderMacroBar = (label: string, current: number, goal: number, color: string) => {
    const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
    return (
      <View style={styles.macroItem}>
        <View style={styles.macroHeader}>
          <Text variant="caption" style={styles.macroLabel}>{label}</Text>
          <Text variant="caption" style={styles.macroValue}>{Math.round(current)}g / {goal}g</Text>
        </View>
        <View style={styles.macroBarBg}>
          <View style={[styles.macroBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  const goalTypeConfig = generatedGoals?.goalType
    ? GOAL_TYPE_CONFIG[generatedGoals.goalType]
    : null;

  if (currentUser.isLoading) {
    return (
      <SafeAreaWrapper>
        <StateView type="loading" title="Loading Dashboard..." />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <TourScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND_COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="caption" style={styles.greeting}>Good day</Text>
            <Text variant="heading1" weight="bold">Dashboard</Text>
          </View>
          <Pressable
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Feather name="user" size={24} color={BRAND_COLORS.textPrimary} />
          </Pressable>
        </View>

        {/* Welcome Tour Card for new users */}
        {showWelcomeCard && (
          <WelcomeTourCard
            onStartTour={handleStartTour}
            onSkip={handleSkipTour}
          />
        )}

        {/* Generated Goals Card (if available) */}
        {generatedGoals && (
          <Card style={styles.goalsCard}>
            <View style={styles.goalsHeader}>
              <View style={styles.goalsHeaderLeft}>
                {goalTypeConfig && (
                  <View style={[styles.goalTypeIcon, { backgroundColor: `${goalTypeConfig.color}20` }]}>
                    <MaterialCommunityIcons
                      name={goalTypeConfig.icon as any}
                      size={20}
                      color={goalTypeConfig.color}
                    />
                  </View>
                )}
                <View>
                  <Text variant="body" weight="bold">Your Goals</Text>
                  {goalTypeConfig && (
                    <Text variant="caption" style={{ color: goalTypeConfig.color }}>
                      {goalTypeConfig.label}
                    </Text>
                  )}
                </View>
              </View>
              <Pressable
                style={styles.editGoalsButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Feather name="edit-2" size={16} color={BRAND_COLORS.primary} />
              </Pressable>
            </View>

            <View style={styles.goalsGrid}>
              <View style={styles.goalItem}>
                <MaterialCommunityIcons name="fire" size={20} color="#EF4444" />
                <Text variant="heading3" weight="bold">{generatedGoals.dailyCalories.target}</Text>
                <Text variant="caption" style={styles.goalItemLabel}>kcal/day</Text>
              </View>
              <View style={styles.goalItem}>
                <MaterialCommunityIcons name="food-steak" size={20} color="#10B981" />
                <Text variant="heading3" weight="bold">{generatedGoals.macros_grams.protein_g}g</Text>
                <Text variant="caption" style={styles.goalItemLabel}>Protein</Text>
              </View>
              <View style={styles.goalItem}>
                <MaterialCommunityIcons name="barley" size={20} color="#F59E0B" />
                <Text variant="heading3" weight="bold">{generatedGoals.macros_grams.carbs_g}g</Text>
                <Text variant="caption" style={styles.goalItemLabel}>Carbs</Text>
              </View>
              <View style={styles.goalItem}>
                <MaterialCommunityIcons name="oil" size={20} color="#EF4444" />
                <Text variant="heading3" weight="bold">{generatedGoals.macros_grams.fat_g}g</Text>
                <Text variant="caption" style={styles.goalItemLabel}>Fat</Text>
              </View>
            </View>

            {/* Activity targets row */}
            <View style={styles.activityRow}>
              <View style={styles.activityItem}>
                <MaterialCommunityIcons name="run" size={16} color="#A78BFA" />
                <Text variant="caption">
                  {generatedGoals.weeklyActivityPlan.cardio_minutes_per_week} min cardio/week
                </Text>
              </View>
              <View style={styles.activityItem}>
                <MaterialCommunityIcons name="shoe-print" size={16} color="#3B82F6" />
                <Text variant="caption">
                  {generatedGoals.weeklyActivityPlan.steps_per_day_target.toLocaleString()} steps/day
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Prompt to set goals if none exist */}
        {!generatedGoals && (
          <Pressable
            style={({ pressed }) => [
              styles.setGoalsPrompt,
              pressed && { opacity: 0.9 },
            ]}
            onPress={() => navigation.navigate('Profile')}
          >
            <LinearGradient
              colors={['rgba(167, 139, 250, 0.15)', 'rgba(244, 114, 182, 0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.setGoalsGradient}
            >
              <MaterialCommunityIcons name="target" size={32} color={BRAND_COLORS.primary} />
              <View style={styles.setGoalsText}>
                <Text variant="body" weight="bold">Set Your Fitness Goals</Text>
                <Text variant="caption" style={styles.setGoalsSubtext}>
                  Get personalized calorie & macro targets
                </Text>
              </View>
              <Feather name="chevron-right" size={24} color={BRAND_COLORS.primary} />
            </LinearGradient>
          </Pressable>
        )}

        {/* Quick Stats */}
        {stats.data && (
          <View style={styles.quickStats}>
            <Card style={styles.statCard}>
              <MaterialCommunityIcons name="fire" size={24} color="#EF4444" />
              <Text variant="heading2" weight="bold">{stats.data.currentStreak}</Text>
              <Text variant="caption" style={styles.statLabel}>Day Streak</Text>
            </Card>
            <Card style={styles.statCard}>
              <MaterialCommunityIcons name="target" size={24} color="#10B981" />
              <Text variant="heading2" weight="bold">{stats.data.activeGoals}</Text>
              <Text variant="caption" style={styles.statLabel}>Active Goals</Text>
            </Card>
            <Card style={styles.statCard}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#A78BFA" />
              <Text variant="heading2" weight="bold">{stats.data.completedGoals}</Text>
              <Text variant="caption" style={styles.statLabel}>Completed</Text>
            </Card>
          </View>
        )}

        {/* Recommendations are now shown on their respective tabs (Workouts/Recipes) */}

        {/* Today's Nutrition Card - Tour Zone 2 */}
        <TourGuideZone
          zone={DASHBOARD_TOUR_STEPS[1].zone}
          text={DASHBOARD_TOUR_STEPS[1].text}
          title={DASHBOARD_TOUR_STEPS[1].title}
          icon="📊"
        >
          <Card style={styles.calorieCard}>
            <View style={styles.calorieHeader}>
              <Text variant="heading3" weight="semibold">Today's Nutrition</Text>
              <Text variant="caption" style={styles.calorieRatio}>
                {Math.round(nutritionData.calories)} / {calorieGoal} kcal
              </Text>
            </View>

            <View style={styles.circularProgress}>
              <View style={styles.progressRing}>
                <LinearGradient
                  colors={['#A78BFA', '#F472B6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.progressArc, {
                    opacity: calorieProgress / 100,
                  }]}
                />
                <View style={styles.progressInner}>
                  <Text variant="heading1" weight="bold" style={styles.calorieText}>
                    {Math.round(calorieProgress)}%
                  </Text>
                  <Text variant="caption" style={styles.calorieSubtext}>of daily goal</Text>
                </View>
              </View>
            </View>

            {/* Macros */}
            <View style={styles.macrosContainer}>
              {renderMacroBar('Protein', nutritionData.protein.current, proteinGoal, '#10B981')}
              {renderMacroBar('Carbs', nutritionData.carbs.current, carbsGoal, '#F59E0B')}
              {renderMacroBar('Fat', nutritionData.fat.current, fatGoal, '#EF4444')}
              {isBloodSugarGoal && renderMacroBar('Net Carbs', nutritionData.netCarbs?.current || 0, netCarbsGoal, '#F59E0B')}
            </View>
          </Card>
        </TourGuideZone>

        {/* Add Food Button - Tour Zone 1 */}
        <TourGuideZone
          zone={DASHBOARD_TOUR_STEPS[0].zone}
          text={DASHBOARD_TOUR_STEPS[0].text}
          title={DASHBOARD_TOUR_STEPS[0].title}
          icon="📸"
        >
          <Pressable
            style={({ pressed }) => [
              styles.addFoodButton,
              pressed && styles.addFoodButtonPressed,
            ]}
            onPress={handleAddFood}
          >
            <LinearGradient
              colors={[BRAND_COLORS.primary, BRAND_COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addFoodGradient}
            >
              <MaterialCommunityIcons name="camera" size={28} color="#FFF" />
              <View style={styles.addFoodTextContainer}>
                <Text variant="body" weight="bold" style={styles.addFoodTitle}>
                  Snap Your Meal
                </Text>
                <Text variant="caption" style={styles.addFoodSubtitle}>
                  AI will analyze nutrition instantly
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
            </LinearGradient>
          </Pressable>
        </TourGuideZone>

        {/* Today's Meals - Tour Zone 3 */}
        <TourGuideZone
          zone={DASHBOARD_TOUR_STEPS[2].zone}
          text={DASHBOARD_TOUR_STEPS[2].text}
          title={DASHBOARD_TOUR_STEPS[2].title}
          icon="🍽️"
        >
          <View style={styles.mealsSection}>
            <Text variant="heading3" weight="semibold" style={styles.sectionTitle}>
              Today's Meals
            </Text>

            {nutritionData.meals.length === 0 ? (
              <Card style={styles.emptyMeals}>
                <MaterialCommunityIcons name="food-off" size={40} color="#6B7280" />
                <Text variant="body" style={styles.emptyMealsText}>
                  No meals logged yet today
                </Text>
                <Text variant="caption" style={styles.emptyMealsHint}>
                  Tap the camera button above to log your first meal
                </Text>
              </Card>
            ) : (
              nutritionData.meals.map((meal) => (
                <Card key={meal.id} style={styles.mealItem}>
                  <MealImage
                    imageUrl={meal.imageUrl}
                    size={80}
                    borderRadius={12}
                  />
                  <View style={styles.mealDetails}>
                    <View style={styles.mealHeader}>
                      <Text variant="body" weight="semibold" numberOfLines={1} style={styles.mealName}>
                        {meal.name}
                      </Text>
                      <Text variant="body" weight="bold" style={styles.mealCalories}>
                        {meal.calories} kcal
                      </Text>
                    </View>
                    <Text variant="caption" style={styles.mealTime}>
                      {new Date(meal.consumedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <View style={styles.mealMacros}>
                      <Text variant="caption" style={styles.mealMacroText}>
                        P: {Math.round(meal.protein || 0)}g
                      </Text>
                      <Text variant="caption" style={styles.mealMacroText}>
                        C: {Math.round(meal.carbs || 0)}g
                      </Text>
                      <Text variant="caption" style={styles.mealMacroText}>
                        F: {Math.round(meal.fat || 0)}g
                      </Text>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        </TourGuideZone>
      </TourScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    // paddingBottom is set dynamically via useContentBottomPadding
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    color: colors.light.textSecondary,
    marginBottom: spacing.xs,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Goals card styles
  goalsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  goalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  goalsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  goalTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editGoalsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  goalItem: {
    alignItems: 'center',
    flex: 1,
  },
  goalItemLabel: {
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  // Set goals prompt
  setGoalsPrompt: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  setGoalsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  setGoalsText: {
    flex: 1,
  },
  setGoalsSubtext: {
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  quickStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  statLabel: {
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
  calorieCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  calorieRatio: {
    color: colors.light.textSecondary,
  },
  circularProgress: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  progressRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressArc: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 70,
  },
  progressInner: {
    alignItems: 'center',
  },
  calorieText: {
    fontSize: 32,
    color: BRAND_COLORS.primary,
  },
  calorieSubtext: {
    color: colors.light.textSecondary,
  },
  macrosContainer: {
    gap: spacing.sm,
  },
  macroItem: {
    gap: spacing.xs,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroLabel: {
    fontWeight: '600',
  },
  macroValue: {
    color: colors.light.textSecondary,
  },
  macroBarBg: {
    height: 8,
    backgroundColor: colors.light.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  addFoodButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  addFoodButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  addFoodGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  addFoodTextContainer: {
    flex: 1,
  },
  addFoodTitle: {
    color: '#FFF',
  },
  addFoodSubtitle: {
    color: 'rgba(255,255,255,0.8)',
  },
  mealsSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  emptyMeals: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyMealsText: {
    color: colors.light.textSecondary,
  },
  emptyMealsHint: {
    color: colors.light.textMuted,
    textAlign: 'center',
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.md,
  },
  mealDetails: {
    flex: 1,
    gap: spacing.xs,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    flex: 1,
    marginRight: spacing.sm,
  },
  mealTime: {
    color: colors.light.textSecondary,
  },
  mealCalories: {
    color: BRAND_COLORS.primary,
  },
  mealMacros: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  mealMacroText: {
    color: colors.light.textSecondary,
  },
});

export default DashboardScreen;
