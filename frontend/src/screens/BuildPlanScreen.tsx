/**
 * BuildPlanScreen — Multi-step wizard for collecting user info and generating
 * a personalised AI fitness plan.
 *
 * Pattern: OnboardingScreen (progress dots + hero heading + full-width CTA).
 * Competitive research: MyFitnessPal, Noom, Fitbod, MacroFactor all collect
 * sex, height/weight, and weekly availability during plan setup.
 *
 * Steps: Sex → Measurements → Weekly Time → Goal → Generating → Complete
 */
import {
  ArrowLeft,
  Barbell,
  CheckCircle,
  ChartPie,
  Fire,
  GenderFemale,
  GenderMale,
  PersonSimpleRun,
  Question,
  Sneaker,
  Target,
  type IconProps,
} from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SafeAreaWrapper, Text, WheelPicker } from '@/components';
import useCurrentUser from '@/hooks/useCurrentUser';
import {
  GeneratedGoals,
  generateGoals,
  GenerateGoalsRequest,
  GoalType,
  saveGoal,
  Sex,
} from '@/services/geminiApi';
import userApi from '@/services/userApi';
import { BRAND_COLORS, radii, spacing } from '@/utils';

import { GENERATED_GOALS_KEY } from './ProfileScreen';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TOTAL_STEPS = 6;
const isWeb = Platform.OS === 'web';

const MODERATE_T2D_NET_CARB_RISE_MGDL_PER_G = 4;
const MODERATE_T2D_PROTEIN_RISE_MGDL_PER_G = 0.5;
const ESTIMATED_FIBER_RATIO = 0.1;

const estimateBloodSugarRiseMgDl = (carbsG: number, proteinG: number): number => {
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
  const macros = goals.macros_grams || { protein_g: 0, carbs_g: 0, fat_g: 0, notes: '' };
  return {
    ...goals,
    macros_grams: {
      ...macros,
      blood_sugar_rise_mg_dl:
        macros.blood_sugar_rise_mg_dl ??
        estimateBloodSugarRiseMgDl(macros.carbs_g, macros.protein_g),
    },
  };
};

const mapGoalTypeToFitnessGoal = (goalType: GoalType): string => {
  switch (goalType) {
    case 'fat_loss': return 'LOSE_WEIGHT';
    case 'muscle_gain': return 'GAIN_MUSCLE';
    case 'diabetes_control': return 'MAINTAIN';
    default: return 'MAINTAIN';
  }
};

// ---------------------------------------------------------------------------
// Options data
// ---------------------------------------------------------------------------
const SEX_OPTIONS: Array<{ value: Sex; label: string; Icon: React.ComponentType<IconProps>; color: string }> = [
  { value: 'male', label: 'Male', Icon: GenderMale, color: '#60A5FA' },
  { value: 'female', label: 'Female', Icon: GenderFemale, color: '#F472B6' },
];

const GOAL_OPTIONS: Array<{
  value: GoalType;
  label: string;
  Icon: React.ComponentType<IconProps>;
  description: string;
  color: string;
}> = [
  { value: 'fat_loss', label: 'Fat Loss', Icon: Fire, description: 'Burn fat, keep muscle', color: '#EF4444' },
  { value: 'muscle_gain', label: 'Build Muscle', Icon: Barbell, description: 'Grow stronger', color: BRAND_COLORS.macros.protein },
  { value: 'diabetes_control', label: 'Nutrition Balance', Icon: Target, description: 'Maintain weight, improve nutrition quality', color: BRAND_COLORS.macros.carbs },
];

const SESSION_OPTIONS = [3, 4, 5, 6, 7] as const;

// WheelPicker data
const heightData = Array.from({ length: 81 }, (_, i) => {
  const v = 140 + i;
  return { value: v, label: `${v}` };
});
const weightData = Array.from({ length: 101 }, (_, i) => {
  const v = 40 + i;
  return { value: v, label: `${v}` };
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function ProgressDots({ current }: { current: number }) {
  return (
    <View style={progressStyles.row}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[progressStyles.dot, i === current ? progressStyles.dotActive : progressStyles.dotInactive]}
        />
      ))}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: '#111111' },
  dotInactive: { width: 6, backgroundColor: '#D4D4D4' },
});

function CTAButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        ctaStyles.button,
        disabled && ctaStyles.buttonDisabled,
        pressed && !disabled && ctaStyles.buttonPressed,
      ]}
    >
      <Text variant="body" weight="bold" style={disabled ? [ctaStyles.text, ctaStyles.textDisabled] : ctaStyles.text}>
        {label}
      </Text>
    </Pressable>
  );
}

