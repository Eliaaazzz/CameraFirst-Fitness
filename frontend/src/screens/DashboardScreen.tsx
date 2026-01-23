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


import { Ionicons } from '@expo/vector-icons';

import { Card, SafeAreaWrapper, Text } from '@/components';
import { StateView } from '@/components/common/StateView';
import { DashboardWidgets } from '@/components/dashboard';
import { ScreenLayout } from '@/components/layout';
import { MealImage } from '@/components/nutrition/MealImage';
import { NutritionRingsCard } from '@/components/nutrition/NutritionRingsCard';
import WelcomeTourCard from '@/components/WelcomeTourCard';
import { DASHBOARD_TOUR_STEPS } from '@/config/tourSteps';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTourStatus } from '@/hooks/useTourStatus';
import { GeneratedGoals, GoalType } from '@/services/geminiApi';
import { useGoals, useGoalStatistics } from '@/services/goalsApi';
import { BRAND_COLORS, colors, saasShadows, spacing, useContentBottomPadding, useRightPanelVisible, useSidebarVisible } from '@/utils';
import { GENERATED_GOALS_KEY } from './ProfileScreen';

// Goal type display config - using target/flag icons to differentiate from streak's fire
const GOAL_TYPE_CONFIG: Record<GoalType, { label: string; icon: string; color: string }> = {
  fat_loss: { label: 'Fat Loss', icon: 'target', color: '#EF4444' },
  muscle_gain: { label: 'Build Muscle', icon: 'flag-checkered', color: '#10B981' },
  diabetes_control: { label: 'Glucose Control', icon: 'water', color: '#3B82F6' }, // Changed from heart-pulse to water (blood drop)
};

