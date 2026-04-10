/**
 * BuildPlanScreen — shorter, goal-first plan setup.
 *
 * Flow:
 * 1. Select one of the three goal tabs and confirm sex.
 * 2. Confirm height + weight.
 * 3. Generate.
 * 4. Review completed plan.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Barbell,
  CheckCircle,
  ChartPie,
  Fire,
  GenderFemale,
  GenderMale,
  Leaf,
  Question,
  type IconProps,
} from 'phosphor-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const TOTAL_STEPS = 4;
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

const mapFitnessGoalToGoalType = (fitnessGoal?: string | null): GoalType | null => {
  switch ((fitnessGoal || '').toUpperCase()) {
    case 'LOSE_WEIGHT':
      return 'fat_loss';
    case 'GAIN_MUSCLE':
      return 'muscle_gain';
    case 'MAINTAIN':
      return 'diabetes_control';
    default:
      return null;
  }
};

const isGoalType = (value: unknown): value is GoalType =>
  value === 'fat_loss' || value === 'muscle_gain' || value === 'diabetes_control';

const SEX_OPTIONS: Array<{
  value: Sex;
  label: string;
  Icon: React.ComponentType<IconProps>;
  color: string;
  tint: string;
}> = [
  { value: 'male', label: 'Male', Icon: GenderMale, color: '#3B82F6', tint: '#E8F2FF' },
  { value: 'female', label: 'Female', Icon: GenderFemale, color: '#EC4899', tint: '#FDE7F3' },
  { value: 'prefer_not_to_say', label: 'Skip', Icon: Question, color: '#8B5CF6', tint: '#F2EBFF' },
];

const GOAL_OPTIONS: Array<{
  value: GoalType;
  label: string;
  description: string;
  focus: string;
  cadence: string;
  outcome: string;
  targetHint: string;
  Icon: React.ComponentType<IconProps>;
  color: string;
  tint: string;
}> = [
  {
    value: 'fat_loss',
    label: 'Fat Loss',
    description: 'Lean down with a steady calorie deficit and high protein.',
    focus: 'Protein-first meals',
    cadence: '3 lifts + recovery cardio',
    outcome: 'Sustainable fat loss',
    targetHint: 'Deficit-led calorie target',
    Icon: Fire,
    color: '#E05E3F',
    tint: '#FFF1EA',
  },
  {
    value: 'muscle_gain',
    label: 'Build Muscle',
    description: 'Support strength progress with more food, more recovery, and more protein.',
    focus: 'Strength + recovery',
    cadence: '4 focused training days',
    outcome: 'Stronger and fuller',
    targetHint: 'Surplus-led calorie target',
    Icon: Barbell,
    color: '#0F9D82',
    tint: '#E5F7F2',
  },
  {
    value: 'diabetes_control',
    label: 'Nutrition Balance',
    description: 'Keep meals steady, fibre higher, and energy more consistent across the week.',
    focus: 'Balanced carbs + fibre',
    cadence: 'Daily walks + light strength',
    outcome: 'More even energy',
    targetHint: 'Balanced macro target',
    Icon: Leaf,
    color: '#889B3F',
    tint: '#F3F7E3',
  },
];

const heightData = Array.from({ length: 81 }, (_, i) => {
  const v = 140 + i;
  return { value: v, label: `${v}` };
});

const weightData = Array.from({ length: 101 }, (_, i) => {
  const v = 40 + i;
  return { value: v, label: `${v}` };
});

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
  dotActive: { width: 28, backgroundColor: '#111111' },
  dotInactive: { width: 8, backgroundColor: '#D8D2C8' },
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
    minHeight: 58,
    borderRadius: radii.xl,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: isWeb ? 920 : undefined,
    alignSelf: 'center',
  },
  buttonDisabled: { backgroundColor: '#D8D2C8' },
  buttonPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  text: { color: '#FFFFFF', fontSize: 17 },
  textDisabled: { color: '#8C857B' },
});

function GoalTabs({
  selectedGoal,
  onSelect,
  compact = false,
}: {
  selectedGoal: GoalType | null;
  onSelect: (goal: GoalType) => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.goalTabsWrap, compact && styles.goalTabsWrapCompact]}>
      {GOAL_OPTIONS.map((option) => {
        const isSelected = selectedGoal === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [
              styles.goalTab,
              compact && styles.goalTabCompact,
              { backgroundColor: isSelected ? option.tint : '#FFFFFF', borderColor: isSelected ? option.color : 'rgba(17,17,17,0.08)' },
              pressed && styles.goalTabPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${option.label}: ${option.description}`}
            accessibilityState={{ selected: isSelected }}
          >
            <View style={[styles.goalTabIconWrap, { backgroundColor: isSelected ? `${option.color}16` : '#F5F1EB' }]}>
              <option.Icon size={compact ? 18 : 22} color={option.color} weight={isSelected ? 'fill' : 'regular'} />
            </View>
            <View style={styles.goalTabCopy}>
              <Text variant="body" weight="bold" style={styles.goalTabTitle}>
                {option.label}
              </Text>
              {!compact && (
                <Text variant="caption" style={styles.goalTabBody}>
                  {option.description}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryStat}>
      <Text variant="caption" weight="semibold" style={styles.summaryStatLabel}>
        {label}
      </Text>
      <Text variant="body" weight="bold" style={styles.summaryStatValue}>
        {value}
      </Text>
    </View>
  );
}

export const BuildPlanScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const insets = useSafeAreaInsets();
  const initialGoal = isGoalType(route.params?.initialGoal) ? route.params.initialGoal : null;
  const hasPrefilled = useRef(false);

  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(initialGoal);
  const [selectedSex, setSelectedSex] = useState<Sex | null>(null);
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(70);
  const [generatedGoals, setGeneratedGoals] = useState<GeneratedGoals | null>(null);

  useEffect(() => {
    if (initialGoal) {
      setSelectedGoal(initialGoal);
    }
  }, [initialGoal]);

  useEffect(() => {
    if (hasPrefilled.current) return;
    const profile = currentUser.data?.profile;
    if (!profile) return;

    if (typeof profile.heightCm === 'number') {
      setHeightCm(Math.round(profile.heightCm));
    }
    if (typeof profile.weightKg === 'number') {
      setWeightKg(Math.round(profile.weightKg));
    }
    if (!selectedGoal) {
      const profileGoal = mapFitnessGoalToGoalType(profile.fitnessGoal);
      if (profileGoal) {
        setSelectedGoal(profileGoal);
      }
    }

    hasPrefilled.current = true;
  }, [currentUser.data?.profile, selectedGoal]);

  const selectedGoalConfig = useMemo(
    () => GOAL_OPTIONS.find((option) => option.value === selectedGoal) ?? null,
    [selectedGoal]
  );

  const canAdvance = (): boolean => {
    switch (step) {
      case 0:
        return selectedGoal !== null && selectedSex !== null;
      case 1:
        return true;
      default:
        return false;
    }
  };

  const goBack = () => {
    if (step === 0 || step === 2) {
      navigation.goBack();
      return;
    }

    if (step === 3) {
      navigation.dispatch(
        CommonActions.navigate({ name: 'Main', params: { screen: 'Dashboard' } })
      );
      return;
    }

    setStep((current) => Math.max(0, current - 1));
  };

  const goNext = () => {
    if (step === 0) {
      setStep(1);
      if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
      return;
    }

    if (step === 1) {
      handleGenerate();
    }
  };

  const handleGenerate = async () => {
    if (!selectedSex || !selectedGoal || !userId) return;

    setStep(2);
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

      await AsyncStorage.setItem(GENERATED_GOALS_KEY, JSON.stringify(goals));

      try {
        await saveGoal(userId, goals, {
          sex: selectedSex,
          heightCm,
          weightKg,
          age: 30,
          activityLevel: 'medium',
        });
      } catch {
        // Goals remain cached locally. Treat as non-fatal.
      }

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
        // Profile sync is non-fatal for the build flow.
      }

      queryClient.invalidateQueries({ queryKey: ['weekly-insights'] });
      queryClient.invalidateQueries({ queryKey: ['dailyNutrition'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['active-goal'] });

      setStep(3);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      Alert.alert('Error', 'Failed to generate goals. Please try again.');
      setStep(1);
    }
  };

  const handleDone = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    navigation.dispatch(
      CommonActions.navigate({ name: 'Main', params: { screen: 'Dashboard' } })
    );
  };

  const renderGoalAndSexStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.headerSection}>
        <View style={styles.kicker}>
          <Text variant="label" weight="bold" style={styles.kickerText}>
            Weekly planner
          </Text>
        </View>
        <Text variant="hero" weight="bold" style={styles.heading}>
          Pick a plan, then confirm the essentials
        </Text>
        <Text variant="body" style={styles.subtitle}>
          Choose one of the three goal tabs. After this step, you only need to confirm sex, height, and weight.
        </Text>
      </View>

      <GoalTabs selectedGoal={selectedGoal} onSelect={setSelectedGoal} />

      {selectedGoalConfig && (
        <View style={[styles.goalInsightCard, { backgroundColor: selectedGoalConfig.tint }]}>
          <View style={[styles.goalInsightIcon, { backgroundColor: `${selectedGoalConfig.color}18` }]}>
            <selectedGoalConfig.Icon size={24} weight="fill" color={selectedGoalConfig.color} />
          </View>
          <View style={styles.goalInsightCopy}>
            <Text variant="heading3" weight="bold" style={styles.goalInsightTitle}>
              {selectedGoalConfig.label}
            </Text>
            <Text variant="body" style={styles.goalInsightBody}>
              {selectedGoalConfig.description}
            </Text>
          </View>
          <View style={styles.goalInsightStats}>
            <SummaryStat label="Focus" value={selectedGoalConfig.focus} />
            <SummaryStat label="Cadence" value={selectedGoalConfig.cadence} />
            <SummaryStat label="Output" value={selectedGoalConfig.outcome} />
          </View>
        </View>
      )}

      <View style={styles.sectionCard}>
        <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
          Confirm sex
        </Text>
        <Text variant="body" style={styles.sectionBody}>
          We use this for calorie and macro estimation. You can skip if you prefer.
        </Text>

        <View style={styles.sexGrid}>
          {SEX_OPTIONS.map((option) => {
            const isSelected = selectedSex === option.value;
            return (
              <Pressable
                key={option.value}
                style={({ pressed }) => [
                  styles.sexCard,
                  { backgroundColor: isSelected ? option.tint : '#FFFFFF', borderColor: isSelected ? option.color : 'rgba(17,17,17,0.08)' },
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
                <View style={[styles.sexIconWrap, { backgroundColor: `${option.color}16` }]}>
                  <option.Icon size={26} color={option.color} weight={isSelected ? 'fill' : 'regular'} />
                </View>
                <Text
                  variant="body"
                  weight="semibold"
                  style={styles.sexLabel}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  const renderMeasurementsStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.headerSection}>
        <View style={styles.kicker}>
          <Text variant="label" weight="bold" style={styles.kickerText}>
            Personal inputs
          </Text>
        </View>
        <Text variant="hero" weight="bold" style={styles.heading}>
          Confirm height and weight
        </Text>
        <Text variant="body" style={styles.subtitle}>
          These numbers set your calorie range and macro targets. You can edit them later from Manage account.
        </Text>
      </View>

      <GoalTabs selectedGoal={selectedGoal} onSelect={setSelectedGoal} compact />

      {selectedGoalConfig && (
        <View style={styles.summaryRow}>
          <SummaryStat label="Goal" value={selectedGoalConfig.label} />
          <SummaryStat label="Style" value={selectedGoalConfig.targetHint} />
          <SummaryStat label="Result" value={selectedGoalConfig.outcome} />
        </View>
      )}

      <View style={styles.sectionCard}>
        <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
          Your measurements
        </Text>
        <Text variant="body" style={styles.sectionBody}>
          Pre-filled from your profile when available.
        </Text>

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
    </View>
  );

  const renderGenerating = () => (
    <View style={styles.generatingFull}>
      <View style={styles.generatingContent}>
        <View style={styles.generatingIconRing}>
          <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        </View>
        <Text variant="heading2" weight="bold" style={styles.generatingTitle}>
          Building your plan
        </Text>
        <Text variant="body" style={styles.generatingSub}>
          Analyzing your goal, body metrics, and activity level to create a personalized weekly plan.
        </Text>
        <View style={styles.generatingSteps}>
          <View style={styles.generatingStepRow}>
            <View style={[styles.generatingDot, { backgroundColor: '#10B981' }]} />
            <Text variant="caption" weight="medium" style={styles.generatingStepText}>Calculating calorie targets</Text>
          </View>
          <View style={styles.generatingStepRow}>
            <View style={[styles.generatingDot, { backgroundColor: BRAND_COLORS.primary }]} />
            <Text variant="caption" weight="medium" style={styles.generatingStepText}>Optimizing macro ratios</Text>
          </View>
          <View style={styles.generatingStepRow}>
            <View style={[styles.generatingDot, { backgroundColor: '#3B82F6' }]} />
            <Text variant="caption" weight="medium" style={styles.generatingStepText}>Setting activity rhythm</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderComplete = () => {
    if (!generatedGoals || !selectedGoalConfig) return null;

    return (
      <View style={styles.stepContent}>
        <View style={styles.successHeader}>
          <View style={styles.successIconRing}>
            <CheckCircle size={48} color="#FFFFFF" weight="fill" />
          </View>
          <Text variant="heading1" weight="bold" style={styles.successTitle}>
            Your plan is ready
          </Text>
          <Text variant="body" style={styles.successBody}>
            {selectedGoalConfig.label} is now set as the active direction for your calorie and macro targets.
          </Text>
        </View>

        <View style={styles.completeGrid}>
          <View style={[styles.summaryCard, { backgroundColor: '#FFF5F5' }]}>
            <View style={styles.summaryCardHeader}>
              <Fire size={22} color="#EF4444" weight="fill" />
              <Text variant="body" weight="bold" style={{ color: '#111' }}>Daily Calories</Text>
            </View>
            <Text variant="heading1" weight="bold" style={{ color: '#111' }}>
              {generatedGoals.dailyCalories.target} kcal
            </Text>
            <Text variant="caption" weight="medium" style={{ color: '#6B7280' }}>
              Range: {generatedGoals.dailyCalories.min} - {generatedGoals.dailyCalories.max} kcal
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: '#F0FDF4' }]}>
            <View style={styles.summaryCardHeader}>
              <ChartPie size={22} color={BRAND_COLORS.primary} />
              <Text variant="body" weight="bold" style={{ color: '#111' }}>Daily Macros</Text>
            </View>
            <View style={styles.macrosRow}>
              <View style={styles.macroItem}>
                <Text variant="heading2" weight="bold" style={{ color: BRAND_COLORS.macros.protein }}>
                  {generatedGoals.macros_grams.protein_g}g
                </Text>
                <Text variant="caption" weight="medium" style={{ color: '#111' }}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text variant="heading2" weight="bold" style={{ color: BRAND_COLORS.macros.carbs }}>
                  {generatedGoals.macros_grams.carbs_g}g
                </Text>
                <Text variant="caption" weight="medium" style={{ color: '#111' }}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text variant="heading2" weight="bold" style={{ color: BRAND_COLORS.macros.fat }}>
                  {generatedGoals.macros_grams.fat_g}g
                </Text>
                <Text variant="caption" weight="medium" style={{ color: '#111' }}>Fat</Text>
              </View>
            </View>
          </View>
        </View>

        {generatedGoals.weeklyActivityPlan && (
          <View style={[styles.summaryCard, { backgroundColor: '#EFF6FF' }]}>
            <View style={styles.summaryCardHeader}>
              <Barbell size={22} color="#3B82F6" />
              <Text variant="body" weight="bold" style={{ color: '#111' }}>Weekly Rhythm</Text>
            </View>
            <Text variant="body" weight="medium" style={{ color: '#374151' }}>
              {generatedGoals.weeklyActivityPlan.strength_sessions_per_week}
              {'\u00A0strength sessions  ·  '}
              {generatedGoals.weeklyActivityPlan.cardio_minutes_per_week}
              {'\u00A0min cardio  ·  '}
              {generatedGoals.weeklyActivityPlan.steps_per_day_target.toLocaleString()}
              {'\u00A0steps/day'}
            </Text>
          </View>
        )}

        <Text variant="caption" weight="medium" style={styles.goalLabel}>
          Goal: {selectedGoalConfig.label}
        </Text>
        <Text variant="caption" style={styles.disclaimer}>
          AI-generated — for reference only, adapt to your own situation
        </Text>
      </View>
    );
  };

  const stepViews = [renderGoalAndSexStep, renderMeasurementsStep, renderGenerating, renderComplete];
  const currentDot = Math.min(step, TOTAL_STEPS - 1);

  return (
    <SafeAreaWrapper>
      <View style={[styles.root, { paddingTop: isWeb ? spacing.lg : insets.top }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={goBack}
            disabled={step === 2}
            style={({ pressed }) => [
              styles.backBtn,
              step === 2 && styles.backBtnDisabled,
              pressed && step !== 2 && styles.backBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color="#111111" />
          </Pressable>
          <ProgressDots current={currentDot} />
          <View style={styles.topBarSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {stepViews[step]()}
        </ScrollView>

        {step <= 1 && (
          <View style={[styles.bottomBar, { paddingBottom: isWeb ? spacing.xl : Math.max(insets.bottom, spacing.lg) }]}>
            <CTAButton
              label={step === 1 ? 'Build my plan' : 'Continue'}
              onPress={goNext}
              disabled={!canAdvance()}
            />
          </View>
        )}

        {step === 3 && (
          <View style={[styles.bottomBar, { paddingBottom: isWeb ? spacing.xl : Math.max(insets.bottom, spacing.lg) }]}>
            <CTAButton label="View my dashboard" onPress={handleDone} />
          </View>
        )}
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFDF8',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#F4EFE7',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  backBtnPressed: {
    opacity: 0.82,
  },
  backBtnDisabled: {
    opacity: 0.3,
  },
  topBarSpacer: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isWeb ? spacing['2xl'] : spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 128,
    maxWidth: isWeb ? 980 : undefined,
    alignSelf: isWeb ? 'center' : undefined,
    width: isWeb ? '100%' : undefined,
  },
  stepContent: {
    gap: spacing.xl,
  },
  headerSection: {
    gap: 10,
  },
  kicker: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF1D7',
  },
  kickerText: {
    color: BRAND_COLORS.primaryDark,
  },
  heading: {
    fontSize: isWeb ? 52 : 38,
    lineHeight: isWeb ? 56 : 44,
    letterSpacing: isWeb ? -2.1 : -1.4,
    color: '#111111',
  },
  subtitle: {
    color: '#3E3C38',
    lineHeight: 26,
    fontSize: 16,
    maxWidth: 720,
  },
  goalTabsWrap: {
    gap: spacing.md,
    ...(Platform.OS === 'web'
      ? {
          flexDirection: 'row',
          alignItems: 'stretch',
        }
      : {}),
  },
  goalTabsWrapCompact: {
    gap: spacing.sm,
  },
  goalTab: {
    flex: 1,
    minHeight: 132,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1.5,
    gap: spacing.md,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
      boxShadow: '0 10px 24px rgba(17,17,17,0.04)',
    }),
  },
  goalTabCompact: {
    minHeight: 92,
    padding: spacing.md,
    gap: spacing.sm,
  },
  goalTabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  goalTabIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTabCopy: {
    gap: 4,
    flex: 1,
  },
  goalTabTitle: {
    color: '#111111',
  },
  goalTabBody: {
    color: '#4F4B45',
    lineHeight: 20,
  },
  goalInsightCard: {
    borderRadius: 28,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    gap: spacing.lg,
  },
  goalInsightIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInsightCopy: {
    gap: 8,
  },
  goalInsightTitle: {
    color: '#111111',
  },
  goalInsightBody: {
    color: '#3E3C38',
    lineHeight: 24,
    maxWidth: 760,
  },
  goalInsightStats: {
    gap: spacing.md,
    ...(Platform.OS === 'web'
      ? {
          flexDirection: 'row',
          alignItems: 'stretch',
        }
      : {}),
  },
  summaryRow: {
    gap: spacing.md,
    ...(Platform.OS === 'web'
      ? {
          flexDirection: 'row',
          alignItems: 'stretch',
        }
      : {}),
  },
  summaryStat: {
    flex: 1,
    minHeight: 90,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 6,
  },
  summaryStatLabel: {
    color: '#6D6860',
  },
  summaryStatValue: {
    color: '#111111',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    gap: spacing.lg,
  },
  sectionTitle: {
    color: '#111111',
  },
  sectionBody: {
    color: '#4F4B45',
    lineHeight: 24,
  },
  sexGrid: {
    gap: spacing.md,
    ...(Platform.OS === 'web'
      ? {
          flexDirection: 'row',
          alignItems: 'stretch',
        }
      : {}),
  },
  sexCard: {
    flex: 1,
    minHeight: 118,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    borderRadius: 24,
    borderWidth: 1.5,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  sexIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexLabel: {
    color: '#111111',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  wheelRow: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: isWeb ? 80 : spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingFull: {
    flex: 1,
    minHeight: 500,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
  },
  generatingContent: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  generatingIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F6F4EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  generatingTitle: {
    color: '#111111',
    textAlign: 'center',
  },
  generatingSub: {
    textAlign: 'center',
    color: '#374151',
    maxWidth: 420,
    lineHeight: 24,
  },
  generatingSteps: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  generatingStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  generatingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  generatingStepText: {
    color: '#374151',
  },
  successHeader: {
    alignItems: 'center',
    gap: spacing.md,
  },
  successIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  successTitle: {
    color: '#111111',
    textAlign: 'center',
  },
  successBody: {
    color: '#374151',
    textAlign: 'center',
    maxWidth: 560,
    lineHeight: 24,
  },
  completeGrid: {
    gap: spacing.lg,
    ...(Platform.OS === 'web'
      ? {
          flexDirection: 'row',
          alignItems: 'stretch',
        }
      : {}),
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
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
    color: '#6D6860',
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
    color: '#6D6860',
  },
  disclaimer: {
    textAlign: 'center',
    color: '#6D6860',
    lineHeight: 18,
  },
  bottomBar: {
    paddingHorizontal: isWeb ? spacing['2xl'] : spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
    maxWidth: isWeb ? 980 : undefined,
    alignSelf: isWeb ? 'center' : undefined,
    width: isWeb ? '100%' : undefined,
    backgroundColor: '#FFFDF8',
  },
});

export default BuildPlanScreen;
