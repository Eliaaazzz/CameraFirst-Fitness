import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TourGuideZone, TourScrollView, useTourGuideController, useTourNavigation } from '@/components/tour/TourProvider';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
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
import Animated, {
    FadeInDown,
    FadeInRight,
    useReducedMotion,
} from 'react-native-reanimated';


import { Ionicons } from '@expo/vector-icons';
import { Barbell, Drop, Fire, Grains } from 'phosphor-react-native';

import { BentoCard, SafeAreaWrapper, Text } from '@/components';
import { BENTO_CARD_STYLES, BENTO_CARD_WEB_STYLES } from '@/components/common/BentoCard';
import { StateView } from '@/components/common/StateView';
import { DailyScoreCard, DailyTasksCard, DashboardWidgets, NutritionInsightsCard, QuickActionsCard, StreakBadge } from '@/components/dashboard';
import { ScreenLayout } from '@/components/layout';
import { MealImage } from '@/components/nutrition/MealImage';
import { NutritionRingsCard } from '@/components/nutrition/NutritionRingsCard';
import WelcomeTourCard from '@/components/WelcomeTourCard';
import { SNAP_MEAL_STEP, TODAYS_NUTRITION_STEP } from '@/config/tourSteps';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { useWeeklyInsights } from '@/hooks/useMealHistory';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTourStatus } from '@/hooks/useTourStatus';
import { GeneratedGoals, getActiveGoal, GoalType } from '@/services/geminiApi';
import { useGoals, useGoalStatistics } from '@/services/goalsApi';
import { useHydrationStore, useLanguageStore } from '@/stores';
import { BRAND_COLORS, colors, saasShadows, spacing, useContentBottomPadding, useRightPanelVisible, useSidebarVisible } from '@/utils';
import { GENERATED_GOALS_KEY } from './ProfileScreen';

// Smart time-based greeting
const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 22) return 'Good Evening';
  return 'Good Night';
};

// Generate a contextual sub-line based on current data
const getContextLine = (streak: number, caloriePercent: number, mealCount: number): string => {
  if (streak >= 7) return `${streak}-day streak, keep it up!`;
  if (streak >= 3) return `${streak} days in a row!`;
  if (caloriePercent >= 75) return `${Math.round(caloriePercent)}% of daily goal reached`;
  if (mealCount > 0) return `${mealCount} meal${mealCount > 1 ? 's' : ''} logged today`;
  return "Let's make today count";
};

