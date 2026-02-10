import React, { useCallback, useEffect, useRef, useState } from 'react';

import { TourGuideZone, TourScrollView, useTourGuideController, useTourNavigation } from '@/components/tour/TourProvider';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    View
} from 'react-native';


import { Ionicons } from '@expo/vector-icons';
import { Barbell, Drop, Fire, Grains } from 'phosphor-react-native';

import { BentoCard, SafeAreaWrapper, Text } from '@/components';
import { StateView } from '@/components/common/StateView';
import { DashboardWidgets } from '@/components/dashboard';
import { ScreenLayout } from '@/components/layout';
import { MealImage } from '@/components/nutrition/MealImage';
import { NutritionPieChart } from '@/components/nutrition/NutritionPieChart';
import { NutritionRingsCard } from '@/components/nutrition/NutritionRingsCard';
import WelcomeTourCard from '@/components/WelcomeTourCard';
import { DASHBOARD_TOUR_STEPS } from '@/config/tourSteps';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTourStatus } from '@/hooks/useTourStatus';
import { GeneratedGoals, GoalType } from '@/services/geminiApi';
import { useGoals, useGoalStatistics } from '@/services/goalsApi';
import { useLanguageStore } from '@/stores';
import { BRAND_COLORS, colors, saasShadows, spacing, useContentBottomPadding, useRightPanelVisible, useSidebarVisible } from '@/utils';
import { GENERATED_GOALS_KEY } from './ProfileScreen';

// Goal type display config - using target/flag icons to differentiate from streak's fire
const GOAL_TYPE_CONFIG: Record<GoalType, { label: string; icon: string; color: string }> = {
  fat_loss: { label: 'Fat Loss', icon: 'target', color: '#EF4444' },
  muscle_gain: { label: 'Build Muscle', icon: 'flag-checkered', color: BRAND_COLORS.macros.protein },
  diabetes_control: { label: 'Glucose Control', icon: 'water', color: BRAND_COLORS.macros.carbs }, // Changed from heart-pulse to water (blood drop)
};

// Helper to determine meal type from time
const getMealType = (date: Date): string => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 16) return 'Lunch'; // Extended lunch to 4pm
  if (hour >= 16 && hour < 22) return 'Dinner';
  return 'Snack';
};

const formatMealName = (mealName: string): string => {
  const tokens = mealName
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length <= 1) {
    return mealName;
  }

  const counts = new Map<string, { label: string; count: number }>();
  tokens.forEach((token) => {
    const key = token.toLowerCase();
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    counts.set(key, { label: token, count: 1 });
  });

  return Array.from(counts.values())
    .map(({ label, count }) => (count > 1 ? `${label} x${count}` : label))
    .join(', ');
};