const ctaStyles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: isWeb ? 400 : undefined,
    alignSelf: 'center',
  },
  buttonDisabled: { backgroundColor: '#D4D4D4' },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  text: { color: '#FFFFFF', fontSize: 17 },
  textDisabled: { color: '#9E9E9E' },
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const BuildPlanScreen = () => {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const insets = useSafeAreaInsets();

  // Wizard state
  const [step, setStep] = useState(0);
  const [selectedSex, setSelectedSex] = useState<Sex | null>(null);
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(70);
  const [weeklySessions, setWeeklySessions] = useState<number | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);
  const [generatedGoals, setGeneratedGoals] = useState<GeneratedGoals | null>(null);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return selectedSex !== null;
      case 1: return true; // height/weight always have defaults
      case 2: return weeklySessions !== null;
      case 3: return selectedGoal !== null;
      default: return false;
    }
  };

  const goBack = () => {
    if (step === 0 || step === 4) {
      navigation.goBack();
    } else if (step === 5) {
      // From complete, go to dashboard
      navigation.dispatch(
        CommonActions.navigate({ name: 'Main', params: { screen: 'Dashboard' } })
      );
    } else {
      setStep(step - 1);
    }
  };

  const goNext = () => {
    if (step < 3) {
      setStep(step + 1);
      if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    } else if (step === 3) {
      handleGenerate();
    }
  };

  // ---------------------------------------------------------------------------
  // Generate goals
  // ---------------------------------------------------------------------------
  const handleGenerate = async () => {
    if (!selectedSex || !selectedGoal || !userId) return;

    setStep(4); // generating
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const request: GenerateGoalsRequest = {
        sex: selectedSex,
        heightCm,
        weightKg,
        goalType: selectedGoal,
        age: 30,
        activityLevel: 'medium',
      };

      const goals = normalizeGoalMacros(await generateGoals(request));
      setGeneratedGoals(goals);

      // Persist to AsyncStorage
      await AsyncStorage.setItem(GENERATED_GOALS_KEY, JSON.stringify(goals));

      // Save to backend
      try {
        await saveGoal(userId, goals, {
          sex: selectedSex,
          heightCm,
          weightKg,
          age: 30,
          activityLevel: 'medium',
        });
      } catch {
        // Goals still in AsyncStorage — non-fatal
      }

      // Update user profile
      try {
        await userApi.upsertProfile({
          heightCm,
          weightKg,
          fitnessGoal: mapGoalTypeToFitnessGoal(selectedGoal),
          dailyCalorieTarget: goals.dailyCalories.target,
          dailyProteinTarget: goals.macros_grams.protein_g,
          dailyCarbsTarget: goals.macros_grams.carbs_g,
          dailyFatTarget: goals.macros_grams.fat_g,
        });
      } catch {
        // Non-fatal
      }

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['weekly-insights'] });
      queryClient.invalidateQueries({ queryKey: ['dailyNutrition'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['active-goal'] });

      setStep(5); // complete
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert('Error', 'Failed to generate goals. Please try again.');
      setStep(3);
    }
  };

  const handleDone = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    navigation.dispatch(
      CommonActions.navigate({ name: 'Main', params: { screen: 'Dashboard' } })
    );
  };

  // ---------------------------------------------------------------------------
  // Render helpers for each step
  // ---------------------------------------------------------------------------
  const renderSex = () => (
    <View style={styles.stepContent}>
      <View style={styles.headerSection}>
        <Text variant="hero" weight="bold" style={styles.heading}>
          About you
        </Text>
        <Text variant="body" color="#6B6B6B" style={styles.subtitle}>
          Let's personalise your plan
        </Text>
      </View>

      <View style={styles.sexRow}>
        {SEX_OPTIONS.map((option) => {
          const isSelected = selectedSex === option.value;
          return (
            <Pressable
              key={option.value}
              style={({ pressed }) => [
                styles.sexCard,
                isSelected && { backgroundColor: option.color },
                pressed && styles.cardPressed,
              ]}
              onPress={() => {
                setSelectedSex(option.value);
                if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
              }}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected }}
            >
              <option.Icon size={40} color={isSelected ? '#FFF' : option.color} />
              <Text
                variant="body"
                weight="semibold"
                style={isSelected ? styles.sexTextSelected : undefined}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderMeasurements = () => (
    <View style={styles.stepContent}>
      <View style={styles.headerSection}>
        <Text variant="hero" weight="bold" style={styles.heading}>
          Measurements
        </Text>
        <Text variant="body" color="#6B6B6B" style={styles.subtitle}>
          For accurate calorie and macro calculations
        </Text>
      </View>

      <View style={styles.wheelRow}>
        <WheelPicker
          data={heightData}
          selectedValue={heightCm}
          onValueChange={(v) => setHeightCm(v as number)}
          label="Height"
          unit="cm"
        />
        <WheelPicker
          data={weightData}
          selectedValue={weightKg}
          onValueChange={(v) => setWeightKg(v as number)}
          label="Weight"
          unit="kg"
        />
      </View>
    </View>
  );

  const renderWeeklyTime = () => (
    <View style={styles.stepContent}>
      <View style={styles.headerSection}>
        <Text variant="hero" weight="bold" style={styles.heading}>
          Weekly sessions
        </Text>
        <Text variant="body" color="#6B6B6B" style={styles.subtitle}>
          How many days a week can you train?
        </Text>
      </View>

      <View style={styles.chipRow}>
        {SESSION_OPTIONS.map((n) => {
          const isActive = weeklySessions === n;
          return (
            <Pressable
              key={n}
              onPress={() => {
                setWeeklySessions(n);
                if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
              }}
              style={[styles.sessionChip, isActive && styles.sessionChipActive]}
              accessibilityRole="button"
              accessibilityLabel={`${n} sessions per week`}
              accessibilityState={{ selected: isActive }}
            >
              <Text variant="heading3" weight="bold" color={isActive ? '#FFFFFF' : '#111111'}>
                {n}
              </Text>
              <Text variant="caption" weight="medium" color={isActive ? '#FFFFFF' : '#6B6B6B'}>
                days
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderGoal = () => (
    <View style={styles.stepContent}>
      <View style={styles.headerSection}>
        <Text variant="hero" weight="bold" style={styles.heading}>
          Your goal
        </Text>
        <Text variant="body" color="#6B6B6B" style={styles.subtitle}>
          We'll tailor macros and calories to match
        </Text>
      </View>

      <View style={styles.goalColumn}>
        {GOAL_OPTIONS.map((option) => {
          const isSelected = selectedGoal === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                setSelectedGoal(option.value);
                if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
              }}
              style={({ pressed }) => [
                styles.goalCard,
                isSelected && { borderColor: option.color, backgroundColor: `${option.color}15` },
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${option.label}: ${option.description}`}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={[styles.goalIconWrap, { backgroundColor: `${option.color}20` }]}>
                <option.Icon size={28} color={option.color} weight="fill" />
              </View>
              <View style={styles.goalText}>
                <Text variant="heading4" weight="bold">{option.label}</Text>
                <Text variant="caption" color="#6B6B6B">{option.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderGenerating = () => (
    <View style={styles.generatingWrap}>
      <LinearGradient
        colors={[BRAND_COLORS.primary + '20', BRAND_COLORS.secondary + '20']}
        style={styles.generatingGradient}
      >
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        <Text variant="heading3" weight="semibold" style={styles.generatingTitle}>
          Building your plan...
        </Text>
        <Text variant="body" color="#6B6B6B" style={styles.generatingSub}>
          We're turning your profile into a clear daily starting point
        </Text>
      </LinearGradient>
    </View>
  );

  const renderComplete = () => {
    if (!generatedGoals) return null;
    const goalLabel = GOAL_OPTIONS.find((g) => g.value === selectedGoal)?.label ?? '';
    return (
      <View style={styles.stepContent}>
        <View style={styles.successHeader}>
          <CheckCircle size={56} color="#10B981" weight="fill" />
          <Text variant="heading3" weight="bold" style={styles.successTitle}>
            Plan ready
          </Text>
        </View>

        {/* Daily Calories */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCardHeader}>
            <Fire size={22} color="#EF4444" weight="fill" />
            <Text variant="body" weight="semibold">Daily Calories</Text>
          </View>
          <Text variant="heading2" weight="bold" style={styles.summaryValue}>
            {generatedGoals.dailyCalories.target} kcal
          </Text>
          <Text variant="caption" style={styles.summaryRange}>
            Range: {generatedGoals.dailyCalories.min} – {generatedGoals.dailyCalories.max} kcal
          </Text>
        </View>

        {/* Macros */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCardHeader}>
            <ChartPie size={22} color={BRAND_COLORS.primary} />
            <Text variant="body" weight="semibold">Daily Macros</Text>
          </View>
          <View style={styles.macrosRow}>
            <View style={styles.macroItem}>
              <Text variant="heading3" weight="bold" style={{ color: BRAND_COLORS.macros.protein }}>
                {generatedGoals.macros_grams.protein_g}g
              </Text>
              <Text variant="caption">Protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text variant="heading3" weight="bold" style={{ color: BRAND_COLORS.macros.carbs }}>
                {generatedGoals.macros_grams.carbs_g}g
              </Text>
              <Text variant="caption">Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text variant="heading3" weight="bold" style={{ color: BRAND_COLORS.macros.fat }}>
                {generatedGoals.macros_grams.fat_g}g
              </Text>
              <Text variant="caption">Fat</Text>
            </View>
          </View>
        </View>

        {/* Weekly Plan */}
        {generatedGoals.weeklyActivityPlan && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Sneaker size={22} color={BRAND_COLORS.secondary} />
              <Text variant="body" weight="semibold">Weekly Activity</Text>
            </View>
            <Text variant="caption" style={styles.summaryRange}>
              {generatedGoals.weeklyActivityPlan.cardio_minutes_per_week} min cardio · {generatedGoals.weeklyActivityPlan.strength_sessions_per_week} strength sessions · {generatedGoals.weeklyActivityPlan.steps_per_day_target.toLocaleString()} steps/day
            </Text>
          </View>
        )}

        {/* Goal label */}
        <Text variant="caption" style={styles.goalLabel}>
          Goal: {goalLabel} · {weeklySessions} sessions/week
        </Text>

        {/* AI disclaimer */}
        <Text variant="caption" style={styles.disclaimer}>
          AI-generated — verify with a healthcare professional
        </Text>
      </View>
    );
  };

  // ---------------------------------------------------------------------------
  // Determine current step view
  // ---------------------------------------------------------------------------
  const stepViews = [renderSex, renderMeasurements, renderWeeklyTime, renderGoal, renderGenerating, renderComplete];

  return (
    <SafeAreaWrapper>
      <View style={[styles.root, { paddingTop: isWeb ? spacing.lg : insets.top }]}>
        {/* Top bar: back + dots + spacer */}
        <View style={styles.topBar}>
          <Pressable
            onPress={goBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color="#111111" />
          </Pressable>
          <ProgressDots current={step} />
          <View style={styles.topBarSpacer} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {stepViews[step]()}
        </ScrollView>

        {/* Bottom CTA */}
        {step <= 3 && (
          <View style={[styles.bottomBar, { paddingBottom: isWeb ? spacing.xl : Math.max(insets.bottom, spacing.lg) }]}>
            <CTAButton
              label={step === 3 ? 'Generate my plan' : 'Continue'}
              onPress={goNext}
              disabled={!canAdvance()}
            />
            {step === 0 && (
              <Pressable onPress={() => setStep(1)} style={styles.skipBtn}>
                <Text variant="body" weight="medium" color="#6B6B6B">Skip</Text>
              </Pressable>
            )}
          </View>
        )}
        {step === 5 && (
          <View style={[styles.bottomBar, { paddingBottom: isWeb ? spacing.xl : Math.max(insets.bottom, spacing.lg) }]}>
            <CTAButton label="View my dashboard" onPress={handleDone} />
          </View>
        )}
      </View>
    </SafeAreaWrapper>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isWeb ? spacing.xl * 2 : spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 120,
    maxWidth: isWeb ? 520 : undefined,
    alignSelf: isWeb ? 'center' : undefined,
    width: isWeb ? '100%' : undefined,
  },
  stepContent: {
    gap: spacing.xl,
  },
  headerSection: {
    gap: 8,
  },
  heading: {
    fontSize: 36,
    letterSpacing: -1,
    color: '#111111',
  },
  subtitle: {
    lineHeight: 22,
  },

  // Sex step
  sexRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sexCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: '#F5F5F5',
  },
  sexTextSelected: {
    color: '#FFFFFF',
  },

  // Measurements step
  wheelRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    justifyContent: 'center',
  },

  // Weekly sessions step
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  sessionChip: {
    width: 80,
    height: 80,
    borderRadius: radii.xl,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  sessionChipActive: {
    backgroundColor: '#111111',
  },

  // Goal step
  goalColumn: {
    gap: spacing.md,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: '#F5F5F5',
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalText: {
    flex: 1,
    gap: 4,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },

  // Generating step
  generatingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  generatingGradient: {
    width: '100%',
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 3,
    gap: spacing.lg,
  },
  generatingTitle: {
    color: BRAND_COLORS.textPrimary,
    textAlign: 'center',
  },
  generatingSub: {
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Complete step
  successHeader: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  successTitle: {
    textAlign: 'center',
    color: '#111111',
  },
  summaryCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryValue: {
    color: '#111111',
  },
  summaryRange: {
    color: BRAND_COLORS.textSecondary,
    lineHeight: 20,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
  },
  macroItem: {
    alignItems: 'center',
    gap: 4,
  },
  goalLabel: {
    textAlign: 'center',
    color: BRAND_COLORS.textMuted,
  },
  disclaimer: {
    textAlign: 'center',
    color: BRAND_COLORS.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: isWeb ? spacing.xl * 2 : spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
    maxWidth: isWeb ? 520 : undefined,
    alignSelf: isWeb ? 'center' : undefined,
    width: isWeb ? '100%' : undefined,
  },
  skipBtn: {
    paddingVertical: spacing.sm,
  },
});

export default BuildPlanScreen;