const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId || '';
  const showRightPanel = useRightPanelVisible();
  const showSidebar = useSidebarVisible(); // Desktop mode detection

  const { data: nutritionData, refresh } = useDailyNutrition();
  const goals = useGoals(userId);
  const stats = useGoalStatistics(userId);


  // Tour guide controller and navigation
  const { canStart, start, eventEmitter } = useTourGuideController();
  useTourNavigation(); // Register navigation callback for cross-screen tour steps

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
      currentUser.refetch(); // Refresh user data (username, streak, etc.)
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
      currentUser.refetch(),
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

  // Enable keyboard shortcuts on desktop
  useKeyboardShortcuts({
    onAddFood: handleAddFood,
  });

  // Use generated goals for calorie target if available
  const calorieGoal = generatedGoals?.dailyCalories.target || nutritionData.goal;
  const proteinGoal = generatedGoals?.macros_grams.protein_g || nutritionData.protein.goal;
  const carbsGoal = generatedGoals?.macros_grams.carbs_g || nutritionData.carbs.goal;
  const fatGoal = generatedGoals?.macros_grams.fat_g || nutritionData.fat.goal;

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

  // Render right panel widgets (only shown on wide screens)
  const renderRightPanel = () => (
    <DashboardWidgets
      generatedGoals={generatedGoals}
      currentStreak={currentUser.data?.currentStreak || 0}
    />
  );

  return (
    <SafeAreaWrapper>
      <ScreenLayout rightPanel={renderRightPanel()} scrollable={false}>
        <TourScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
          screenName="Dashboard"
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
            <View style={styles.headerLeft}>
              <Text variant="caption" style={styles.greeting}>Good day,</Text>
              <View style={styles.nameRow}>
                <Text variant="heading1" weight="bold" style={styles.userName}>
                  {currentUser.data?.username || 'User'}
                </Text>
                <LinearGradient
                  colors={['#FCD34D', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.streakBadge}
                >
                  <Ionicons name="flame" size={16} color="#FFFFFF" />
                  <Text style={styles.streakText}>
                    {currentUser.data?.currentStreak || 0}
                  </Text>
                </LinearGradient>
              </View>
            </View>
            {/* Hide profile button on desktop (use sidebar instead) */}
            {!showRightPanel && (
              <Pressable
                style={styles.profileButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Feather name="user" size={24} color={BRAND_COLORS.textPrimary} />
              </Pressable>
            )}
          </View>

          {/* Welcome Tour Card for new users */}
          {showWelcomeCard && (
            <WelcomeTourCard
              onStartTour={handleStartTour}
              onSkip={handleSkipTour}
            />
          )}

          {/* Generated Goals Card - only show on mobile/tablet (shown in right panel on desktop) */}
          {!showRightPanel && generatedGoals && (
          <Card style={styles.goalsCard}>
            {/* Header: Top-left aligned with icon + title */}
            <View style={styles.goalsHeader}>
              <View style={styles.goalsHeaderLeft}>
                {goalTypeConfig && (
                  <View style={[styles.goalTypeIconSmall, { backgroundColor: `${goalTypeConfig.color}15` }]}>
                    <MaterialCommunityIcons
                      name={goalTypeConfig.icon as any}
                      size={20}
                      color={goalTypeConfig.color}
                    />
                  </View>
                )}
                <View>
                  <Text variant="caption" style={styles.goalLabel}>Your Goal</Text>
                  {goalTypeConfig && (
                    <Text variant="body" weight="bold" style={{ color: goalTypeConfig.color }}>
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

          {/* Prompt to set goals if none exist - only on mobile/tablet */}
          {!showRightPanel && !generatedGoals && (
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

        {/* Recommendations are now shown on their respective tabs (Workouts/Recipes) */}

        {/* Today's Nutrition Card - Tour Zone 2 */}
        <TourGuideZone
          zone={DASHBOARD_TOUR_STEPS[1].zone}
          text={DASHBOARD_TOUR_STEPS[1].text}
          title={DASHBOARD_TOUR_STEPS[1].title}
          icon="📊"
        >
          <NutritionRingsCard
            data={{
              calories: { current: nutritionData.calories, target: calorieGoal },
              protein: { current: nutritionData.protein.current, target: proteinGoal },
              carbs: { current: nutritionData.carbs.current, target: carbsGoal },
              fat: { current: nutritionData.fat.current, target: fatGoal },
            }}
            showFat={true}
          />
        </TourGuideZone>

        {/* Add Food Button - Tour Zone 1 (Mobile only - hidden on desktop) */}
        {!showSidebar && (
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
        )}

        {/* Today's Meals - Tour Zone 3 */}
        <TourGuideZone
          zone={DASHBOARD_TOUR_STEPS[2].zone}
          text={DASHBOARD_TOUR_STEPS[2].text}
          title={DASHBOARD_TOUR_STEPS[2].title}
          icon="🍽️"
        >
          {/* Unified card wrapper matching NutritionRingsCard style */}
          <View style={styles.mealsCard}>
            {/* Header - matches NutritionRingsCard header */}
            <View style={styles.mealsHeader}>
              <View>
                <Text variant="heading3" weight="bold" style={styles.mealsTitle}>
                  Today's Meals
                </Text>
                <Text variant="caption" style={styles.mealsSubtitle}>
                  {nutritionData.meals.length} {nutritionData.meals.length === 1 ? 'meal' : 'meals'} logged
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.logMealButton,
                  pressed && styles.logMealButtonPressed,
                ]}
                onPress={handleAddFood}
              >
                <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
                <Text variant="caption" weight="semibold" style={styles.logMealButtonText}>
                  Log Meal
                </Text>
              </Pressable>
            </View>

            {nutritionData.meals.length === 0 ? (
              <Pressable
                style={({ pressed }) => [
                  styles.emptyMealsContent,
                  pressed && styles.emptyMealsContentPressed,
                ]}
                onPress={handleAddFood}
              >
                <View style={styles.emptyMealsIconContainer}>
                  <MaterialCommunityIcons name="camera-plus" size={28} color={BRAND_COLORS.primary} />
                </View>
                <View style={styles.emptyMealsTextContainer}>
                  <Text variant="body" weight="semibold" style={styles.emptyMealsTitle}>
                    Upload a photo to get started
                  </Text>
                  <Text variant="caption" style={styles.emptyMealsHint}>
                    AI will analyze your macros instantly
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={BRAND_COLORS.primary} />
              </Pressable>
            ) : (
              <View style={styles.mealsList}>
                {nutritionData.meals.map((meal) => (
                  <View key={meal.id} style={styles.mealItem}>
                    <MealImage
                      imageUrl={meal.imageUrl}
                      size={56}
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
                      <View style={styles.mealMetaRow}>
                        <Text variant="caption" style={styles.mealTime}>
                          {new Date(meal.consumedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <View style={styles.mealMacros}>
                          <Text variant="caption" style={styles.mealMacroText}>
                            P {Math.round(meal.protein || 0)}g
                          </Text>
                          <Text variant="caption" style={styles.mealMacroDivider}>·</Text>
                          <Text variant="caption" style={styles.mealMacroText}>
                            C {Math.round(meal.carbs || 0)}g
                          </Text>
                          <Text variant="caption" style={styles.mealMacroDivider}>·</Text>
                          <Text variant="caption" style={styles.mealMacroText}>
                            F {Math.round(meal.fat || 0)}g
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </TourGuideZone>
        </TourScrollView>
      </ScreenLayout>
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
  headerLeft: {
    flex: 1,
  },
  greeting: {
    color: colors.light.textSecondary,
    marginBottom: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: {
    color: BRAND_COLORS.textPrimary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    gap: 4,
  },
  streakText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
    }),
  },
  // Goals card styles - Aura look with SaaS shadow
  goalsCard: {
    padding: spacing.lg,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.6)', // Ultra-thin border
    ...saasShadows.card,
  },
  goalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  goalsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  goalTypeIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalLabel: {
    color: BRAND_COLORS.textSecondary,
    marginBottom: 2,
  },
  editGoalsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
    }),
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
  // Set goals prompt - Aura look with SaaS shadow
  setGoalsPrompt: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    ...saasShadows.card,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.2s ease-out',
    }),
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
  // Calorie card - Aura look with SaaS shadow
  calorieCard: {
    padding: spacing.lg,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.6)', // Ultra-thin border
    ...saasShadows.card,
  },
  // Log Meal button in card header
  logMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
    }),
  },
  logMealButtonPressed: {
    backgroundColor: BRAND_COLORS.secondary,
    transform: [{ scale: 0.98 }],
  },
  logMealButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  addFoodButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.2s ease-out',
    }),
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
  // Unified meals card - matches NutritionRingsCard styling
  mealsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)', // Subtle primary color border (same as NutritionRingsCard)
    padding: spacing.lg,
    ...saasShadows.cardElevated, // Same shadow as NutritionRingsCard
  },
  mealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mealsTitle: {
    color: BRAND_COLORS.textPrimary,
    fontWeight: '700',
  },
  mealsSubtitle: {
    color: '#4B5563', // Same as NutritionRingsCard headerCalories
  },
  // Compact empty state - horizontal layout
  emptyMealsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: `${BRAND_COLORS.primary}05`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${BRAND_COLORS.primary}15`,
    borderStyle: 'dashed',
    gap: spacing.md,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.2s ease-out',
    }),
  },
  emptyMealsContentPressed: {
    backgroundColor: `${BRAND_COLORS.primary}10`,
    transform: [{ scale: 0.99 }],
  },
  emptyMealsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${BRAND_COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMealsTextContainer: {
    flex: 1,
  },
  emptyMealsTitle: {
    color: BRAND_COLORS.textPrimary,
  },
  emptyMealsHint: {
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  // Meals list
  mealsList: {
    gap: spacing.sm,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 231, 235, 0.5)',
    gap: spacing.md,
  },
  mealDetails: {
    flex: 1,
    gap: 2,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    flex: 1,
    marginRight: spacing.sm,
    color: BRAND_COLORS.textPrimary,
  },
  mealCalories: {
    color: BRAND_COLORS.primary,
    fontSize: 14,
  },
  mealMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealTime: {
    color: colors.light.textSecondary,
    fontSize: 12,
  },
  mealMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealMacroText: {
    color: colors.light.textSecondary,
    fontSize: 11,
  },
  mealMacroDivider: {
    color: colors.light.textMuted,
    fontSize: 11,
  },
});

export default DashboardScreen;