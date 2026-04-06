import { ArrowLeft } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';

import { Text } from '@/components';
import { BRAND_COLORS, radii, spacing } from '@/utils';

// ---------------------------------------------------------------------------
// Illustrations
// ---------------------------------------------------------------------------
const illustrationMuscle = require('@/../assets/illustrations/fitness-tracker.svg');
const illustrationFatLoss = require('@/../assets/illustrations/healthy-habit.svg');
const illustrationHealth = require('@/../assets/illustrations/hero-healthy-eating.svg');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type GoalType = 'build_muscle' | 'fat_loss' | 'general_health';
type ActivityLevel = 'sedentary' | 'lightly_active' | 'active' | 'very_active';

interface GoalOption {
  key: GoalType;
  title: string;
  description: string;
  illustration: any;
}

interface DietaryOption {
  key: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const GOAL_OPTIONS: GoalOption[] = [
  {
    key: 'build_muscle',
    title: 'Build Muscle',
    description: 'Gain lean mass with higher calories and protein focus',
    illustration: illustrationMuscle,
  },
  {
    key: 'fat_loss',
    title: 'Fat Loss',
    description: 'Reduce body fat with a calorie deficit and balanced macros',
    illustration: illustrationFatLoss,
  },
  {
    key: 'general_health',
    title: 'General Health',
    description: 'Maintain weight and improve nutrition quality',
    illustration: illustrationHealth,
  },
];

const ACTIVITY_LEVELS: { key: ActivityLevel; label: string }[] = [
  { key: 'sedentary', label: 'Sedentary' },
  { key: 'lightly_active', label: 'Lightly Active' },
  { key: 'active', label: 'Active' },
  { key: 'very_active', label: 'Very Active' },
];

const DIETARY_OPTIONS: DietaryOption[] = [
  { key: 'none', label: 'No restrictions' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'gluten_free', label: 'Gluten-free' },
  { key: 'dairy_free', label: 'Dairy-free' },
  { key: 'keto', label: 'Keto' },
  { key: 'low_carb', label: 'Low carb' },
  { key: 'high_protein', label: 'High protein' },
];

const STORAGE_KEY_ONBOARDING = '@aura_onboarding';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isWeb = Platform.OS === 'web';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Progress dots at the top of the screen. */
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={progressStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            progressStyles.dot,
            i === current ? progressStyles.dotActive : progressStyles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#111111',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#D4D4D4',
  },
});

/** Full-width black CTA button (Uber style). */
function CTAButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
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
      <Text
        variant="body"
        weight="bold"
        style={[ctaStyles.text, disabled && ctaStyles.textDisabled]}
      >
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
  buttonDisabled: {
    backgroundColor: '#D4D4D4',
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  text: {
    color: '#FFFFFF',
    fontSize: 17,
  },
  textDisabled: {
    color: '#9E9E9E',
  },
});