const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId || '';
  const showRightPanel = useRightPanelVisible();
  const showSidebar = useSidebarVisible(); // Desktop mode detection
  const showInlineGoalsRow = showSidebar && !showRightPanel;

  // Language support
  const { language, t, toggleLanguage } = useLanguageStore();

  const { data: nutritionData, isLoading: nutritionLoading, refresh } = useDailyNutrition();
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

  const handleMacroSearch = useCallback((macro: 'calories' | 'protein' | 'carbs' | 'fat') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    
    let query = '';
    switch (macro) {
      case 'calories': query = 'Low Calorie Healthy'; break;
      case 'protein': query = 'High Protein'; break;
      case 'carbs': query = 'Low Carb Healthy'; break;
      case 'fat': query = 'Healthy Fats'; break;
    }
    
    navigation.navigate('Recipes', { initialSearchQuery: query });
  }, [navigation]);

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

      navigation.navigate('ReviewMeal', { openCamera: true });
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

  const renderGoalsSection = (styleOverride?: object) => {
    if (generatedGoals) {
      return (
        <BentoCard style={[styles.goalsCard, styleOverride]}>
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
            <Pressable 
              style={({ pressed }) => [styles.goalItem, pressed && { opacity: 0.7 }]}
              onPress={() => handleMacroSearch('calories')}
            >
              <Fire size={20} weight="fill" color={BRAND_COLORS.macros.calories} />
              <Text variant="heading3" weight="bold">{generatedGoals.dailyCalories.target}</Text>
              <Text variant="caption" style={styles.goalItemLabel}>kcal/day</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [styles.goalItem, pressed && { opacity: 0.7 }]}
              onPress={() => handleMacroSearch('protein')}
            >
              <Barbell size={20} weight="fill" color={BRAND_COLORS.macros.protein} />
              <Text variant="heading3" weight="bold">{generatedGoals.macros_grams.protein_g}g</Text>
              <Text variant="caption" style={styles.goalItemLabel}>Protein</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [styles.goalItem, pressed && { opacity: 0.7 }]}
              onPress={() => handleMacroSearch('carbs')}
            >
              <Grains size={20} weight="fill" color={BRAND_COLORS.macros.carbs} />
              <Text variant="heading3" weight="bold">{generatedGoals.macros_grams.carbs_g}g</Text>
              <Text variant="caption" style={styles.goalItemLabel}>Carbs</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [styles.goalItem, pressed && { opacity: 0.7 }]}
              onPress={() => handleMacroSearch('fat')}
            >
              <Drop size={20} weight="fill" color={BRAND_COLORS.macros.fat} />
              <Text variant="heading3" weight="bold">{generatedGoals.macros_grams.fat_g}g</Text>
              <Text variant="caption" style={styles.goalItemLabel}>Fat</Text>
            </Pressable>
          </View>

          {/* Activity targets row */}
          <View style={styles.activityRow}>
            <View style={styles.activityItem}>
              <MaterialCommunityIcons name="run" size={16} color={BRAND_COLORS.secondary} />
              <Text variant="caption">
                {generatedGoals.weeklyActivityPlan.cardio_minutes_per_week} min cardio/week
              </Text>
            </View>
            <View style={styles.activityItem}>
              <MaterialCommunityIcons name="shoe-print" size={16} color={BRAND_COLORS.primary} />
              <Text variant="caption">
                {generatedGoals.weeklyActivityPlan.steps_per_day_target.toLocaleString()} steps/day
              </Text>
            </View>
          </View>
        </BentoCard>
      );
    }

    return (
      <Pressable
        style={({ pressed }) => [
          styles.setGoalsPrompt,
          styleOverride,
          pressed && { opacity: 0.9 },
        ]}
        onPress={() => navigation.navigate('Profile')}
      >
        <View style={styles.setGoalsGradient}>
          <View style={styles.setGoalsIconBox}>
            <MaterialCommunityIcons name="target" size={20} color={BRAND_COLORS.primary} />
          </View>
          <View style={styles.setGoalsText}>
            <Text variant="body" weight="bold" style={styles.setGoalsTitle}>Set Your Fitness Goals</Text>
            <Text variant="caption" style={styles.setGoalsSubtext}>
              Get personalized calorie & macro targets
            </Text>
          </View>
          <View style={styles.setGoalsChevron}>
            <Feather name="chevron-right" size={16} color={BRAND_COLORS.primary} />
          </View>
        </View>
      </Pressable>
    );
  };

  // Only show loading placeholder on initial load (no data yet)
  // Once data has been loaded, keep component mounted to preserve animation state
  const hasNutritionData = nutritionData.calories > 0 || nutritionData.protein.current > 0 || nutritionData.meals.length > 0;
  const showNutritionLoading = nutritionLoading && !hasNutritionData;

  const renderNutritionCard = () => (
    <TourGuideZone
      zone={DASHBOARD_TOUR_STEPS[1].zone}
      text={DASHBOARD_TOUR_STEPS[1].text}
      title={DASHBOARD_TOUR_STEPS[1].title}
      icon="📊"
    >
      {/* Only show loading on initial load; once data exists, keep component alive */}
      {showNutritionLoading ? (
        <View style={styles.nutritionLoadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        </View>
      ) : Platform.OS === 'web' && showSidebar ? (
        <View style={styles.nutritionCardExpanded}>
          <NutritionPieChart
            data={{
              calories: { current: nutritionData.calories, target: calorieGoal },
              protein: { current: nutritionData.protein.current, target: proteinGoal },
              carbs: { current: nutritionData.carbs.current, target: carbsGoal },
              fat: { current: nutritionData.fat.current, target: fatGoal },
            }}
            showFat={true}
          />
        </View>
      ) : (
        <NutritionRingsCard
          data={{
            calories: { current: nutritionData.calories, target: calorieGoal },
            protein: { current: nutritionData.protein.current, target: proteinGoal },
            carbs: { current: nutritionData.carbs.current, target: carbsGoal },
            fat: { current: nutritionData.fat.current, target: fatGoal },
          }}
          showFat={true}
          onMacroPress={handleMacroSearch}
        />
      )}
    </TourGuideZone>
  );

  // Render right panel widgets (only shown on wide screens)
  const renderRightPanel = () => (
    <DashboardWidgets
      generatedGoals={generatedGoals}
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
              <Text variant="caption" style={styles.greeting}>{t.goodDay}</Text>
              <View style={styles.nameRow}>
                <Text variant="heading1" weight="bold" style={styles.userName}>
                  {currentUser.data?.username || 'User'}
                </Text>
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={15} color={BRAND_COLORS.primary} />
                  <Text style={styles.streakText}>
                    {currentUser.data?.currentStreak || 0}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.headerActions}>
              {/* Language toggle button */}
              <Pressable
                style={styles.languageButton}
                onPress={toggleLanguage}
              >
                <Text variant="caption" weight="semibold" style={styles.languageButtonText}>
                  {language === 'en' ? '中文' : 'EN'}
                </Text>
              </Pressable>
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
          </View>

          {/* Welcome Tour Card for new users */}
          {showWelcomeCard && (
            <WelcomeTourCard
              onStartTour={handleStartTour}
              onSkip={handleSkipTour}
            />
          )}

          {/* Goals card/prompt - only in main column when right panel is hidden */}
          {!showRightPanel && !showInlineGoalsRow && renderGoalsSection()}

        {/* Recommendations are now shown on their respective tabs (Workouts/Recipes) */}

                  {/* Main content wrapper - fills viewport on desktop */}
                <View
                  style={
                    showSidebar
                      ? showRightPanel
                        ? styles.desktopContentWrapper
                        : styles.sidebarContentWrapper
                      : undefined
                  }
                >
                  {showInlineGoalsRow ? (
                    <View style={styles.inlineTopRow}>
                      <View style={styles.inlineColumn}>
                        {renderGoalsSection(styles.inlineCard)}
                      </View>
                      <View style={styles.inlineColumn}>
                        {renderNutritionCard()}
                      </View>
                    </View>
                  ) : (
                    renderNutritionCard()
                  )}
        
                {/* Today's Meals - Tour Zone 3 - positioned at bottom on desktop */}
                <TourGuideZone
                  zone={DASHBOARD_TOUR_STEPS[2].zone}
                  text={DASHBOARD_TOUR_STEPS[2].text}
                  title={DASHBOARD_TOUR_STEPS[2].title}
                  icon="🍽️"
                >
                  {/* Unified card wrapper - fills remaining space on desktop */}
                  <BentoCard
                    style={[
                      styles.mealsCard,
                      showSidebar && (showRightPanel ? styles.mealsCardDesktop : styles.mealsCardSidebar),
                    ]}
                  >
                    {/* Header - matches NutritionRingsCard header */}
                    <View style={styles.mealsHeader}>
                      <View>
                        <Text variant="heading3" weight="bold" style={styles.mealsTitle}>
                          {t.todaysMeals}
                        </Text>
                        {nutritionData.meals.length > 0 && (
                          <Text variant="caption" style={styles.mealsSubtitle}>
                            {nutritionData.meals.length} {nutritionData.meals.length === 1 ? t.mealLogged : t.mealsLogged}
                          </Text>
                        )}
                      </View>
                      
                      {/* Compact Snap Button */}
                      <Pressable 
                        onPress={handleAddFood}
                        style={({pressed}) => [styles.compactSnapBtn, pressed && styles.compactSnapBtnPressed]}
                      >
                         <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
                         <Text style={styles.compactSnapBtnText}>Snap Meal</Text>
                      </Pressable>
                    </View>

            {nutritionData.meals.length === 0 ? (
              <View style={styles.emptyMealsWrapper}>
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyMealsContent,
                    pressed && styles.emptyMealsContentPressed,
                  ]}
                  onPress={handleAddFood}
                >
                  <View style={styles.emptyMealsIconContainer}>
                    <MaterialCommunityIcons name="camera-plus" size={24} color={BRAND_COLORS.primary} />
                  </View>
                  <View style={styles.emptyMealsTextContainer}>
                    <Text variant="body" weight="semibold" style={styles.emptyMealsTitle}>
                      No meals logged yet.
                    </Text>
                    <Text variant="caption" style={styles.emptyMealsHint}>
                      Snap a photo to start tracking
                    </Text>
                  </View>
                </Pressable>
              </View>
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
                        <View style={{ flex: 1, marginRight: spacing.sm }}>
                          <Text variant="body" weight="bold" style={{ color: BRAND_COLORS.textPrimary }}>
                            {getMealType(new Date(meal.consumedAt))}
                          </Text>
                          <Text variant="caption" numberOfLines={1} style={{ color: colors.light.textSecondary }}>
                            {formatMealName(meal.name)}
                          </Text>
                        </View>
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
          </BentoCard>
        </TourGuideZone>
        </View>
        </TourScrollView>
      </ScreenLayout>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.surface,
  },
  content: {
    padding: spacing.lg,
    width: '100%',
    alignSelf: 'center',
    ...(Platform.OS === 'web' && {
      maxWidth: 1360,
    }),
    // paddingBottom is set dynamically via useContentBottomPadding
  },
  // Desktop layout wrapper - fills viewport height
  desktopContentWrapper: {
    flex: 1,
    flexDirection: 'column',
    gap: spacing.lg,
    minHeight: 'calc(100vh - 200px)' as any, // Account for header and padding
  },
  sidebarContentWrapper: {
    flex: 1,
    flexDirection: 'column',
    gap: spacing.lg,
  },
  inlineTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: spacing.lg,
  },
  inlineColumn: {
    flexBasis: '48%',
    minWidth: 320,
    flexGrow: 1,
  },
  inlineCard: {
    marginBottom: 0,
  },
  // Loading placeholder for nutrition card - matches card height
  nutritionLoadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Expanded nutrition card for desktop - takes more vertical space
  nutritionCardExpanded: {
    flex: 1,
    minHeight: 280,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    color: colors.light.textMuted,
    marginBottom: 2,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: {
    color: BRAND_COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  languageButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
    }),
  },
  languageButtonText: {
    color: BRAND_COLORS.primaryDark,
    fontSize: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  streakText: {
    color: BRAND_COLORS.primaryDark,
    fontWeight: '700',
    fontSize: 13,
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
  // Goals card - extends BentoCard with margin
  goalsCard: {
    marginBottom: 24,
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
    backgroundColor: BRAND_COLORS.primaryTint,
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
    ...saasShadows.subtle,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.2s ease-out',
    }),
  },
  setGoalsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  setGoalsIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BRAND_COLORS.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setGoalsText: {
    flex: 1,
  },
  setGoalsTitle: {
    color: BRAND_COLORS.textPrimary,
  },
  setGoalsSubtext: {
    color: colors.light.textMuted,
    marginTop: 2,
  },
  setGoalsChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.primaryTint,
  },
  // Calorie card - Stripe/Linear style
  calorieCard: {
    padding: spacing.lg,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9E6F5',
    ...saasShadows.card,
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
  // Compact Snap Button
  compactSnapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'opacity 0.2s',
    }),
  },
  compactSnapBtnPressed: {
    opacity: 0.8,
  },
  compactSnapBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  // Meals card - extends BentoCard
  mealsCard: {
    // BentoCard handles base styles
  },
  mealsCardDesktop: {
    flex: 1,
    minHeight: 200,
  },
  mealsCardSidebar: {
    flex: 0,
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
    color: '#6B7280',
  },
  emptyMealsWrapper: {
    flex: 1,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMealsContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    gap: spacing.sm,
    width: '100%',
  },
  emptyMealsContentPressed: {
    backgroundColor: '#F3F4F6',
    transform: [{ scale: 0.99 }],
  },
  emptyMealsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyMealsTextContainer: {
    alignItems: 'center',
  },
  emptyMealsTitle: {
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
  emptyMealsHint: {
    color: colors.light.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  mealsList: {
    gap: spacing.sm,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
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
