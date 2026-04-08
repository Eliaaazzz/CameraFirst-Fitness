import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TourGuideZone, TourScrollView, useTourGuideController, useTourNavigation } from '@/components/tour/TourProvider';
import type { IconProps } from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    Linking,
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


import { Barbell, Camera, CameraPlus, CaretRight, ChartLine, Drop, EnvelopeSimple, Fire, FlagCheckered, Grains, Leaf, PencilSimple, PersonSimpleRun, Scales, Sneaker, Target, User } from 'phosphor-react-native';
import { Image } from 'expo-image';
import { ScrollView as RNScrollView } from 'react-native';
import { BentoCard, SafeAreaWrapper, Text } from '@/components';
import { BENTO_CARD_STYLES, BENTO_CARD_WEB_STYLES, MOBILE_CARD_STYLES } from '@/components/common/BentoCard';
import { StateView } from '@/components/common/StateView';
import { DailyScoreCard, DailyTasksCard, DashboardWidgets, NutritionInsightsCard, QuickActionsCard, StreakBadge, SuggestionGrid, WelcomeBar } from '@/components/dashboard';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { ScreenLayout } from '@/components/layout';
import { WeightLogModal } from '@/components/weight';
import { MealImage } from '@/components/nutrition/MealImage';
import { NutritionRingsCard } from '@/components/nutrition/NutritionRingsCard';
import { NutritionRingsSkeleton } from '@/components/nutrition/NutritionRingsSkeleton';
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
import {
  APP_PAGE_PATHS,
  BRAND_COLORS,
  EXPERIENCE_COLORS,
  getNutritionTargetExplanation,
  SUPPORT_EMAIL_URL,
  colors,
  openAppPage,
  openExternalUrl,
  radii,
  saasShadows,
  spacing,
  useContentBottomPadding,
  useRightPanelVisible,
  useSidebarVisible,
} from '@/utils';
import { GENERATED_GOALS_KEY } from './ProfileScreen';

// Illustration assets for web suggestion grid
const illustrationScanMeal = require('@/../assets/illustrations/hero-healthy-eating.svg');
const illustrationWorkouts = require('@/../assets/illustrations/fitness-tracker.svg');
const illustrationRecipes = require('@/../assets/illustrations/cooking.svg');
const illustrationWeekly = require('@/../assets/illustrations/data-trends.svg');
const illustrationTargets = require('@/../assets/illustrations/healthy-habit.svg');
const illustrationHistory = require('@/../assets/illustrations/fruit-salad.svg');

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
const GOAL_TYPE_CONFIG: Record<GoalType, { label: string; Icon: React.ComponentType<IconProps>; color: string }> = {
  fat_loss: { label: 'Fat Loss', Icon: Target, color: BRAND_COLORS.semantic.error },
  muscle_gain: { label: 'Build Muscle', Icon: FlagCheckered, color: BRAND_COLORS.macros.protein },
  diabetes_control: { label: 'Nutrition Balance', Icon: Leaf, color: BRAND_COLORS.macros.carbs },
};