// Goal type display config - using target/flag icons to differentiate from streak's fire
const GOAL_TYPE_CONFIG: Record<GoalType, { label: string; icon: string; color: string }> = {
  fat_loss: { label: 'Fat Loss', icon: 'target', color: '#EF4444' },
  muscle_gain: { label: 'Build Muscle', icon: 'flag-checkered', color: BRAND_COLORS.macros.protein },
  diabetes_control: { label: 'Nutrition Balance', icon: 'leaf', color: BRAND_COLORS.macros.carbs },
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

const MODERATE_T2D_NET_CARB_RISE_MGDL_PER_G = 4;
const MODERATE_T2D_PROTEIN_RISE_MGDL_PER_G = 0.5;
const ESTIMATED_FIBER_RATIO = 0.1;

const estimateMacroBloodSugarRiseMgDl = (carbsG: number, proteinG: number): number => {
  const safeCarbs = Math.max(0, carbsG || 0);
  const safeProtein = Math.max(0, proteinG || 0);
  const estimatedFiber = Math.round(safeCarbs * ESTIMATED_FIBER_RATIO);
  const netCarbs = Math.max(0, safeCarbs - estimatedFiber);
  return Math.round(
    netCarbs * MODERATE_T2D_NET_CARB_RISE_MGDL_PER_G +
    safeProtein * MODERATE_T2D_PROTEIN_RISE_MGDL_PER_G
  );
};

const normalizeGoalMacros = (goals: GeneratedGoals): GeneratedGoals => {
  const macros = goals.macros_grams || {
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    notes: '',
  };

  return {
    ...goals,
    macros_grams: {
      ...macros,
      blood_sugar_rise_mg_dl:
        macros.blood_sugar_rise_mg_dl ??
        estimateMacroBloodSugarRiseMgDl(macros.carbs_g, macros.protein_g),
    },
  };
};

/** Build trend data for the NutritionInsightsCard from weekly insights */
const buildTrendData = (weeklyData?: { dailyData?: Array<{ date: string; calories: { actual: number }; protein: number; carbs: number; fat: number }> }) => {
  if (!weeklyData?.dailyData?.length) return [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return weeklyData.dailyData.map((d) => {
    const [year, month, day] = d.date.split('-').map(Number);
    const dow = new Date(year, month - 1, day).getDay();
    return {
      day: dayNames[dow],
      calories: d.calories?.actual ?? 0,
      protein: d.protein ?? 0,
      carbs: d.carbs ?? 0,
      fat: d.fat ?? 0,
    };
  });
};

const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId || '';
  const showRightPanel = useRightPanelVisible();
  const showSidebar = useSidebarVisible(); // Desktop mode detection
  const showInlineGoalsRow = showSidebar && !showRightPanel;

  const { t } = useLanguageStore();

  const { data: nutritionData, isLoading: nutritionLoading, refresh } = useDailyNutrition();
  const goals = useGoals(userId);
  const stats = useGoalStatistics(userId);

  // Hydration state for Daily Score
  const hydrationCups = useHydrationStore((s) => s.cups);
  const hydrationGoalCups = useHydrationStore((s) => s.dailyGoalCups);

  // Weekly insights for trend chart (web only)
  const weeklyInsights = useWeeklyInsights(undefined, true);

  // Tour guide controller and navigation
  const { canStart, start, eventEmitter } = useTourGuideController();
  useTourNavigation(); // Register navigation callback for cross-screen tour steps

  const { hasSeenTour, isLoading: tourStatusLoading, markTourComplete, markTourSkipped } = useTourStatus();

  // Calculate proper bottom padding for tab bar
  const contentBottomPadding = useContentBottomPadding(spacing.lg);

  // Respect accessibility reduce-motion preference
  const reduceMotion = useReducedMotion();

  // Smart greeting based on time of day
  const greeting = useMemo(() => getTimeGreeting(), []);
  const contextLine = useMemo(
    () => getContextLine(
      currentUser.data?.currentStreak || 0,
      nutritionData.goal > 0 ? (nutritionData.calories / nutritionData.goal) * 100 : 0,
      nutritionData.meals.length,
    ),
    [currentUser.data?.currentStreak, nutritionData.calories, nutritionData.goal, nutritionData.meals.length]
  );

  // Memoize trend data to avoid recalculating on every render
  const trendData = useMemo(() => buildTrendData(weeklyInsights.data), [weeklyInsights.data]);

  // Staggered enter animation factory
  const staggerEnter = useCallback((index: number) => {
    if (reduceMotion) return undefined;
    return FadeInDown.duration(300).delay(index * 80);
  }, [reduceMotion]);

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

  // Load generated goals from API (authoritative) then AsyncStorage fallback
  const loadGeneratedGoals = useCallback(async () => {
    try {
      if (userId) {
        try {
          const dbGoal = await getActiveGoal(userId);
          if (dbGoal) {
            const normalizedDbGoal = normalizeGoalMacros(dbGoal);
            const serializedDbGoal = JSON.stringify(normalizedDbGoal);
            if (serializedDbGoal !== lastLoadedGoalsRef.current) {
              setGeneratedGoals(normalizedDbGoal);
              lastLoadedGoalsRef.current = serializedDbGoal;
            }
            await AsyncStorage.setItem(GENERATED_GOALS_KEY, serializedDbGoal);
            return;
          }
        } catch (dbError) {
          console.warn('[DashboardScreen] Failed to load goal from database:', dbError);
        }
      }

      const saved = await AsyncStorage.getItem(GENERATED_GOALS_KEY);
      if (saved) {
        const parsed = normalizeGoalMacros(JSON.parse(saved));
        const serializedParsed = JSON.stringify(parsed);
        if (serializedParsed !== lastLoadedGoalsRef.current) {
          setGeneratedGoals(parsed);
          lastLoadedGoalsRef.current = serializedParsed;
        }
      } else if (lastLoadedGoalsRef.current !== null) {
        setGeneratedGoals(null);
        lastLoadedGoalsRef.current = null;
      }
    } catch (error) {
      console.error('Failed to load generated goals:', error);
    }
  }, [userId]);

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
      currentUser.refetch(),
      weeklyInsights.refetch(),
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
        allowsEditing: Platform.OS === 'web',
        aspect: [4, 3],
        quality: Platform.OS === 'web' ? 0.8 : 0.65,
      });

      if (!result.canceled && result.assets?.[0]) {
        navigation.navigate('ReviewMeal', {
          imageUri: result.assets[0].uri,
          imageMimeType: result.assets[0].mimeType,
          imageFileName: result.assets[0].fileName,
        });
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
      zone={TODAYS_NUTRITION_STEP.zone}
      text={TODAYS_NUTRITION_STEP.text}
      title={TODAYS_NUTRITION_STEP.title}
      icon="📊"
    >
      {/* Only show loading on initial load; once data exists, keep component alive */}
      {showNutritionLoading ? (
        <View style={styles.nutritionLoadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        </View>
      ) : (
        <NutritionRingsCard
          data={{
            calories: { current: nutritionData.calories, target: calorieGoal },
            protein: { current: nutritionData.protein.current, target: proteinGoal },
            carbs: { current: nutritionData.carbs.current, target: carbsGoal },
            fat: { current: nutritionData.fat.current, target: fatGoal },
            bloodSugarRise: nutritionData.bloodSugarRise,
          }}
          showFat={true}
          onMacroPress={handleMacroSearch}
          onSourcesPress={() => navigation.navigate('AboutNutritionData' as any)}
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
      <View style={styles.screenRoot}>
        <View pointerEvents="none" style={styles.ambientLayer}>
          <LinearGradient
            colors={
              Platform.OS === 'web'
                ? ['rgba(255,248,241,0.8)', 'rgba(246,248,251,0.76)']
                : ['rgba(255,252,248,0.94)', 'rgba(251,252,255,0.9)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ambientGradient}
          />
          <View style={[styles.ambientWarmCloud, Platform.OS === 'web' && styles.ambientWarmCloudWeb]} />
          <View style={[styles.ambientCoolCloud, Platform.OS === 'web' && styles.ambientCoolCloudWeb]} />
          <View style={[styles.ambientMintCloud, Platform.OS === 'web' && styles.ambientMintCloudWeb]} />
          {Platform.OS === 'web' && <View style={styles.ambientNoise} />}
        </View>

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
                progressViewOffset={20}
              />
            }
          >
            {/* Header */}
            <Animated.View entering={staggerEnter(0)} style={styles.header}>
              <View style={styles.headerLeft}>
                <Text variant="caption" style={styles.greeting}>{greeting}</Text>
                <View style={styles.nameRow}>
                  <Text variant="heading1" weight="bold" style={styles.userName}>
                    {currentUser.data?.username || 'User'}
                  </Text>
                  <StreakBadge streak={currentUser.data?.currentStreak || 0} compact />
                </View>
                <Text variant="caption" style={styles.contextLine}>{contextLine}</Text>
              </View>
              {/* Hide profile button on desktop (use sidebar instead) */}
              {!showRightPanel && (
                <View style={styles.headerActions}>
                  <Pressable
                    style={styles.profileButton}
                    onPress={() => navigation.navigate('Profile')}
                  >
                    <Feather name="user" size={22} color={BRAND_COLORS.textPrimary} />
                  </Pressable>
                </View>
              )}
            </Animated.View>

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
                    {/* Daily Score Card - Whoop/Oura inspired */}
                    {!nutritionLoading && generatedGoals && (
                      <Animated.View entering={staggerEnter(1)}>
                        <DailyScoreCard
                          data={{
                            calories: nutritionData.calories,
                            calorieGoal: nutritionData.goal,
                            protein: nutritionData.protein,
                            carbs: nutritionData.carbs,
                            fat: nutritionData.fat,
                            hydrationCups,
                            hydrationGoal: hydrationGoalCups,
                            streak: currentUser.data?.currentStreak || 0,
                          }}
                        />
                      </Animated.View>
                    )}

                    {/* Daily Tasks - Noom-inspired checklist */}
                    {!nutritionLoading && generatedGoals && (
                      <Animated.View entering={staggerEnter(2)}>
                        <DailyTasksCard
                          data={{
                            calories: nutritionData.calories,
                            calorieGoal: nutritionData.goal,
                            protein: nutritionData.protein,
                            mealCount: nutritionData.meals.length,
                            hydrationCups,
                            hydrationGoal: hydrationGoalCups,
                          }}
                        />
                      </Animated.View>
                    )}

                    <Animated.View entering={staggerEnter(3)}>
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
                    </Animated.View>

                    {/* Nutrition Insights - Trend & Balance charts */}
                    {!nutritionLoading && generatedGoals && (
                      <View style={{ marginTop: spacing.lg }}>
                        <NutritionInsightsCard
                          trendData={trendData}
                          target={{
                            calories: nutritionData.goal,
                            protein: nutritionData.protein.goal,
                            carbs: nutritionData.carbs.goal,
                            fat: nutritionData.fat.goal,
                          }}
                          currentMacros={{
                            protein: nutritionData.protein.current,
                            carbs: nutritionData.carbs.current,
                            fat: nutritionData.fat.current,
                          }}
                        />
                      </View>
                    )}

                    {/* Keep inline quick actions on web only; mobile removes this section */}
                    {Platform.OS === 'web' && !showRightPanel && (
                      <View style={{ marginTop: spacing.lg }}>
                        <QuickActionsCard />
                      </View>
                    )}

                  {/* Today's Meals */}
                  <Animated.View entering={staggerEnter(4)}>
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

                      {/* Compact Snap Button - Tour Zone 1 */}
                      <TourGuideZone
                        zone={SNAP_MEAL_STEP.zone}
                        text={SNAP_MEAL_STEP.text}
                        title={SNAP_MEAL_STEP.title}
                        icon="📸"
                      >
                        <Pressable
                          onPress={handleAddFood}
                          style={({pressed}) => [styles.compactSnapBtn, pressed && styles.compactSnapBtnPressed]}
                        >
                           <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
                           <Text style={styles.compactSnapBtnText}>Snap Meal</Text>
                        </Pressable>
                      </TourGuideZone>
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
                  {nutritionData.meals.map((meal, mealIndex) => (
                    <Animated.View key={meal.id} entering={reduceMotion ? undefined : FadeInRight.duration(300).delay(mealIndex * 60)} style={styles.mealItem}>
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
                    </Animated.View>
                  ))}
                </View>
              )}
            </BentoCard>
            </Animated.View>
          </View>
          </TourScrollView>
        </ScreenLayout>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  ambientLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  ambientGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  ambientWarmCloud: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    top: -120,
    right: -100,
    backgroundColor: 'rgba(249,115,22,0.12)',
    ...(Platform.OS === 'web' && ({
      filter: 'blur(90px)',
    } as any)),
  },
  ambientWarmCloudWeb: {
    backgroundColor: 'rgba(249,115,22,0.07)',
  },
  ambientCoolCloud: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: 160,
    right: 60,
    backgroundColor: 'rgba(6,182,212,0.08)',
    ...(Platform.OS === 'web' && ({
      filter: 'blur(84px)',
    } as any)),
  },
  ambientCoolCloudWeb: {
    backgroundColor: 'rgba(6,182,212,0.045)',
  },
  ambientMintCloud: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    bottom: -120,
    left: -80,
    backgroundColor: 'rgba(16,185,129,0.07)',
    ...(Platform.OS === 'web' && ({
      filter: 'blur(90px)',
    } as any)),
  },
  ambientMintCloudWeb: {
    backgroundColor: 'rgba(16,185,129,0.04)',
  },
  ambientNoise: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
    ...(Platform.OS === 'web' && ({
      backgroundImage:
        'repeating-linear-gradient(0deg, rgba(17,24,39,0.12) 0px, rgba(17,24,39,0.12) 1px, transparent 1px, transparent 3px)',
    } as any)),
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    ...BENTO_CARD_STYLES,
    ...(BENTO_CARD_WEB_STYLES as object),
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#7A6B5C',
    marginBottom: 2,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: {
    color: BRAND_COLORS.textPrimary,
    letterSpacing: -0.7,
  },
  contextLine: {
    color: BRAND_COLORS.textMuted,
    marginTop: 2,
    fontSize: 13,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 240, 225, 0.7)',
    borderWidth: 0.5,
    borderColor: 'rgba(246, 194, 143, 0.6)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    ...saasShadows.subtle,
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
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    ...saasShadows.subtle,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
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
    borderRadius: 13,
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
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  goalItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 64,
    minHeight: 74,
    borderRadius: 12,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 0.5,
    borderColor: 'rgba(242,233,222,0.8)',
  },
  goalItemLabel: {
    color: colors.light.textSecondary,
    marginTop: 2,
    textAlign: 'center',
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
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.48)',
    backgroundColor: 'rgba(255,255,255,0.68)',
    marginBottom: 24,
    ...saasShadows.subtle,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.2s ease-out',
      backdropFilter: 'blur(16px)',
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
    backgroundColor: 'rgba(255,241,227,0.7)',
    borderWidth: 0.5,
    borderColor: 'rgba(246,194,143,0.5)',
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
    color: '#8B7A6A',
    marginTop: 2,
  },
  setGoalsChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,241,227,0.7)',
    borderWidth: 0.5,
    borderColor: 'rgba(246,194,143,0.5)',
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
    backgroundColor: 'rgba(249, 115, 22, 0.88)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 183, 122, 0.6)',
    gap: 6,
    ...saasShadows.subtle,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'opacity 0.2s',
    }),
  },
  compactSnapBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  compactSnapBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    letterSpacing: -0.3,
  },
  mealsSubtitle: {
    color: '#7A6B5C',
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
    backgroundColor: 'rgba(255,253,249,0.6)',
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(241,232,222,0.5)',
    borderStyle: 'dashed',
    gap: spacing.sm,
    width: '100%',
  },
  emptyMealsContentPressed: {
    backgroundColor: 'rgba(255,246,236,0.7)',
    transform: [{ scale: 0.99 }],
  },
  emptyMealsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,241,227,0.7)',
    borderWidth: 0.5,
    borderColor: 'rgba(246,194,143,0.5)',
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
    color: '#8B7A6A',
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
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(242,233,222,0.6)',
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
    color: BRAND_COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
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