// ---------------------------------------------------------------------------
// Step 1 — Goal selection
// ---------------------------------------------------------------------------
function StepGoal({
  selected,
  onSelect,
}: {
  selected: GoalType | null;
  onSelect: (goal: GoalType) => void;
}) {
  return (
    <View style={stepStyles.content}>
      <View style={stepStyles.headerSection}>
        <Text variant="hero" weight="bold" style={stepStyles.heading}>
          What's your goal?
        </Text>
        <Text variant="body" color="#6B6B6B" style={stepStyles.subtitle}>
          We'll personalize your nutrition plan based on this
        </Text>
      </View>

      <View style={stepStyles.cardsColumn}>
        {GOAL_OPTIONS.map((option) => {
          const isSelected = selected === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => onSelect(option.key)}
              style={({ pressed }) => [
                goalStyles.card,
                isSelected && goalStyles.cardSelected,
                pressed && goalStyles.cardPressed,
              ]}
            >
              <Image
                source={option.illustration}
                style={goalStyles.illustration}
                contentFit="contain"
              />
              <View style={goalStyles.textSection}>
                <Text
                  variant="heading4"
                  weight="bold"
                  style={isSelected ? goalStyles.titleSelected : undefined}
                >
                  {option.title}
                </Text>
                <Text variant="caption" color="#6B6B6B" style={goalStyles.description}>
                  {option.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const goalStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: '#F5F5F5',
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#111111',
    backgroundColor: '#FAFAFA',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  illustration: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
  },
  textSection: {
    flex: 1,
    gap: 4,
  },
  titleSelected: {
    color: '#111111',
  },
  description: {
    lineHeight: 18,
  },
});

// ---------------------------------------------------------------------------
// Step 2 — About you (body metrics)
// ---------------------------------------------------------------------------
function StepAboutYou({
  age,
  weight,
  height,
  activityLevel,
  onAgeChange,
  onWeightChange,
  onHeightChange,
  onActivityChange,
}: {
  age: string;
  weight: string;
  height: string;
  activityLevel: ActivityLevel | null;
  onAgeChange: (v: string) => void;
  onWeightChange: (v: string) => void;
  onHeightChange: (v: string) => void;
  onActivityChange: (v: ActivityLevel) => void;
}) {
  return (
    <View style={stepStyles.content}>
      <View style={stepStyles.headerSection}>
        <Text variant="hero" weight="bold" style={stepStyles.heading}>
          About you
        </Text>
        <Text variant="body" color="#6B6B6B" style={stepStyles.subtitle}>
          This helps us calculate your ideal daily intake
        </Text>
      </View>

      <View style={aboutStyles.fieldsColumn}>
        {/* Age */}
        <View style={aboutStyles.field}>
          <Text variant="caption" weight="medium" color="#6B6B6B" style={aboutStyles.fieldLabel}>
            Age
          </Text>
          <TextInput
            style={aboutStyles.input}
            value={age}
            onChangeText={(t) => onAgeChange(t.replace(/[^0-9]/g, ''))}
            placeholder="25"
            placeholderTextColor="#BDBDBD"
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>

        {/* Weight */}
        <View style={aboutStyles.field}>
          <Text variant="caption" weight="medium" color="#6B6B6B" style={aboutStyles.fieldLabel}>
            Weight
          </Text>
          <View style={aboutStyles.inputWithSuffix}>
            <TextInput
              style={[aboutStyles.input, aboutStyles.inputFlex]}
              value={weight}
              onChangeText={(t) => onWeightChange(t.replace(/[^0-9.]/g, ''))}
              placeholder="70"
              placeholderTextColor="#BDBDBD"
              keyboardType="decimal-pad"
              maxLength={6}
            />
            <Text variant="body" weight="medium" color="#9E9E9E">
              kg
            </Text>
          </View>
        </View>

        {/* Height */}
        <View style={aboutStyles.field}>
          <Text variant="caption" weight="medium" color="#6B6B6B" style={aboutStyles.fieldLabel}>
            Height
          </Text>
          <View style={aboutStyles.inputWithSuffix}>
            <TextInput
              style={[aboutStyles.input, aboutStyles.inputFlex]}
              value={height}
              onChangeText={(t) => onHeightChange(t.replace(/[^0-9.]/g, ''))}
              placeholder="175"
              placeholderTextColor="#BDBDBD"
              keyboardType="decimal-pad"
              maxLength={6}
            />
            <Text variant="body" weight="medium" color="#9E9E9E">
              cm
            </Text>
          </View>
        </View>

        {/* Activity level */}
        <View style={aboutStyles.field}>
          <Text variant="caption" weight="medium" color="#6B6B6B" style={aboutStyles.fieldLabel}>
            Activity level
          </Text>
          <View style={aboutStyles.activityRow}>
            {ACTIVITY_LEVELS.map((level) => {
              const isActive = activityLevel === level.key;
              return (
                <Pressable
                  key={level.key}
                  onPress={() => onActivityChange(level.key)}
                  style={[
                    aboutStyles.activityChip,
                    isActive && aboutStyles.activityChipActive,
                  ]}
                >
                  <Text
                    variant="caption"
                    weight={isActive ? 'bold' : 'medium'}
                    color={isActive ? '#FFFFFF' : '#6B6B6B'}
                  >
                    {level.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const aboutStyles = StyleSheet.create({
  fieldsColumn: {
    gap: spacing.xl,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: radii.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
    color: '#111111',
    fontWeight: '500',
  },
  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: radii.md,
    paddingRight: spacing.lg,
  },
  inputFlex: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  activityChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: '#F5F5F5',
  },
  activityChipActive: {
    backgroundColor: '#111111',
  },
});

// ---------------------------------------------------------------------------
// Step 3 — Dietary preferences (multi-select pills)
// ---------------------------------------------------------------------------
function StepDietary({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <View style={stepStyles.content}>
      <View style={stepStyles.headerSection}>
        <Text variant="hero" weight="bold" style={stepStyles.heading}>
          Dietary preferences
        </Text>
        <Text variant="body" color="#6B6B6B" style={stepStyles.subtitle}>
          Select all that apply — we'll tailor meal suggestions
        </Text>
      </View>

      <View style={dietaryStyles.pillGrid}>
        {DIETARY_OPTIONS.map((option) => {
          const isActive = selected.has(option.key);
          return (
            <Pressable
              key={option.key}
              onPress={() => onToggle(option.key)}
              style={[
                dietaryStyles.pill,
                isActive && dietaryStyles.pillActive,
              ]}
            >
              <Text
                variant="body"
                weight={isActive ? 'bold' : 'medium'}
                color={isActive ? '#FFFFFF' : '#3E3E3E'}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const dietaryStyles = StyleSheet.create({
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radii.pill,
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
});

// ---------------------------------------------------------------------------
// Shared step styles
// ---------------------------------------------------------------------------
const stepStyles = StyleSheet.create({
  content: {
    flex: 1,
    gap: spacing['2xl'],
  },
  headerSection: {
    gap: spacing.sm,
  },
  heading: {
    fontSize: isWeb ? 42 : 36,
    lineHeight: isWeb ? 48 : 42,
    letterSpacing: -1,
    color: '#111111',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  cardsColumn: {
    gap: spacing.md,
  },
});

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // Step tracking (0-indexed)
  const [step, setStep] = useState(0);
  const TOTAL_STEPS = 3;

  // Step 1 state
  const [goal, setGoal] = useState<GoalType | null>(null);

  // Step 2 state
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);

  // Step 3 state
  const [dietaryPrefs, setDietaryPrefs] = useState<Set<string>>(new Set());

  // ---- Validation ----
  const isStepValid = (): boolean => {
    switch (step) {
      case 0:
        return goal !== null;
      case 1:
        return age.length > 0 && weight.length > 0 && height.length > 0 && activityLevel !== null;
      case 2:
        return true; // dietary is optional
      default:
        return false;
    }
  };

  // ---- Navigation helpers ----
  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const goBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    // Persist onboarding data to AsyncStorage
    const data = {
      goal,
      age: age ? parseInt(age, 10) : null,
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      activityLevel,
      dietaryPreferences: Array.from(dietaryPrefs),
      completedAt: new Date().toISOString(),
    };

    try {
      await AsyncStorage.setItem(STORAGE_KEY_ONBOARDING, JSON.stringify(data));
    } catch {
      // Non-blocking — continue even if storage fails
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  // ---- Dietary toggle logic ----
  const handleDietaryToggle = (key: string) => {
    setDietaryPrefs((prev) => {
      const next = new Set(prev);

      if (key === 'none') {
        // "No restrictions" clears everything else
        if (next.has('none')) {
          next.delete('none');
        } else {
          next.clear();
          next.add('none');
        }
      } else {
        // Any other option deselects "No restrictions"
        next.delete('none');
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
      }

      return next;
    });
  };

  // ---- Render the current step ----
  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepGoal selected={goal} onSelect={setGoal} />;
      case 1:
        return (
          <StepAboutYou
            age={age}
            weight={weight}
            height={height}
            activityLevel={activityLevel}
            onAgeChange={setAge}
            onWeightChange={setWeight}
            onHeightChange={setHeight}
            onActivityChange={setActivityLevel}
          />
        );
      case 2:
        return <StepDietary selected={dietaryPrefs} onToggle={handleDietaryToggle} />;
      default:
        return null;
    }
  };

  return (
    <View style={screenStyles.root}>
      <ScrollView
        contentContainerStyle={[
          screenStyles.scrollContent,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing['2xl'],
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar: back arrow + progress dots */}
        <View style={screenStyles.topBar}>
          {step > 0 ? (
            <Pressable onPress={goBack} hitSlop={12} style={screenStyles.backButton}>
              <ArrowLeft size={24} color="#111111" weight="bold" />
            </Pressable>
          ) : (
            <View style={screenStyles.backPlaceholder} />
          )}
          <ProgressDots current={step} total={TOTAL_STEPS} />
          <View style={screenStyles.backPlaceholder} />
        </View>

        {/* Step content */}
        <View style={screenStyles.stepContainer}>
          {renderStep()}
        </View>

        {/* Bottom actions */}
        <View style={screenStyles.bottomActions}>
          <CTAButton
            label={step === TOTAL_STEPS - 1 ? 'Get Started' : 'Continue'}
            onPress={goNext}
            disabled={!isStepValid()}
          />
          <Pressable onPress={handleSkip} hitSlop={8}>
            <Text variant="body" weight="medium" color="#9E9E9E" style={screenStyles.skipText}>
              Skip
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const screenStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: isWeb ? spacing['2xl'] : spacing.xl,
    maxWidth: isWeb ? 520 : undefined,
    alignSelf: isWeb ? 'center' : undefined,
    width: isWeb ? '100%' : undefined,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing['2xl'],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 40,
  },
  stepContainer: {
    flex: 1,
  },
  bottomActions: {
    gap: spacing.lg,
    paddingTop: spacing['2xl'],
    alignItems: 'center',
  },
  skipText: {
    textAlign: 'center',
  },
});