const PLAN_PREVIEW_CONFIG: Record<GoalType, {
  title: string;
  description: string;
  focus: string;
  weeklyRhythm: string;
  outcome: string;
  targetHint: string;
}> = {
  fat_loss: {
    title: 'Cut cleanly without losing momentum',
    description: 'Keep the week lighter, protein-forward, and easier to sustain from Monday to Sunday.',
    focus: 'Protein-first meals',
    weeklyRhythm: '3 lifts + recovery cardio',
    outcome: 'Steadier fat loss',
    targetHint: 'Deficit-led calorie target',
  },
  muscle_gain: {
    title: 'Build size with enough fuel to recover',
    description: 'Shift the week toward strength, surplus calories, and more consistent recovery between sessions.',
    focus: 'Strength + recovery',
    weeklyRhythm: '4 focused training days',
    outcome: 'More size and strength',
    targetHint: 'Surplus-led calorie target',
  },
  diabetes_control: {
    title: 'Keep meals balanced and energy more even',
    description: 'Bias the week toward steadier carbs, more fibre, and routines you can repeat without friction.',
    focus: 'Balanced carbs + fibre',
    weeklyRhythm: 'Daily walks + light strength',
    outcome: 'More stable energy',
    targetHint: 'Balanced macro target',
  },
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

  // Animate entrance only on first mount — subsequent tab switches are instant
  const hasAnimated = useRef(false);
  const staggerEnter = useCallback((index: number) => {
    if (reduceMotion || hasAnimated.current) return undefined;
    return FadeInDown.duration(300).delay(index * 80);
  }, [reduceMotion]);
  useEffect(() => { hasAnimated.current = true; }, []);

  // Fetch personalized recommendations based on fitness goal

  const [refreshing, setRefreshing] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [generatedGoals, setGeneratedGoals] = useState<GeneratedGoals | null>(null);
  const lastLoadedGoalsRef = useRef<string | null>(null);
  const [showWelcomeCard, setShowWelcomeCard] = useState(false);
  const [planPreviewGoal, setPlanPreviewGoal] = useState<GoalType>('muscle_gain');
  const [hasTouchedPlanPreview, setHasTouchedPlanPreview] = useState(false);

  // Show welcome card for new users
  useEffect(() => {
    if (!tourStatusLoading && !hasSeenTour) {
      setShowWelcomeCard(true);
    }
  }, [tourStatusLoading, hasSeenTour]);

  useEffect(() => {
    if (!hasTouchedPlanPreview && generatedGoals?.goalType) {
      setPlanPreviewGoal(generatedGoals.goalType);
    }
  }, [generatedGoals?.goalType, hasTouchedPlanPreview]);

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
  const nutritionTargetExplanation = useMemo(() => getNutritionTargetExplanation(generatedGoals), [generatedGoals]);

  const goalTypeConfig = generatedGoals?.goalType
    ? GOAL_TYPE_CONFIG[generatedGoals.goalType]
    : null;
  const openActionCount = [
    nutritionData.meals.length === 0,
    proteinGoal > 0 && nutritionData.protein.current < proteinGoal * 0.8,
    hydrationGoalCups > 0 && hydrationCups < Math.ceil(hydrationGoalCups / 2),
    calorieGoal > 0 && (nutritionData.calories === 0 || nutritionData.calories < calorieGoal * 0.75),
  ].filter(Boolean).length;
  const welcomeSummary = openActionCount > 0
    ? `${openActionCount} actions ready for today`
    : 'Today’s plan is complete';

  if (currentUser.isLoading) {
    return (
      <SafeAreaWrapper>
        <StateView type="loading" title="Loading Dashboard..." />
      </SafeAreaWrapper>
    );
  }

  // Nutrition loading state — shared by both web and mobile layouts
  const hasNutritionData = nutritionData.calories > 0 || nutritionData.protein.current > 0 || nutritionData.meals.length > 0;
  const showNutritionLoading = nutritionLoading && !hasNutritionData;

  const handleLandingFooterLink = useCallback((linkId: string) => {
    switch (linkId) {
      case 'meal-logging':
        navigation.navigate('ReviewMeal', { openCamera: true });
        return;
      case 'workout-planning':
      case 'targets':
        navigation.navigate('BuildPlan');
        return;
      case 'weekly-reports':
      case 'export-data':
        navigation.navigate('Profile', { screen: 'WeeklyInsights' });
        return;
      case 'help-centre':
      case 'about':
        navigation.navigate('Help');
        return;
      case 'data-sources':
        navigation.navigate('AboutNutritionData');
        return;
      case 'release-notes':
        void openAppPage(APP_PAGE_PATHS.releaseNotes);
        return;
      case 'contact':
        void openExternalUrl(SUPPORT_EMAIL_URL, 'Unable to open email', 'Please email support@aurafitness.org.');
        return;
      case 'privacy-policy':
        void openAppPage(APP_PAGE_PATHS.privacy);
        return;
      case 'terms-of-service':
        void openAppPage(APP_PAGE_PATHS.terms);
        return;
      case 'accessibility':
        void openAppPage(APP_PAGE_PATHS.accessibility);
        return;
      default:
        return;
    }
  }, [navigation]);

  // ============================================================================
  // WEB DESKTOP — Uber-style full-page scrollable layout
  // Pattern: Uber logged-in homepage with hero + suggestions + account activity
  // Mobile layout is completely unchanged below this block.
  // ============================================================================
  if (showSidebar && Platform.OS === 'web') {
    const suggestionCards = [
      { title: 'Log meal', illustration: illustrationScanMeal, backgroundColor: '#FBE4D6', onPress: handleAddFood },
      { title: 'Workouts', illustration: illustrationWorkouts, backgroundColor: '#DDEEFF', onPress: () => navigation.navigate('Main', { screen: 'Workouts' } as any) },
      { title: 'Recipes', illustration: illustrationRecipes, backgroundColor: '#FFE9D8', onPress: () => navigation.navigate('Main', { screen: 'Recipes' } as any) },
      { title: 'Reports', illustration: illustrationWeekly, backgroundColor: '#DDF3EC', onPress: () => navigation.navigate('Main', { screen: 'Profile', params: { screen: 'WeeklyInsights' } } as any) },
      { title: 'Targets', illustration: illustrationTargets, backgroundColor: '#FFF3C7', onPress: () => navigation.navigate('BuildPlan', { initialGoal: planPreviewGoal }) },
      { title: 'History', illustration: illustrationHistory, backgroundColor: '#F2E9FF', onPress: () => navigation.navigate('Main', { screen: 'Profile', params: { screen: 'MealHistory' } } as any) },
    ];
    const serviceCards = [
      {
        title: 'Meal logging',
        body: 'Scan, review, and log meals with a faster photo-first flow.',
        illustration: illustrationScanMeal,
        onPress: handleAddFood,
        backgroundColor: '#E9F0FF',   // Blue
      },
      {
        title: 'Workouts',
        body: 'Browse exercise videos and track strength or cardio sessions.',
        illustration: illustrationWorkouts,
        onPress: () => navigation.navigate('Main', { screen: 'Workouts' } as any),
        backgroundColor: '#E0F5EF',   // Green/Mint
      },
      {
        title: 'Weekly reports',
        body: 'Review adherence, macro balance, and progress before you export.',
        illustration: illustrationWeekly,
        onPress: () => navigation.navigate('Main', { screen: 'Profile', params: { screen: 'WeeklyInsights' } } as any),
        backgroundColor: '#FFF1E7',   // Peach/Orange
      },
      {
        title: 'Recipes',
        body: 'Get recipes matched to your calorie and macro targets.',
        illustration: illustrationRecipes,
        onPress: () => navigation.navigate('Main', { screen: 'Recipes' } as any),
        backgroundColor: '#FFF7DD',   // Yellow
      },
    ];
    const recentMeals = nutritionData.meals.slice(0, 4);
    const currentProgramTitle = goalTypeConfig?.label || 'Build your plan';
    const currentProgramTarget = generatedGoals
      ? goalTypeConfig?.label === 'Fat Loss'
        ? 'Target: 72kg'
        : 'Target: 82kg'
      : 'Set a goal to generate targets';
    const selectedPlanPreview = PLAN_PREVIEW_CONFIG[planPreviewGoal];
    const selectedPlanTarget = generatedGoals?.goalType === planPreviewGoal
      ? `${generatedGoals.dailyCalories.target} kcal/day`
      : selectedPlanPreview.targetHint;
    const selectedPlanRhythm = generatedGoals?.goalType === planPreviewGoal
      ? `${generatedGoals.weeklyActivityPlan.strength_sessions_per_week} strength + ${generatedGoals.weeklyActivityPlan.cardio_minutes_per_week} min cardio`
      : selectedPlanPreview.weeklyRhythm;

    return (
      <SafeAreaWrapper>
        <View style={webStyles.root}>
          <RNScrollView
            style={webStyles.scroll}
            contentContainerStyle={webStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={webStyles.heroSection}>
              <View style={webStyles.heroLeft}>
                <View style={webStyles.heroEyebrowRow}>
                  <View style={webStyles.heroEyebrowChip}>
                    <FlagCheckered size={16} weight="fill" color="#111111" />
                    <Text variant="body" weight="semibold" style={webStyles.heroEyebrowText}>
                      Today&apos;s plan
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => navigation.navigate('BuildPlan', { initialGoal: planPreviewGoal })}
                    style={({ pressed }) => [webStyles.heroInlineLink, pressed && webStyles.heroInlineLinkPressed]}
                  >
                    <Text variant="body" weight="medium" style={webStyles.heroInlineLinkText}>
                      Update goal
                    </Text>
                  </Pressable>
                </View>

                <Text variant="heading1" weight="bold" style={webStyles.heroTitle}>
                  Build today&apos;s plan
                </Text>
                <Text variant="body" style={webStyles.heroSubtitle}>
                  Log meals, hit your macros, and review weekly progress — all in one place.
                </Text>

                <View style={webStyles.heroModePill}>
                  <Text variant="body" weight="bold" style={webStyles.heroModePillText}>
                    Start now
                  </Text>
                </View>

                <TourGuideZone
                  zone={SNAP_MEAL_STEP.zone}
                  text={SNAP_MEAL_STEP.text}
                  title={SNAP_MEAL_STEP.title}
                  icon="📸"
                >
                  <Pressable
                    onPress={handleAddFood}
                    style={({ pressed }) => [webStyles.heroInputCard, pressed && webStyles.heroInputPressed]}
                  >
                    <View style={webStyles.heroInputConnector}>
                      <View style={webStyles.heroInputDot} />
                      <View style={webStyles.heroInputLine} />
                    </View>
                    <View style={webStyles.heroInputIcon}>
                      <Camera size={20} weight="regular" color="#111111" />
                    </View>
                    <View style={webStyles.heroInputCopy}>
                      <Text variant="heading4" weight="semibold" style={webStyles.heroInputTitle}>
                        Log your next meal
                      </Text>
                      <Text variant="body" style={webStyles.heroInputBody}>
                        Scan a plate or upload from your gallery.
                      </Text>
                    </View>
                  </Pressable>
                </TourGuideZone>

                <Pressable
                  onPress={() => navigation.navigate('Main', { screen: 'Workouts' } as any)}
                  style={({ pressed }) => [webStyles.heroInputCard, pressed && webStyles.heroInputPressed]}
                >
                  <View style={[webStyles.heroInputConnector, webStyles.heroInputConnectorHidden]} />
                  <View style={webStyles.heroInputIcon}>
                    <Barbell size={20} weight="regular" color="#111111" />
                  </View>
                  <View style={webStyles.heroInputCopy}>
                    <Text variant="heading4" weight="semibold" style={webStyles.heroInputTitle}>
                      Choose workout focus
                    </Text>
                    <Text variant="body" style={webStyles.heroInputBody}>
                      Strength, cardio, or recovery for today.
                    </Text>
                  </View>
                </Pressable>

                <View style={webStyles.heroActions}>
                  <Pressable
                    onPress={handleAddFood}
                    style={({ pressed }) => [webStyles.heroPrimaryCta, pressed && webStyles.heroCtaPressed]}
                  >
                    <Text variant="body" weight="bold" style={webStyles.heroPrimaryCtaText}>
                      Start tracking
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => navigation.navigate('Main', { screen: 'Profile', params: { screen: 'WeeklyInsights' } } as any)}
                    style={({ pressed }) => [webStyles.heroSecondaryLink, pressed && webStyles.heroInlineLinkPressed]}
                  >
                    <Text variant="body" weight="medium" style={webStyles.heroSecondaryLinkText}>
                      Review weekly report
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={webStyles.heroRight}>
                <Text variant="heading3" weight="bold" style={webStyles.suggestionsTitle}>
                  Suggestions
                </Text>
                <SuggestionGrid cards={suggestionCards} />
              </View>
            </View>

            <View style={webStyles.section}>
              <Text variant="heading2" weight="bold" style={webStyles.sectionHeading}>
                Your account and activity
              </Text>
              <View style={webStyles.activityCard}>
                <View style={webStyles.activityCol1}>
                  <Text variant="heading4" weight="bold" style={webStyles.colTitle}>
                    Most recent
                  </Text>
                  <Pressable
                    onPress={() => navigation.navigate('BuildPlan', { initialGoal: planPreviewGoal })}
                    style={({ pressed }) => [webStyles.programCard, pressed && webStyles.programCardPressed]}
                  >
                    <View style={webStyles.programCardCopy}>
                      <Text variant="label" weight="bold" style={webStyles.programCardLabel}>
                        Current program
                      </Text>
                      <Text variant="heading2" weight="bold" style={webStyles.programCardTitle}>
                        {currentProgramTitle}
                      </Text>
                      <Text variant="body" style={webStyles.programCardBody}>
                        {currentProgramTarget}
                      </Text>
                      <View style={webStyles.programCardAction}>
                        <Text variant="body" weight="bold" style={webStyles.programCardActionText}>
                          See details
                        </Text>
                      </View>
                    </View>
                    <Image source={illustrationTargets} style={webStyles.programCardIllustration as any} contentFit="contain" />
                  </Pressable>

                  <View style={webStyles.metricStack}>
                    <View style={webStyles.metricRow}>
                      <Text variant="body" weight="semibold" style={webStyles.metricLabel}>Calories</Text>
                      <Text variant="body" weight="semibold" style={webStyles.metricValue}>
                        {nutritionData.calories}/{calorieGoal}
                      </Text>
                    </View>
                    <View style={webStyles.metricTrack}>
                      <View style={[webStyles.metricFill, { width: `${Math.min(100, Math.round((nutritionData.calories / Math.max(calorieGoal, 1)) * 100))}%`, backgroundColor: '#F28B34' }]} />
                    </View>

                    <View style={webStyles.metricRow}>
                      <Text variant="body" weight="semibold" style={webStyles.metricLabel}>Protein</Text>
                      <Text variant="body" weight="semibold" style={webStyles.metricValue}>
                        {Math.round(nutritionData.protein.current)}/{proteinGoal}g
                      </Text>
                    </View>
                    <View style={webStyles.metricTrack}>
                      <View style={[webStyles.metricFill, { width: `${Math.min(100, Math.round((nutritionData.protein.current / Math.max(proteinGoal, 1)) * 100))}%`, backgroundColor: '#0F9D82' }]} />
                    </View>

                    <View style={webStyles.metricRow}>
                      <Text variant="body" weight="semibold" style={webStyles.metricLabel}>Hydration</Text>
                      <Text variant="body" weight="semibold" style={webStyles.metricValue}>
                        {hydrationCups}/{hydrationGoalCups} cups
                      </Text>
                    </View>
                    <View style={webStyles.metricTrack}>
                      <View style={[webStyles.metricFill, { width: `${Math.min(100, Math.round((hydrationCups / Math.max(hydrationGoalCups, 1)) * 100))}%`, backgroundColor: '#3B82F6' }]} />
                    </View>
                  </View>
                </View>

                <View style={webStyles.activityCol2}>
                  <Text variant="heading4" weight="bold" style={webStyles.colTitle}>
                    Past
                  </Text>
                  {recentMeals.length === 0 ? (
                    <Pressable onPress={handleAddFood} style={webStyles.emptyMeals}>
                      <CameraPlus size={22} color={BRAND_COLORS.primary} weight="regular" />
                      <View style={webStyles.emptyMealsCopy}>
                        <Text variant="body" weight="semibold" style={webStyles.emptyMealsTitle}>
                          This space is ready for your first meal
                        </Text>
                        <Text variant="caption" style={webStyles.emptyMealsSubtitle}>
                          Snap a photo and watch your nutrition story build itself.
                        </Text>
                      </View>
                    </Pressable>
                  ) : (
                    <View style={webStyles.mealsList}>
                      {recentMeals.map((meal) => (
                        <View key={meal.id} style={webStyles.mealRow}>
                          <MealImage imageUrl={meal.imageUrl} size={48} borderRadius={10} />
                          <View style={webStyles.mealRowCopy}>
                            <Text variant="body" weight="bold" style={webStyles.mealRowTitle}>
                              {formatMealName(meal.name)}
                            </Text>
                            <Text variant="caption" style={webStyles.mealRowMeta}>
                              {getMealType(new Date(meal.consumedAt))} · {new Date(meal.consumedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                          <Pressable
                            style={webStyles.seeDetailsBtn}
                            onPress={() => navigation.navigate('Main', { screen: 'Profile', params: { screen: 'MealHistory' } } as any)}
                          >
                            <Text variant="caption" weight="semibold" style={webStyles.seeDetailsText}>
                              See details
                            </Text>
                          </Pressable>
                        </View>
                      ))}
                      <Pressable
                        onPress={() => navigation.navigate('Main', { screen: 'Profile', params: { screen: 'MealHistory' } } as any)}
                        style={webStyles.viewAllBtn}
                      >
                        <Text variant="body" weight="semibold" style={webStyles.viewAllBtnText}>
                          View all logs
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                <View style={webStyles.activityCol3}>
                  <Text variant="heading4" weight="bold" style={webStyles.colTitle}>
                    Services
                  </Text>
                  {serviceCards.map((service) => (
                    <Pressable
                      key={service.title}
                      onPress={service.onPress}
                      style={({ pressed }) => [
                        webStyles.serviceCard,
                        { backgroundColor: service.backgroundColor },
                        pressed && webStyles.serviceCardPressed,
                      ]}
                    >
                      <Image source={service.illustration} style={webStyles.serviceIllustration as any} contentFit="contain" />
                      <View style={webStyles.serviceCopy}>
                        <Text variant="body" weight="bold" style={webStyles.serviceTitle}>{service.title}</Text>
                        <Text variant="caption" style={webStyles.serviceBody}>
                          {service.body}
                        </Text>
                      </View>
                      <CaretRight size={18} color="#7B7B7B" />
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* ── PERFORMANCE TODAY — Hero rings + 2-col bento ── */}
            <View style={webStyles.section}>
              <Text variant="heading2" weight="bold" style={webStyles.perfTitle}>
                Performance today
              </Text>

              {/* Hero: Nutrition Rings (full width, visual focal point) */}
              <View style={webStyles.perfHero}>
                {showNutritionLoading ? (
                  <NutritionRingsSkeleton />
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
                    onSourcesPress={() => navigation.navigate('AboutNutritionData' as any)}
                  />
                )}
              </View>

              {/* Secondary: Score + Tasks (2-col) */}
              <View style={webStyles.perfRow}>
                <View style={webStyles.perfHalf}>
                  <DailyScoreCard
                    data={{
                      calories: nutritionData.calories,
                      calorieGoal,
                      protein: nutritionData.protein,
                      carbs: nutritionData.carbs,
                      fat: nutritionData.fat,
                      hydrationCups,
                      hydrationGoal: hydrationGoalCups,
                      streak: currentUser.data?.currentStreak || 0,
                    }}
                  />
                </View>
                <View style={webStyles.perfHalf}>
                  <DailyTasksCard
                    data={{
                      calories: nutritionData.calories,
                      calorieGoal,
                      protein: nutritionData.protein,
                      mealCount: nutritionData.meals.length,
                      hydrationCups,
                      hydrationGoal: hydrationGoalCups,
                    }}
                  />
                </View>
              </View>
            </View>

            <View style={webStyles.section}>
              <View style={webStyles.sectionHeader}>
                <View style={[webStyles.sectionEyebrow, webStyles.sectionEyebrowCool]}>
                  <Text variant="label" weight="bold" style={webStyles.sectionEyebrowText}>
                    Weekly planner
                  </Text>
                </View>
                <Text variant="heading2" weight="bold" style={webStyles.sectionHeading}>
                  Plan for later
                </Text>
                <Text variant="body" style={webStyles.sectionSubheading}>
                  Pick a direction now. Build my plan only needs sex, height, and weight after this selection.
                </Text>
              </View>
              <View style={webStyles.planRow}>
                <View style={webStyles.planAccentCard}>
                  <View style={webStyles.planBadge}>
                    <Text variant="label" weight="bold" style={webStyles.planBadgeText}>
                      Weekly planner
                    </Text>
                  </View>
                  <Text variant="heading2" weight="bold" style={webStyles.planAccentTitle}>
                    {selectedPlanPreview.title}
                  </Text>
                  <Text variant="body" style={webStyles.planAccentBody}>
                    {selectedPlanPreview.description}
                  </Text>

                  <View style={webStyles.planTabsRow}>
                    {(Object.keys(GOAL_TYPE_CONFIG) as GoalType[]).map((goalKey) => {
                      const option = GOAL_TYPE_CONFIG[goalKey];
                      const isSelected = planPreviewGoal === goalKey;

                      return (
                        <Pressable
                          key={goalKey}
                          onPress={() => {
                            setPlanPreviewGoal(goalKey);
                            setHasTouchedPlanPreview(true);
                          }}
                          style={({ pressed }) => [
                            webStyles.planTab,
                            {
                              backgroundColor: isSelected ? `${option.color}18` : '#FFFFFF',
                              borderColor: isSelected ? option.color : 'rgba(17,17,17,0.08)',
                            },
                            pressed && webStyles.planTabPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Choose ${option.label}`}
                          accessibilityState={{ selected: isSelected }}
                        >
                          <View style={[webStyles.planTabIcon, { backgroundColor: `${option.color}14` }]}>
                            <option.Icon size={18} weight={isSelected ? 'fill' : 'regular'} color={option.color} />
                          </View>
                          <Text variant="body" weight="bold" style={webStyles.planTabTitle}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={webStyles.planPreviewStats}>
                    <View style={webStyles.planField}>
                      <Text variant="caption" style={webStyles.planFieldLabel}>Focus</Text>
                      <Text variant="body" weight="semibold" style={webStyles.planFieldValue}>{selectedPlanPreview.focus}</Text>
                    </View>
                    <View style={webStyles.planField}>
                      <Text variant="caption" style={webStyles.planFieldLabel}>Weekly rhythm</Text>
                      <Text variant="body" weight="semibold" style={webStyles.planFieldValue}>{selectedPlanRhythm}</Text>
                    </View>
                    <View style={webStyles.planField}>
                      <Text variant="caption" style={webStyles.planFieldLabel}>Target</Text>
                      <Text variant="body" weight="semibold" style={webStyles.planFieldValue}>{selectedPlanTarget}</Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => navigation.navigate('BuildPlan', { initialGoal: planPreviewGoal })}
                    style={({ pressed }) => [webStyles.planCta, pressed && webStyles.heroCtaPressed]}
                  >
                    <Text variant="body" weight="bold" style={webStyles.planCtaText}>
                      Build my plan
                    </Text>
                  </Pressable>

                  <Image
                    source={illustrationWorkouts}
                    style={webStyles.planIllustration as any}
                    contentFit="contain"
                  />
                </View>

                <View style={webStyles.planBenefitsPanel}>
                  <Text variant="heading3" weight="bold" style={webStyles.planBenefitsTitle}>
                    Benefits
                  </Text>

                  <View style={webStyles.benefitRow}>
                    <View style={[webStyles.benefitIcon, { backgroundColor: '#FFF1E7' }]}>
                      <Target size={20} weight="bold" color="#C96A34" />
                    </View>
                    <View style={webStyles.benefitCopy}>
                      <Text variant="body" weight="semibold" style={webStyles.benefitTitle}>Personalized targets</Text>
                      <Text variant="body" style={webStyles.benefitBody}>AI generates your daily calorie and macro targets from your goal.</Text>
                    </View>
                  </View>

                  <View style={webStyles.benefitRow}>
                    <View style={[webStyles.benefitIcon, { backgroundColor: '#E0F5EF' }]}>
                      <Barbell size={20} weight="bold" color="#2F7A6A" />
                    </View>
                    <View style={webStyles.benefitCopy}>
                      <Text variant="body" weight="semibold" style={webStyles.benefitTitle}>Adaptive weekly structure</Text>
                      <Text variant="body" style={webStyles.benefitBody}>Strength, meals, and recovery stay aligned to your weekly schedule.</Text>
                    </View>
                  </View>

                  <View style={[webStyles.benefitRow, webStyles.benefitRowLast]}>
                    <View style={[webStyles.benefitIcon, { backgroundColor: '#E9F5FF' }]}>
                      <ChartLine size={20} weight="bold" color="#3B82F6" />
                    </View>
                    <View style={webStyles.benefitCopy}>
                      <Text variant="body" weight="semibold" style={webStyles.benefitTitle}>Exportable progress</Text>
                      <Text variant="body" style={webStyles.benefitBody}>Review your week and export nutrition data as CSV with one tap.</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={webStyles.footerWrap}>
              <LandingFooter
                onGetStarted={() => navigation.navigate('Profile')}
                onLogin={() => navigation.navigate('Profile')}
                showFinalCTA={false}
                onLinkPress={handleLandingFooterLink}
              />
            </View>
          </RNScrollView>
        </View>
      </SafeAreaWrapper>
    );
  }

  const renderGoalsSection = (styleOverride?: object) => {
    if (generatedGoals) {
      return (
        <View style={[Platform.OS !== 'web' ? MOBILE_CARD_STYLES : BENTO_CARD_STYLES, BENTO_CARD_WEB_STYLES as any, styles.goalsCard, styleOverride]}>
          <View style={styles.goalsHeader}>
            <View style={styles.goalsHeaderLeft}>
              {goalTypeConfig && (
                <View style={[styles.goalTypeIconSmall, { backgroundColor: `${goalTypeConfig.color}15` }]}>
                  <goalTypeConfig.Icon
                    size={20}
                    color={goalTypeConfig.color}
                    weight="regular"
                  />
                </View>
              )}
              <View>
                <Text variant="caption" style={styles.goalLabel}>{Platform.OS !== 'web' ? 'ACTIVE PLAN' : 'Your Goal'}</Text>
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
              <PencilSimple size={16} color={BRAND_COLORS.primary} weight="regular" />
            </Pressable>
          </View>

          <View style={styles.goalsGrid}>
            <Pressable 
              style={({ pressed }) => [styles.goalItem, styles.goalItemCalories, pressed && { opacity: 0.7 }]}
              onPress={() => handleMacroSearch('calories')}
            >
              <Fire size={20} weight="fill" color={BRAND_COLORS.macros.calories} />
              <Text variant="heading3" weight="bold">{generatedGoals.dailyCalories.target}</Text>
              <Text variant="caption" style={styles.goalItemLabel}>kcal/day</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [styles.goalItem, styles.goalItemProtein, pressed && { opacity: 0.7 }]}
              onPress={() => handleMacroSearch('protein')}
            >
              <Barbell size={20} weight="fill" color={BRAND_COLORS.macros.protein} />
              <Text variant="heading3" weight="bold">{generatedGoals.macros_grams.protein_g}g</Text>
              <Text variant="caption" style={styles.goalItemLabel}>Protein</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [styles.goalItem, styles.goalItemCarbs, pressed && { opacity: 0.7 }]}
              onPress={() => handleMacroSearch('carbs')}
            >
              <Grains size={20} weight="fill" color={BRAND_COLORS.macros.carbs} />
              <Text variant="heading3" weight="bold">{generatedGoals.macros_grams.carbs_g}g</Text>
              <Text variant="caption" style={styles.goalItemLabel}>Carbs</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [styles.goalItem, styles.goalItemFat, pressed && { opacity: 0.7 }]}
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
              <PersonSimpleRun size={16} color={BRAND_COLORS.secondary} weight="regular" />
              <Text variant="caption">
                {generatedGoals.weeklyActivityPlan.cardio_minutes_per_week} min cardio/week
              </Text>
            </View>
            <View style={styles.activityItem}>
              <Sneaker size={16} color={BRAND_COLORS.primary} weight="regular" />
              <Text variant="caption">
                {generatedGoals.weeklyActivityPlan.steps_per_day_target.toLocaleString()} steps/day
              </Text>
            </View>
          </View>
        </View>
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
            <Target size={20} color={BRAND_COLORS.textPrimary} weight="regular" />
          </View>
          <View style={styles.setGoalsText}>
            <Text variant="body" weight="bold" style={styles.setGoalsTitle}>Set Your Fitness Goals</Text>
            <Text variant="caption" style={styles.setGoalsSubtext}>
              Build clear calorie and macro targets
            </Text>
          </View>
          <View style={styles.setGoalsChevron}>
            <CaretRight size={16} color={BRAND_COLORS.textPrimary} weight="regular" />
          </View>
        </View>
      </Pressable>
    );
  };

  const renderNutritionCard = () => (
    <TourGuideZone
      zone={TODAYS_NUTRITION_STEP.zone}
      text={TODAYS_NUTRITION_STEP.text}
      title={TODAYS_NUTRITION_STEP.title}
      icon="📊"
    >
      {/* Only show loading on initial load; once data exists, keep component alive */}
      {showNutritionLoading ? (
        <NutritionRingsSkeleton />
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

  // Section header — Uber bold labels above each card section (mobile only)
  const SectionHeader = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
    <View style={styles.sectionHeader}>
      <Text variant="heading4" weight="bold" style={styles.sectionTitle}>{title}</Text>
      {action && onAction && (
        <Pressable onPress={onAction}><Text variant="caption" weight="semibold" style={styles.sectionAction}>{action}</Text></Pressable>
      )}
    </View>
  );

  const renderMobileHero = () => {
    const calorieDelta = Math.max(0, calorieGoal - nutritionData.calories);
    const proteinPercent = proteinGoal > 0 ? Math.min(100, Math.round((nutritionData.protein.current / proteinGoal) * 100)) : 0;
    const calorieProgress = calorieGoal > 0 ? Math.min(100, Math.round((nutritionData.calories / calorieGoal) * 100)) : 0;
    const hydrationPercent = hydrationGoalCups > 0 ? Math.min(100, Math.round((hydrationCups / hydrationGoalCups) * 100)) : 0;
    const activePlanLabel = goalTypeConfig?.label || 'General reference';
    const focusMessage = nutritionData.meals.length === 0
      ? 'Log your first meal to start the day with a real baseline.'
      : proteinPercent < 80
        ? 'Protein is still trailing. Use your next meal to close the gap.'
        : hydrationPercent < 60
          ? 'Hydration is behind pace. A few more cups will sharpen the day.'
          : 'You are on pace. Keep meals and hydration steady to hold your score.';

    return (
      <View style={styles.mobileHeroCard}>
        <View style={styles.mobileHeroHeader}>
          <View style={styles.mobileHeroTopRow}>
            <Text variant="label" weight="bold" style={styles.mobileHeroKicker}>SUMMARY</Text>
            <View style={styles.mobileHeroBadge}>
              <Text variant="caption" weight="bold" style={styles.mobileHeroBadgeText}>
                {welcomeSummary}
              </Text>
            </View>
          </View>
          <Text variant="heading2" weight="bold" style={styles.mobileHeroTitle}>
            Fuel your day
          </Text>
          <Text variant="body" style={styles.mobileHeroSubtitle}>
            A brighter summary for food, hydration, and recovery at a glance.
          </Text>
        </View>

        <View style={styles.mobileHeroFocusCard}>
          <View style={styles.mobileHeroFocusHeader}>
            <Text variant="caption" weight="bold" style={styles.mobileHeroFocusKicker}>CURRENT FOCUS</Text>
            <View style={styles.mobileHeroPlanChip}>
              <Text variant="caption" weight="bold" style={styles.mobileHeroPlanChipText}>{activePlanLabel}</Text>
            </View>
          </View>
          <Text variant="body" weight="bold" style={styles.mobileHeroFocusTitle}>
            {focusMessage}
          </Text>
          <Text variant="caption" style={styles.mobileHeroFocusMeta}>
            {currentUser.data?.currentStreak || 0} day streak · {nutritionData.meals.length} meals logged
          </Text>
        </View>

        <View style={styles.mobileHeroMetricRow}>
          <View style={[styles.mobileHeroMetric, styles.mobileHeroMetricWarm]}>
            <Text variant="caption" style={styles.mobileHeroMetricLabel}>Calories left</Text>
            <Text variant="heading3" weight="bold" style={styles.mobileHeroMetricValue}>{calorieDelta}</Text>
            <Text variant="caption" style={styles.mobileHeroMetricMeta}>{calorieProgress}% of target used</Text>
            <View style={[styles.mobileHeroProgressTrack, { backgroundColor: 'rgba(249,115,22,0.14)' }]}>
              <View style={[styles.mobileHeroProgressFill, { width: `${calorieProgress}%`, backgroundColor: '#F97316' }]} />
            </View>
          </View>
          <View style={[styles.mobileHeroMetric, styles.mobileHeroMetricMint]}>
            <Text variant="caption" style={styles.mobileHeroMetricLabel}>Protein</Text>
            <Text variant="heading3" weight="bold" style={styles.mobileHeroMetricValue}>{proteinPercent}%</Text>
            <Text variant="caption" style={styles.mobileHeroMetricMeta}>
              {Math.round(nutritionData.protein.current)}/{proteinGoal}g
            </Text>
            <View style={[styles.mobileHeroProgressTrack, { backgroundColor: 'rgba(47,122,106,0.14)' }]}>
              <View style={[styles.mobileHeroProgressFill, { width: `${proteinPercent}%`, backgroundColor: '#2F7A6A' }]} />
            </View>
          </View>
          <View style={[styles.mobileHeroMetric, styles.mobileHeroMetricSky]}>
            <Text variant="caption" style={styles.mobileHeroMetricLabel}>Hydration</Text>
            <Text variant="heading3" weight="bold" style={styles.mobileHeroMetricValue}>{hydrationPercent}%</Text>
            <Text variant="caption" style={styles.mobileHeroMetricMeta}>
              {hydrationCups}/{hydrationGoalCups} cups
            </Text>
            <View style={[styles.mobileHeroProgressTrack, { backgroundColor: 'rgba(59,130,246,0.14)' }]}>
              <View style={[styles.mobileHeroProgressFill, { width: `${hydrationPercent}%`, backgroundColor: '#3B82F6' }]} />
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render right panel widgets (only shown on wide screens)
  const renderRightPanel = () => (
    <DashboardWidgets
      generatedGoals={generatedGoals}
    />
  );

  return (
    <SafeAreaWrapper>
      <View style={styles.screenRoot}>
        {Platform.OS !== 'web' && (
          <View pointerEvents="none" style={styles.mobileBackdropLayer}>
            <View style={[styles.mobileBackdropBand, styles.mobileBackdropBandWarm]} />
            <View style={[styles.mobileBackdropBand, styles.mobileBackdropBandMint]} />
            <View style={[styles.mobileBackdropBand, styles.mobileBackdropBandSky]} />
          </View>
        )}
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
            {/* Header — Uber typography: greeting is hero, name is secondary */}
            <Animated.View entering={staggerEnter(0)} style={styles.header}>
              <View style={styles.headerLeft}>
                <Text variant={Platform.OS !== 'web' ? 'heading2' : 'caption'} weight={Platform.OS !== 'web' ? 'bold' : undefined} style={styles.greeting}>{greeting}</Text>
                <View style={styles.nameRow}>
                  <Text variant={Platform.OS !== 'web' ? 'body' : 'heading1'} weight={Platform.OS !== 'web' ? 'medium' : 'bold'} style={styles.userName}>
                    {currentUser.data?.username || 'User'}
                  </Text>
                  <StreakBadge streak={currentUser.data?.currentStreak || 0} compact />
                </View>
                <Text variant="caption" style={styles.contextLine}>{contextLine}</Text>
              </View>
              {/* Profile button: web only (mobile uses Profile tab) */}
              {Platform.OS === 'web' && !showRightPanel && (
                <View style={styles.headerActions}>
                  <Pressable
                    style={styles.profileButton}
                    onPress={() => navigation.navigate('Profile')}
                  >
                    <User size={22} color={BRAND_COLORS.textPrimary} weight="regular" />
                  </Pressable>
                </View>
              )}
            </Animated.View>

            {Platform.OS !== 'web' && (
              <Animated.View entering={staggerEnter(1)}>{renderMobileHero()}</Animated.View>
            )}

            {/* Quick-log bar — Uber "Where to?" pattern, mobile only */}
            {Platform.OS !== 'web' && (
              <View style={styles.quickLogRow}>
                <TourGuideZone
                  zone={SNAP_MEAL_STEP.zone}
                  text={SNAP_MEAL_STEP.text}
                  title={SNAP_MEAL_STEP.title}
                  icon="📸"
                  style={{ flex: 1 }}
                >
                  <Pressable onPress={handleAddFood} style={({pressed}) => [styles.quickLogBar, pressed && styles.quickLogBarPressed]}>
                    <View style={styles.quickLogBarIcon}>
                      <Camera size={20} color="#FFFFFF" weight="regular" />
                    </View>
                    <View style={styles.quickLogBarCopy}>
                      <Text style={styles.quickLogBarText}>Snap a meal</Text>
                      <Text style={styles.quickLogBarSubtext}>Camera or gallery</Text>
                    </View>
                  </Pressable>
                </TourGuideZone>
                <Pressable onPress={() => setShowWeightModal(true)} style={({pressed}) => [styles.quickLogWeightBtn, pressed && styles.quickLogBarPressed]}>
                  <Scales size={20} color={BRAND_COLORS.primary} weight="regular" />
                  <Text style={styles.quickLogWeightText}>Weight</Text>
                </Pressable>
              </View>
            )}

            {/* Welcome Tour Card for new users */}
            {showWelcomeCard && (
              <WelcomeTourCard
                onStartTour={handleStartTour}
                onSkip={handleSkipTour}
              />
            )}

            {/* Goals card/prompt - only in main column when right panel is hidden */}
            {!showSidebar && !showRightPanel && !showInlineGoalsRow && (
              <View>
                <SectionHeader title="Your Goal" action="Edit" onAction={() => navigation.navigate('BuildPlan' as any)} />
                {renderGoalsSection()}
              </View>
            )}
            {showSidebar && !showRightPanel && !showInlineGoalsRow && renderGoalsSection()}

                    {/* Main content wrapper — 24px gap on mobile (Uber rhythm) */}
                  <View
                    style={
                      showSidebar
                        ? showRightPanel
                          ? styles.desktopContentWrapper
                          : styles.sidebarContentWrapper
                        : styles.mobileContentWrapper
                    }
                  >
                    {/* Daily Tasks */}
                    {!nutritionLoading && generatedGoals && (
                      <Animated.View entering={staggerEnter(1)}>
                        {!showSidebar && <SectionHeader title="Today's Tasks" />}
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

                    {/* Daily Score is secondary after the task center */}
                    {!nutritionLoading && generatedGoals && (
                      <Animated.View entering={staggerEnter(2)}>
                        {!showSidebar && <SectionHeader title="Daily Score" />}
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
                      <View>
                        {!showSidebar && <SectionHeader title="Nutrition" />}
                        {renderNutritionCard()}
                      </View>
                    )}
                    </Animated.View>

                    {/* Nutrition Insights - Trend & Balance charts */}
                    {!nutritionLoading && generatedGoals && (
                      <View>
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
                      <View>
                        <QuickActionsCard />
                      </View>
                    )}

                  {/* Today's Meals */}
                  <Animated.View entering={staggerEnter(4)}>
                  {!showSidebar && <SectionHeader title="Today's Meals" />}
                  <View
                    style={[
                      Platform.OS !== 'web' ? MOBILE_CARD_STYLES : undefined,
                      styles.mealsCard,
                      showSidebar && (showRightPanel ? styles.mealsCardDesktop : styles.mealsCardSidebar),
                    ]}
                  >
                    {/* Header - matches NutritionRingsCard header (web only on mobile, section header replaces it) */}
                    {showSidebar && (
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

                      {/* Compact Snap Button (web only, main tour anchor lives in the hero CTA) */}
                      {Platform.OS === 'web' && (
                        <Pressable
                          onPress={handleAddFood}
                          style={({pressed}) => [styles.compactSnapBtn, pressed && styles.compactSnapBtnPressed]}
                        >
                           <Camera size={16} color="#FFFFFF" weight="regular" />
                           <Text style={styles.compactSnapBtnText}>Snap Meal</Text>
                        </Pressable>
                      )}
                    </View>
                    )}

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
                      <CameraPlus size={24} color={BRAND_COLORS.primary} weight="regular" />
                    </View>
                    <View style={styles.emptyMealsTextContainer}>
                      <Text variant="body" weight="semibold" style={styles.emptyMealsTitle}>
                        Your meal log is waiting
                      </Text>
                      <Text variant="caption" style={styles.emptyMealsHint}>
                        Snap a photo and your nutrition story starts here
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
                        size={Platform.OS !== 'web' ? 64 : 56}
                        borderRadius={Platform.OS !== 'web' ? 14 : 12}
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
            </View>
            </Animated.View>

                    {/* Support contact — Apple requires visible support reference */}
                    <Pressable
                      onPress={() => Linking.openURL('mailto:support@aurafitness.org').catch(() => {})}
                      style={({ pressed }) => [styles.supportRow, pressed && { opacity: 0.7 }]}
                    >
                      <EnvelopeSimple size={14} color={BRAND_COLORS.textMuted} />
                      <Text variant="caption" style={styles.supportText}>
                        Need help? support@aurafitness.org
                      </Text>
                    </Pressable>
          </View>
          </TourScrollView>
        </ScreenLayout>
      </View>
      <WeightLogModal visible={showWeightModal} onDismiss={() => setShowWeightModal(false)} />
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#FFF9F2',
  },
  mobileBackdropLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  mobileBackdropBand: {
    position: 'absolute',
    borderRadius: 999,
  },
  mobileBackdropBandWarm: {
    width: 240,
    height: 240,
    top: -70,
    right: -60,
    backgroundColor: 'rgba(255, 209, 178, 0.42)',
  },
  mobileBackdropBandMint: {
    width: 220,
    height: 220,
    top: 240,
    left: -110,
    backgroundColor: 'rgba(190, 241, 226, 0.4)',
  },
  mobileBackdropBandSky: {
    width: 260,
    height: 260,
    bottom: 140,
    right: -120,
    backgroundColor: 'rgba(205, 232, 255, 0.32)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.md,
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
    alignItems: 'flex-end',
    marginBottom: Platform.OS !== 'web' ? spacing.lg : spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: Platform.select({
    web: {
      color: BRAND_COLORS.textMuted,
      marginBottom: 2,
      fontSize: 14,
      letterSpacing: 0.6,
    },
    default: {
      color: '#5F5A52',
      fontSize: 14,
      fontWeight: '700' as const,
      letterSpacing: 0.8,
      marginBottom: 2,
    },
  }),
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: Platform.select({
    web: {
      color: BRAND_COLORS.textPrimary,
      letterSpacing: -0.7,
    },
    default: {
      color: '#111111',
      fontSize: 28,
      fontWeight: '700' as const,
      letterSpacing: -0.8,
    },
  }),
  contextLine: {
    color: '#6B665F',
    marginTop: Platform.OS !== 'web' ? 4 : 6,
    fontSize: Platform.OS !== 'web' ? 13 : 14,
  },
  mobileHeroCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: 32,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E9E0D2',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 28,
    shadowOpacity: 0.07,
    elevation: 8,
  },
  mobileHeroHeader: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  mobileHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileHeroKicker: {
    color: '#8A7560',
    letterSpacing: 1.3,
  },
  mobileHeroTitle: {
    color: '#111111',
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -1.4,
  },
  mobileHeroSubtitle: {
    color: '#374151',
    marginTop: 6,
    fontSize: 16,
    lineHeight: 24,
  },
  mobileHeroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: '#FFF3E6',
    borderWidth: 1,
    borderColor: '#F1D7B8',
  },
  mobileHeroBadgeText: {
    color: '#8C4A1D',
  },
  mobileHeroFocusCard: {
    backgroundColor: '#121212',
    borderRadius: 26,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  mobileHeroFocusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  mobileHeroFocusKicker: {
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 1,
  },
  mobileHeroPlanChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  mobileHeroPlanChipText: {
    color: '#FFFFFF',
  },
  mobileHeroFocusTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  mobileHeroFocusMeta: {
    color: 'rgba(255,255,255,0.68)',
    marginTop: spacing.sm,
  },
  mobileHeroMetricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mobileHeroMetric: {
    flex: 1,
    minWidth: 100,
    minHeight: 108,
    padding: spacing.md,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE3D7',
    justifyContent: 'space-between',
  },
  mobileHeroMetricWarm: {
    backgroundColor: '#FFF4EA',
    borderColor: '#F3D7BE',
    borderTopWidth: 3,
    borderTopColor: '#F97316',
  },
  mobileHeroMetricMint: {
    backgroundColor: '#ECF9F3',
    borderColor: '#CBEBDD',
    borderTopWidth: 3,
    borderTopColor: '#2F7A6A',
  },
  mobileHeroMetricSky: {
    backgroundColor: '#EEF6FF',
    borderColor: '#D7E8FB',
    borderTopWidth: 3,
    borderTopColor: '#3B82F6',
  },
  mobileHeroMetricLabel: {
    color: '#6B665F',
  },
  mobileHeroMetricValue: {
    color: '#111111',
    fontSize: 30,
    letterSpacing: -0.7,
  },
  mobileHeroMetricMeta: {
    color: '#4B5563',
  },
  mobileHeroProgressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden' as const,
    marginTop: 4,
  },
  mobileHeroProgressFill: {
    height: '100%' as any,
    borderRadius: 3,
  },
  // Quick-log bar — Uber "Where to?" pattern
  quickLogRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickLogBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: EXPERIENCE_COLORS.ink,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  quickLogBarIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLogBarCopy: {
    flex: 1,
  },
  quickLogWeightBtn: {
    minWidth: 98,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E4DACE',
  },
  quickLogBarPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  quickLogBarText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' as const },
  quickLogBarSubtext: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginTop: 1,
  },
  quickLogWeightText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  // Section headers — Uber bold labels
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#111111', fontSize: 20, letterSpacing: -0.5 },
  sectionAction: { color: '#111111', fontSize: 14 },
  // Mobile content wrapper — uniform 24px gap between sections
  mobileContentWrapper: { gap: 28 },
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
      boxShadow: '0 10px 22px rgba(17,17,17,0.04)',
    }),
  },
  // Goals card - extends BentoCard with margin
  goalsCard: {
    ...(Platform.OS !== 'web' ? {
      backgroundColor: '#FFFEFB',
      borderColor: '#E8DED2',
      borderRadius: 28,
      shadowOpacity: 0.05,
    } : {}),
  },
  goalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
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
    color: Platform.OS !== 'web' ? '#8A7560' : BRAND_COLORS.textSecondary,
    marginBottom: 2,
  },
  editGoalsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Platform.OS !== 'web' ? '#F8EFE4' : BRAND_COLORS.primaryTint,
    borderWidth: Platform.OS !== 'web' ? 1 : 0,
    borderColor: Platform.OS !== 'web' ? '#EADAC4' : 'transparent',
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
    minHeight: 84,
    borderRadius: 18,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(242,233,222,0.8)',
    backgroundColor: Platform.OS !== 'web' ? '#F8F4ED' : 'rgba(255,255,255,0.58)',
  },
  goalItemCalories: { backgroundColor: '#FFF1E5', borderColor: '#F4D5B9' },
  goalItemProtein: { backgroundColor: '#EAF8F2', borderColor: '#CEE8DB' },
  goalItemCarbs: { backgroundColor: '#F0F5E8', borderColor: '#DAE4C2' },
  goalItemFat: { backgroundColor: '#FFF4E9', borderColor: '#F2D8BF' },
  goalItemLabel: {
    color: '#6B665F',
    marginTop: 4,
    textAlign: 'center',
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    ...(Platform.OS === 'web'
      ? { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.light.border }
      : { marginTop: spacing.md }),
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Platform.OS !== 'web' ? '#F8F4ED' : 'transparent',
    borderWidth: Platform.OS !== 'web' ? 1 : 0,
    borderColor: Platform.OS !== 'web' ? '#EADFD0' : 'transparent',
  },
  // Set goals prompt - Aura look with SaaS shadow
  setGoalsPrompt: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Platform.OS !== 'web' ? '#E7DCCF' : BRAND_COLORS.border,
    backgroundColor: '#FFFEFB',
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#111111',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.05,
      shadowRadius: 22,
      elevation: 6,
    } : {}),
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.2s ease-out',
      boxShadow: '0 10px 22px rgba(17,17,17,0.04)',
    }),
  },
  setGoalsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Platform.OS !== 'web' ? spacing.lg : spacing.md,
    gap: spacing.md,
  },
  setGoalsIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BRAND_COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
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
    color: BRAND_COLORS.textMuted,
    marginTop: 2,
  },
  setGoalsChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
  },
  // Calorie card - Stripe/Linear style
  calorieCard: {
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
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
    backgroundColor: '#111111',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#111111',
    gap: 6,
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
  // Meals card — web uses BentoCard styles, mobile uses MOBILE_CARD_STYLES from render
  mealsCard: {
    ...(Platform.OS === 'web' ? { ...BENTO_CARD_STYLES, ...(BENTO_CARD_WEB_STYLES as object) } : {}),
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
    padding: Platform.OS !== 'web' ? spacing['2xl'] : spacing.xl,
    backgroundColor: '#F7F6F3',
    borderRadius: radii.lg, // 16
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: BRAND_COLORS.border,
    gap: spacing.sm,
    width: '100%',
  },
  emptyMealsContentPressed: {
    backgroundColor: '#F1EFEB',
    transform: [{ scale: 0.99 }],
  },
  emptyMealsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BRAND_COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
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
    paddingVertical: Platform.OS !== 'web' ? spacing.md : spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND_COLORS.borderSubtle,
    gap: Platform.OS !== 'web' ? spacing.lg : spacing.md,
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
    color: Platform.OS !== 'web' ? '#111111' : BRAND_COLORS.primaryDark,
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
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  supportText: {
    color: '#4B5563',
  },

});

const webStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  heroSection: {
    flexDirection: 'row',
    gap: 64,
    maxWidth: 1360,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 56,
    paddingBottom: 56,
  },
  heroLeft: {
    flex: 1,
    maxWidth: 560,
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroEyebrowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroEyebrowText: {
    color: '#111111',
  },
  heroInlineLink: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.18)',
    paddingBottom: 2,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  heroInlineLinkPressed: {
    opacity: 0.72,
  },
  heroInlineLinkText: {
    color: '#111111',
  },
  heroTitle: {
    color: '#111111',
    fontSize: 72,
    lineHeight: 74,
    letterSpacing: -2.8,
    maxWidth: 520,
  },
  heroSubtitle: {
    color: '#4B4B4B',
    fontSize: 18,
    lineHeight: 30,
    marginTop: 20,
    maxWidth: 520,
  },
  heroModePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFEFEF',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginTop: 28,
    marginBottom: 24,
  },
  heroModePillText: {
    color: '#111111',
  },
  heroInputCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: spacing.md,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'background-color 0.15s ease-out',
    }),
  },
  heroInputPressed: {
    backgroundColor: '#ECECEC',
  },
  heroInputConnector: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: -20,
    width: 16,
    alignItems: 'center',
  },
  heroInputConnectorHidden: {
    opacity: 0,
  },
  heroInputDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#111111',
    marginTop: 8,
  },
  heroInputLine: {
    width: 1,
    flex: 1,
    marginTop: 4,
    backgroundColor: '#111111',
  },
  heroInputIcon: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 18,
  },
  heroInputCopy: {
    flex: 1,
  },
  heroInputTitle: {
    color: '#111111',
    marginBottom: 2,
  },
  heroInputBody: {
    color: '#6B6B6B',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginTop: spacing.lg,
  },
  heroPrimaryCta: {
    backgroundColor: '#111111',
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 12,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  heroPrimaryCtaText: {
    color: '#FFFFFF',
  },
  heroSecondaryLink: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.18)',
    paddingBottom: 4,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  heroSecondaryLinkText: {
    color: '#111111',
  },
  heroCtaPressed: {
    opacity: 0.9,
  },
  heroRight: {
    flex: 1.05,
    paddingTop: 92,
  },
  suggestionsTitle: {
    color: '#111111',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.8,
    marginBottom: 20,
  },
  section: {
    maxWidth: 1360,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 32,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginBottom: 28,
    gap: 10,
  },
  sectionEyebrow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sectionEyebrowWarm: {
    backgroundColor: '#FFF1D7',
  },
  sectionEyebrowCool: {
    backgroundColor: '#E9F4FF',
  },
  sectionEyebrowText: {
    color: '#111111',
  },
  sectionHeading: {
    color: '#111111',
    fontSize: 56,
    lineHeight: 58,
    letterSpacing: -2.2,
  },
  sectionSubheading: {
    color: '#111111',
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 760,
  },
  activityCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E7E7E7',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  activityCol1: {
    flex: 2.1,
    padding: 24,
    borderRightWidth: 1,
    borderRightColor: '#ECECEC',
  },
  activityCol2: {
    flex: 2,
    padding: 24,
    borderRightWidth: 1,
    borderRightColor: '#ECECEC',
  },
  activityCol3: {
    flex: 1.9,
    padding: 24,
  },
  colTitle: {
    color: '#111111',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  programCard: {
    backgroundColor: '#FFF2D5',
    borderRadius: 18,
    padding: 20,
    minHeight: 260,
    marginBottom: 18,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'opacity 0.15s ease-out',
    }),
  },
  programCardPressed: {
    opacity: 0.92,
  },
  programCardCopy: {
    maxWidth: 240,
    zIndex: 1,
  },
  programCardLabel: {
    color: 'rgba(17,17,17,0.62)',
    marginBottom: 10,
  },
  programCardTitle: {
    color: '#111111',
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.6,
  },
  programCardBody: {
    color: '#343434',
    marginTop: 12,
  },
  programCardAction: {
    alignSelf: 'flex-start',
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  programCardActionText: {
    color: '#111111',
  },
  programCardIllustration: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 180,
    height: 180,
  },
  metricStack: {
    gap: 10,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: '#111111',
  },
  metricValue: {
    color: '#666666',
  },
  metricTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#EFEFEF',
    overflow: 'hidden',
    marginBottom: 4,
  },
  metricFill: {
    height: '100%',
    borderRadius: 999,
  },
  mealsList: {
    gap: 12,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  mealRowCopy: {
    flex: 1,
  },
  mealRowTitle: {
    color: '#111111',
  },
  mealRowMeta: {
    color: '#6B6B6B',
    marginTop: 2,
  },
  seeDetailsBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#F3F3F3',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  seeDetailsText: {
    color: '#111111',
  },
  viewAllBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#F3F3F3',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  viewAllBtnText: {
    color: '#111111',
  },
  emptyMeals: {
    flexDirection: 'row',
    gap: 12,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  emptyMealsCopy: {
    flex: 1,
  },
  emptyMealsTitle: {
    color: '#111111',
  },
  emptyMealsSubtitle: {
    color: '#6B6B6B',
    marginTop: 4,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  serviceCardPressed: {
    opacity: 0.92,
  },
  serviceIllustration: {
    width: 52,
    height: 52,
  },
  serviceCopy: {
    flex: 1,
  },
  serviceTitle: {
    color: '#111111',
    marginBottom: 2,
  },
  serviceBody: {
    color: '#6B6B6B',
  },
  // ── PERFORMANCE TODAY — Hero + 2-col bento ──
  perfTitle: {
    color: '#111111',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1,
    marginBottom: 20,
  },
  perfHero: {
    marginBottom: 16,
  },
  perfRow: {
    flexDirection: 'row',
    gap: 16,
  },
  perfHalf: {
    flex: 1,
  },
  // Legacy — kept so TS doesn't break on any remaining refs
  performanceContainer: {},
  performanceRow: { flexDirection: 'row', gap: 16 },
  performancePrimary: { flex: 1 },
  performanceSecondary: { flex: 1, gap: 16 },
  planRow: {
    flexDirection: 'row',
    gap: 28,
  },
  planAccentCard: {
    flex: 2.2,
    borderRadius: 28,
    padding: 32,
    overflow: 'hidden',
    minHeight: 460,
    borderWidth: 1,
    borderColor: '#E6E1D8',
    backgroundColor: '#FFF7EA',
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#EAE4D9',
  },
  planBadgeText: {
    color: '#111111',
  },
  planAccentTitle: {
    color: '#111111',
    fontSize: 52,
    lineHeight: 54,
    letterSpacing: -2,
    maxWidth: 560,
  },
  planAccentBody: {
    color: '#2C2C2C',
    fontSize: 18,
    lineHeight: 28,
    marginTop: 16,
    maxWidth: 520,
  },
  planTabsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
    marginBottom: 18,
  },
  planTab: {
    flex: 1,
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
      boxShadow: '0 10px 22px rgba(17,17,17,0.04)',
    }),
  },
  planTabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  planTabIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTabTitle: {
    color: '#111111',
  },
  planPreviewStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  planField: {
    flex: 1,
    minHeight: 96,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#EAE4D9',
    boxShadow: '0 10px 22px rgba(17,17,17,0.04)',
  },
  planFieldLabel: {
    color: 'rgba(17,17,17,0.62)',
    marginBottom: 6,
  },
  planFieldValue: {
    color: '#111111',
  },
  planCta: {
    alignSelf: 'flex-start',
    backgroundColor: '#111111',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 12,
    marginTop: 6,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  planCtaText: {
    color: '#FFFFFF',
  },
  planIllustration: {
    position: 'absolute',
    right: -10,
    bottom: -12,
    width: 220,
    height: 220,
    opacity: 0.25,
  },
  planBenefitsPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7E7E7',
    padding: 24,
    justifyContent: 'space-between',
  },
  planBenefitsTitle: {
    color: '#111111',
    marginBottom: 12,
  },
  benefitRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'flex-start',
  },
  benefitRowLast: {
    borderBottomWidth: 0,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitCopy: {
    flex: 1,
  },
  benefitTitle: {
    color: '#111111',
    marginBottom: 4,
  },
  benefitBody: {
    color: '#5E5E5E',
    lineHeight: 24,
  },
  footerWrap: {
    maxWidth: 1360,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 32,
    paddingBottom: 56,
  },
});

export default DashboardScreen;
