import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/apiClient';

import { Button, Card, SafeAreaWrapper, Text, WheelPicker } from '@/components';
import { StateView } from '@/components/common/StateView';
import useCurrentUser from '@/hooks/useCurrentUser';
import { navigateToLogin } from '@/navigation/navigationService';
import {
  GeneratedGoals,
  generateGoals,
  GenerateGoalsRequest,
  getActiveGoal,
  GoalType,
  saveGoal,
  Sex,
} from '@/services/geminiApi';
import { useGoalStatistics } from '@/services/goalsApi';
import userApi from '@/services/userApi';
import { BRAND_COLORS, spacing, useContentBottomPadding } from '@/utils';
import { clearJWT, getUserEmail } from '@/utils/jwtStorage';

export const GENERATED_GOALS_KEY = '@generated_fitness_goals';

const mapGoalTypeToFitnessGoal = (goalType: GoalType): string => {
  switch (goalType) {
    case 'fat_loss':
      return 'LOSE_WEIGHT';
    case 'muscle_gain':
      return 'GAIN_MUSCLE';
    case 'diabetes_control':
      return 'MAINTAIN';
    default:
      return 'MAINTAIN';
  }
};

const mapFitnessGoalToGoalType = (fitnessGoal?: string | null): GoalType => {
  switch ((fitnessGoal || '').toUpperCase()) {
    case 'LOSE_WEIGHT':
      return 'fat_loss';
    case 'GAIN_MUSCLE':
      return 'muscle_gain';
    case 'MAINTAIN':
      return 'diabetes_control';
    default:
      return 'fat_loss';
  }
};

// Sex selection options with cute icons
const SEX_OPTIONS: Array<{ value: Sex; label: string; icon: string; color: string }> = [
  { value: 'male', label: 'Male', icon: 'face-man', color: '#60A5FA' },
  { value: 'female', label: 'Female', icon: 'face-woman', color: '#F472B6' },
  { value: 'prefer_not_to_say', label: 'Skip', icon: 'account-question', color: '#A78BFA' },
];

// Goal type options
const GOAL_OPTIONS: Array<{ value: GoalType; label: string; icon: string; description: string; color: string }> = [
  {
    value: 'fat_loss',
    label: 'Fat Loss',
    icon: 'fire',
    description: 'Burn fat, keep muscle',
    color: '#EF4444'
  },
  {
    value: 'muscle_gain',
    label: 'Build Muscle',
    icon: 'arm-flex',
    description: 'Grow stronger',
    color: '#10B981'
  },
  {
    value: 'diabetes_control',
    label: 'Blood Sugar',
    icon: 'heart-pulse',
    description: 'Diabetes management',
    color: '#3B82F6'
  },
];

// Generate height data (100-250 cm)
const heightData = Array.from({ length: 151 }, (_, i) => ({
  value: 100 + i,
  label: String(100 + i),
}));

// Generate weight data (30-200 kg)
const weightData = Array.from({ length: 171 }, (_, i) => ({
  value: 30 + i,
  label: String(30 + i),
}));

type Step = 'sex' | 'measurements' | 'goal' | 'generating' | 'complete';

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const userId = currentUser.data?.userId || '';
  const stats = useGoalStatistics(userId);

  // Goals generation state
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [generatedGoals, setGeneratedGoals] = useState<GeneratedGoals | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarUrl = currentUser.data?.profile?.avatarUrl;

  // Profile input state
  const [selectedSex, setSelectedSex] = useState<Sex | null>(null);
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(70);
  const [selectedGoalType, setSelectedGoalType] = useState<GoalType | null>(null);
  const [step, setStep] = useState<Step>('sex');

  // Load saved goals and email on mount
  React.useEffect(() => {
    loadSavedGoals();
    loadUserEmail();
  }, []);

  // Debug: Monitor showGoalsModal state changes
  React.useEffect(() => {
    console.log('[ProfileScreen] showGoalsModal changed to:', showGoalsModal);
  }, [showGoalsModal]);

  const loadUserEmail = async () => {
    const email = await getUserEmail();
    setUserEmail(email);
  };

  const handleAvatarPress = async () => {
    // Show action sheet for camera vs library
    Alert.alert(
      'Change Profile Photo',
      'Choose a source',
      [
        {
          text: 'Take Photo',
          onPress: () => pickImage('camera'),
        },
        {
          text: 'Choose from Library',
          onPress: () => pickImage('library'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      // Request permissions
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library permission is needed to select photos.');
          return;
        }
      }

      // Launch picker
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[ProfileScreen] Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadAvatar = async (imageUri: string) => {
    setIsUploadingAvatar(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      // Step 1: Get presigned URL from backend
      const presignResponse = await api.post<{
        uploadUrl: string;
        publicUrl: string;
        fileKey: string;
      }>('/api/v1/user/avatar/presign', {
        fileType: 'image/jpeg',
      });

      console.log('[ProfileScreen] Got presigned URL:', presignResponse.uploadUrl.substring(0, 50) + '...');

      // Step 2: Upload image to S3 using presigned URL
      const imageResponse = await fetch(imageUri);
      const blob = await imageResponse.blob();

      const uploadResponse = await fetch(presignResponse.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/jpeg',
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed: ${uploadResponse.status}`);
      }

      console.log('[ProfileScreen] Image uploaded to S3');

      // Step 3: Confirm upload with backend
      await api.post('/api/v1/user/avatar/confirm', {
        publicUrl: presignResponse.publicUrl,
        fileKey: presignResponse.fileKey,
      });

      console.log('[ProfileScreen] Avatar confirmed');

      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    } catch (error) {
      console.error('[ProfileScreen] Avatar upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload avatar. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const loadSavedGoals = async () => {
    try {
      // First try to load from database (authoritative source)
      if (userId) {
        try {
          const dbGoal = await getActiveGoal(userId);
          if (dbGoal) {
            console.log('[ProfileScreen] Loaded goal from database');
            setGeneratedGoals(dbGoal);
            // Also cache in AsyncStorage for offline access
            await AsyncStorage.setItem(GENERATED_GOALS_KEY, JSON.stringify(dbGoal));
            return;
          }
        } catch (dbError) {
          console.warn('[ProfileScreen] Failed to load goal from database:', dbError);
        }
      }

      // Fallback to AsyncStorage (for offline/quick access)
      const saved = await AsyncStorage.getItem(GENERATED_GOALS_KEY);
      if (saved) {
        console.log('[ProfileScreen] Loaded goal from AsyncStorage');
        setGeneratedGoals(JSON.parse(saved));
        return;
      }

      // Last resort: check if user profile has partial goals from backend
      const profile = currentUser.data?.profile;
      if (profile?.dailyCalorieTarget) {
        // Reconstruct goals from backend profile (partial data)
        const backendGoals: GeneratedGoals = {
          goalType: mapFitnessGoalToGoalType(profile.fitnessGoal),
          dailyCalories: {
            target: profile.dailyCalorieTarget,
            min: Math.round(profile.dailyCalorieTarget * 0.9),
            max: Math.round(profile.dailyCalorieTarget * 1.1),
            rationale: 'Restored from your saved profile',
          },
          macros_grams: {
            protein_g: profile.dailyProteinTarget || 130,
            carbs_g: profile.dailyCarbsTarget || 220,
            fat_g: profile.dailyFatTarget || 70,
            notes: 'Restored from your saved profile',
          },
          sugarLimit_g_per_day: 25,
          fiberTarget_g_per_day: 25,
          weeklyActivityPlan: {
            cardio_minutes_per_week: 150,
            strength_sessions_per_week: 3,
            steps_per_day_target: 8000,
            notes: '',
          },
          milestonesChecklist: [],
          safetyNote: 'Goals restored from your profile. Regenerate for updated recommendations.',
        };
        setGeneratedGoals(backendGoals);
        await AsyncStorage.setItem(GENERATED_GOALS_KEY, JSON.stringify(backendGoals));
      }
    } catch (error) {
      console.error('Failed to load saved goals:', error);
    }
  };

  const performLogout = async () => {
    try {
      await clearJWT();
      await AsyncStorage.removeItem(GENERATED_GOALS_KEY);
      queryClient.clear();
      navigateToLogin();
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleLogout = () => {
    // On web, fall back to native confirm since Alert can be ignored by browsers
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Logout of Aura Fitness?') : true;
      if (confirmed) {
        performLogout();
      }
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  const handleGenerateGoals = async () => {
    if (!selectedSex || !selectedGoalType || !userId) return;

    setStep('generating');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const request: GenerateGoalsRequest = {
        sex: selectedSex,
        heightCm,
        weightKg,
        goalType: selectedGoalType,
        age: 30, // Default age
        activityLevel: 'medium',
      };

      const goals = await generateGoals(request);
      setGeneratedGoals(goals);

      // Save to AsyncStorage for quick offline access
      await AsyncStorage.setItem(GENERATED_GOALS_KEY, JSON.stringify(goals));

      // Save complete goals to database (new API)
      try {
        await saveGoal(userId, goals, {
          sex: selectedSex,
          heightCm,
          weightKg,
          age: 30,
          activityLevel: 'medium',
        });
        console.log('[ProfileScreen] Goals saved to database successfully');
      } catch (saveError) {
        console.warn('[ProfileScreen] Failed to save goals to database:', saveError);
        // Don't fail the whole operation - goals are still in AsyncStorage
      }

      // Also update UserProfile for backwards compatibility
      try {
        await userApi.upsertProfile({
          heightCm,
          weightKg,
          fitnessGoal: mapGoalTypeToFitnessGoal(selectedGoalType),
          dailyCalorieTarget: goals.dailyCalories.target,
          dailyProteinTarget: goals.macros_grams.protein_g,
          dailyCarbsTarget: goals.macros_grams.carbs_g,
          dailyFatTarget: goals.macros_grams.fat_g,
        });
      } catch (profileError) {
        console.warn('[ProfileScreen] Failed to update profile:', profileError);
      }

      queryClient.invalidateQueries({ queryKey: ['weekly-insights'] });
      queryClient.invalidateQueries({ queryKey: ['dailyNutrition'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['active-goal'] });

      setStep('complete');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      console.error('Failed to generate goals:', error);
      Alert.alert('Error', 'Failed to generate goals. Please try again.');
      setStep('goal');
    }
  };

  const resetGoalsModal = () => {
    console.log('[ProfileScreen] resetGoalsModal called');
    setStep('sex');
    setSelectedSex(null);
    setHeightCm(170);
    setWeightKg(70);
    setSelectedGoalType(null);
    setShowGoalsModal(false);
    console.log('[ProfileScreen] Modal state reset to false');
  };

  const handleSaveAndClose = () => {
    console.log('[ProfileScreen] handleSaveAndClose called');
    // Goals are already saved in handleGenerateGoals
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    
    // Close modal immediately (synchronously)
    console.log('[ProfileScreen] Closing modal immediately');
    setShowGoalsModal(false);
    
    // Reset modal state and navigate in next tick
    setTimeout(() => {
      console.log('[ProfileScreen] Resetting modal state');
      setStep('sex');
      setSelectedSex(null);
      setHeightCm(170);
      setWeightKg(70);
      setSelectedGoalType(null);
      
      console.log('[ProfileScreen] Navigating to Dashboard');
      navigation.navigate('Dashboard');
    }, 0);
  };

  const canProceedToMeasurements = selectedSex !== null;
  const canProceedToGoal = heightCm >= 100 && weightKg >= 30;
  const canGenerate = selectedGoalType !== null;

  const renderMenuItem = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    badge?: string | number
  ) => (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      <View style={styles.menuIcon}>
        <MaterialCommunityIcons name={icon as any} size={24} color={BRAND_COLORS.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text variant="body" weight="semibold">{title}</Text>
        <Text variant="caption" style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      {badge !== undefined && (
        <View style={styles.badge}>
          <Text variant="caption" weight="bold" style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Feather name="chevron-right" size={20} color="#6B7280" />
    </Pressable>
  );

  // Get safe area insets for full-screen modal
  const insets = useSafeAreaInsets();

  const renderGoalsModal = () => (
    <Modal
      visible={showGoalsModal}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={resetGoalsModal}
    >
      <KeyboardAvoidingView
        style={[styles.modalContainer, { backgroundColor: BRAND_COLORS.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Fixed App Bar */}
        <View style={[styles.modalAppBar, { paddingTop: insets.top + 8 }]}>
          <Text variant="heading2" weight="bold" style={styles.modalTitle}>
            {step === 'sex' && 'About You'}
            {step === 'measurements' && 'Your Stats'}
            {step === 'goal' && 'Your Goal'}
            {step === 'generating' && 'Creating Goals'}
            {step === 'complete' && 'Your Goals'}
          </Text>
          <Pressable
            onPress={resetGoalsModal}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Feather name="x" size={24} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Scrollable Content Area */}
        <ScrollView
          style={styles.modalScrollView}
          contentContainerStyle={[
            styles.modalScrollContent,
            { paddingBottom: step === 'complete' ? 100 : 120 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 1: Sex Selection */}
          {step === 'sex' && (
            <View style={styles.stepContent}>
              <Text variant="body" style={styles.stepDescription}>
                Let's personalize your fitness journey! First, tell us about yourself:
              </Text>

              <Text variant="heading3" weight="semibold" style={styles.stepLabel}>
                I am...
              </Text>

              <View style={styles.sexOptions}>
                {SEX_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.sexOption,
                      selectedSex === option.value && { backgroundColor: option.color },
                      pressed && styles.optionPressed,
                    ]}
                    onPress={() => {
                      setSelectedSex(option.value);
                      Haptics.selectionAsync().catch(() => {});
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected: selectedSex === option.value }}
                  >
                    <MaterialCommunityIcons
                      name={option.icon as any}
                      size={40}
                      color={selectedSex === option.value ? '#FFF' : option.color}
                    />
                    <Text
                      variant="body"
                      weight="semibold"
                      style={selectedSex === option.value ? styles.optionTextSelected : undefined}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Step 2: Height & Weight with Wheel Pickers */}
          {step === 'measurements' && (
            <View style={styles.stepContent}>
              <Text variant="body" style={styles.stepDescription}>
                Now let's get your measurements for accurate calculations:
              </Text>

              <View style={styles.wheelPickersContainer}>
                <WheelPicker
                  data={heightData}
                  selectedValue={heightCm}
                  onValueChange={(value) => setHeightCm(value as number)}
                  label="Height"
                  unit="cm"
                />

                <WheelPicker
                  data={weightData}
                  selectedValue={weightKg}
                  onValueChange={(value) => setWeightKg(value as number)}
                  label="Weight"
                  unit="kg"
                />
              </View>
            </View>
          )}

          {/* Step 3: Goal Selection */}
          {step === 'goal' && (
            <View style={styles.stepContent}>
              <Text variant="body" style={styles.stepDescription}>
                What's your primary fitness goal?
              </Text>

              <View style={styles.goalOptions}>
                {GOAL_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.goalOption,
                      selectedGoalType === option.value && {
                        borderColor: option.color,
                        backgroundColor: `${option.color}20`,
                      },
                      pressed && styles.optionPressed,
                    ]}
                    onPress={() => {
                      setSelectedGoalType(option.value);
                      Haptics.selectionAsync().catch(() => {});
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${option.label}: ${option.description}`}
                    accessibilityState={{ selected: selectedGoalType === option.value }}
                  >
                    <View style={[styles.goalIconContainer, { backgroundColor: `${option.color}20` }]}>
                      <MaterialCommunityIcons
                        name={option.icon as any}
                        size={28}
                        color={option.color}
                      />
                    </View>
                    <View style={styles.goalTextContainer}>
                      <Text variant="body" weight="bold">{option.label}</Text>
                      <Text variant="caption" style={styles.goalDescription}>
                        {option.description}
                      </Text>
                    </View>
                    {selectedGoalType === option.value && (
                      <MaterialCommunityIcons name="check-circle" size={24} color={option.color} />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Step 4: Generating (with overlay effect) */}
          {step === 'generating' && (
            <View style={styles.generatingContent}>
              <LinearGradient
                colors={['rgba(167, 139, 250, 0.1)', 'rgba(244, 114, 182, 0.1)']}
                style={styles.generatingOverlay}
              >
                <View style={styles.generatingInner}>
                  <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
                  <Text variant="heading3" weight="semibold" style={styles.generatingText}>
                    Generating your personalized goals...
                  </Text>
                  <Text variant="caption" style={styles.generatingSubtext}>
                    AI is calculating the best plan for you
                  </Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Step 5: Complete - Show Generated Goals */}
          {step === 'complete' && generatedGoals && (
            <View style={styles.completeContent}>
              <View style={styles.successIcon}>
                <MaterialCommunityIcons name="check-circle" size={56} color="#10B981" />
              </View>
              <Text variant="heading3" weight="bold" style={styles.successTitle}>
                Goals Generated!
              </Text>

              {/* Daily Calories */}
              <Card style={styles.goalCard}>
                <View style={styles.goalCardHeader}>
                  <MaterialCommunityIcons name="fire" size={24} color="#EF4444" />
                  <Text variant="body" weight="semibold">Daily Calories</Text>
                </View>
                <Text variant="heading2" weight="bold" style={styles.goalValue}>
                  {generatedGoals.dailyCalories.target} kcal
                </Text>
                <Text variant="caption" style={styles.goalRange}>
                  Range: {generatedGoals.dailyCalories.min} - {generatedGoals.dailyCalories.max} kcal
                </Text>
                <Text variant="caption" style={styles.goalRationale}>
                  {generatedGoals.dailyCalories.rationale}
                </Text>
              </Card>

              {/* Macros */}
              <Card style={styles.goalCard}>
                <View style={styles.goalCardHeader}>
                  <MaterialCommunityIcons name="chart-pie" size={24} color={BRAND_COLORS.primary} />
                  <Text variant="body" weight="semibold">Daily Macros</Text>
                </View>
                <View style={styles.macrosRow}>
                  <View style={styles.macroItem}>
                    <Text variant="heading3" weight="bold" style={{ color: '#10B981' }}>
                      {generatedGoals.macros_grams.protein_g}g
                    </Text>
                    <Text variant="caption">Protein</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text variant="heading3" weight="bold" style={{ color: '#F59E0B' }}>
                      {generatedGoals.macros_grams.carbs_g}g
                    </Text>
                    <Text variant="caption">Carbs</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text variant="heading3" weight="bold" style={{ color: '#EF4444' }}>
                      {generatedGoals.macros_grams.fat_g}g
                    </Text>
                    <Text variant="caption">Fat</Text>
                  </View>
                </View>
                <Text variant="caption" style={styles.goalRationale}>
                  {generatedGoals.macros_grams.notes}
                </Text>
              </Card>

              {/* Other Targets */}
              <Card style={styles.goalCard}>
                <View style={styles.goalCardHeader}>
                  <MaterialCommunityIcons name="target" size={24} color="#3B82F6" />
                  <Text variant="body" weight="semibold">Daily Targets</Text>
                </View>
                <View style={styles.targetRow}>
                  <MaterialCommunityIcons name="cube-outline" size={20} color="#F59E0B" />
                  <Text variant="body">Sugar Limit: {generatedGoals.sugarLimit_g_per_day}g</Text>
                </View>
                <View style={styles.targetRow}>
                  <MaterialCommunityIcons name="leaf" size={20} color="#10B981" />
                  <Text variant="body">Fiber Target: {generatedGoals.fiberTarget_g_per_day}g</Text>
                </View>
                <View style={styles.targetRow}>
                  <MaterialCommunityIcons name="run" size={20} color="#EF4444" />
                  <Text variant="body">
                    Cardio: {generatedGoals.weeklyActivityPlan.cardio_minutes_per_week} min/week
                  </Text>
                </View>
                <View style={styles.targetRow}>
                  <MaterialCommunityIcons name="dumbbell" size={20} color="#A78BFA" />
                  <Text variant="body">
                    Strength: {generatedGoals.weeklyActivityPlan.strength_sessions_per_week}x/week
                  </Text>
                </View>
                <View style={styles.targetRow}>
                  <MaterialCommunityIcons name="shoe-print" size={20} color="#3B82F6" />
                  <Text variant="body">
                    Steps: {generatedGoals.weeklyActivityPlan.steps_per_day_target.toLocaleString()}/day
                  </Text>
                </View>
              </Card>

              {/* Safety Note */}
              <Card style={[styles.goalCard, styles.safetyCard]}>
                <View style={styles.safetyHeader}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#F59E0B" />
                  <Text variant="caption" weight="semibold" style={styles.safetyTitle}>
                    Important Note
                  </Text>
                </View>
                <Text variant="caption" style={styles.safetyText}>
                  {generatedGoals.safetyNote}
                </Text>
              </Card>
            </View>
          )}
        </ScrollView>

        {/* Fixed Bottom CTA */}
        {step !== 'generating' && (
          <View style={[styles.modalBottomCta, { paddingBottom: insets.bottom + 12 }]}>
            {step === 'sex' && (
              <Pressable
                style={({ pressed }) => [
                  styles.ctaButton,
                  !canProceedToMeasurements && styles.ctaButtonDisabled,
                  pressed && canProceedToMeasurements && styles.ctaButtonPressed,
                ]}
                disabled={!canProceedToMeasurements}
                onPress={() => setStep('measurements')}
                accessibilityRole="button"
                accessibilityLabel="Continue to measurements"
                accessibilityState={{ disabled: !canProceedToMeasurements }}
              >
                <Text variant="body" weight="bold" style={styles.ctaButtonText}>
                  Continue
                </Text>
              </Pressable>
            )}

            {step === 'measurements' && (
              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.secondaryButtonPressed,
                  ]}
                  onPress={() => setStep('sex')}
                  accessibilityRole="button"
                  accessibilityLabel="Go back to sex selection"
                >
                  <Text variant="body" weight="semibold" style={styles.secondaryButtonText}>
                    Back
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.ctaButton,
                    styles.ctaButtonFlex,
                    !canProceedToGoal && styles.ctaButtonDisabled,
                    pressed && canProceedToGoal && styles.ctaButtonPressed,
                  ]}
                  disabled={!canProceedToGoal}
                  onPress={() => setStep('goal')}
                  accessibilityRole="button"
                  accessibilityLabel="Continue to goal selection"
                  accessibilityState={{ disabled: !canProceedToGoal }}
                >
                  <Text variant="body" weight="bold" style={styles.ctaButtonText}>
                    Continue
                  </Text>
                </Pressable>
              </View>
            )}

            {step === 'goal' && (
              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.secondaryButtonPressed,
                  ]}
                  onPress={() => setStep('measurements')}
                  accessibilityRole="button"
                  accessibilityLabel="Go back to measurements"
                >
                  <Text variant="body" weight="semibold" style={styles.secondaryButtonText}>
                    Back
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.generateButton,
                    !canGenerate && styles.generateButtonDisabled,
                  ]}
                  disabled={!canGenerate}
                  onPress={handleGenerateGoals}
                  accessibilityRole="button"
                  accessibilityLabel="Generate personalized fitness goals"
                  accessibilityState={{ disabled: !canGenerate }}
                >
                  <LinearGradient
                    colors={canGenerate ? [BRAND_COLORS.primary, BRAND_COLORS.secondary] : ['#6B7280', '#6B7280']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.generateButtonGradient}
                  >
                    <MaterialCommunityIcons name="auto-fix" size={20} color="#FFF" />
                    <Text variant="body" weight="bold" style={styles.generateButtonText}>
                      Generate Goals
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {step === 'complete' && (
              <Pressable
                style={({ pressed }) => [
                  styles.ctaButton,
                  pressed && styles.ctaButtonPressed,
                ]}
                onPress={handleSaveAndClose}
                accessibilityRole="button"
                accessibilityLabel="Save goals and go to dashboard"
              >
                <Text variant="body" weight="bold" style={styles.ctaButtonText}>
                  Save & View Dashboard
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );

  if (currentUser.isLoading) {
    return (
      <SafeAreaWrapper>
        <StateView type="loading" title="Loading Profile..." />
      </SafeAreaWrapper>
    );
  }

  if (currentUser.isError) {
    return (
      <SafeAreaWrapper>
        <StateView
          type="error"
          title="Unable to load profile"
          onRetry={() => currentUser.refetch()}
        />
      </SafeAreaWrapper>
    );
  }

  const displayName = userEmail?.split('@')[0] || 'User';
  const goalTypeLabel = generatedGoals?.goalType
    ? GOAL_OPTIONS.find(g => g.value === generatedGoals.goalType)?.label
    : null;

  // Calculate bottom padding to account for tab bar
  const contentBottomPadding = useContentBottomPadding(spacing.xl);

  return (
    <SafeAreaWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.avatarContainer,
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleAvatarPress}
            disabled={isUploadingAvatar}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.avatar}>
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color={BRAND_COLORS.primary} />
              ) : avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Feather name="user" size={40} color={BRAND_COLORS.primary} />
              )}
            </View>
            <View style={styles.editAvatarBtn} pointerEvents="none">
              <Feather name="camera" size={14} color="#FFF" />
            </View>
          </Pressable>
          <Text variant="heading2" weight="bold">Hi, {displayName}</Text>
          <Text variant="caption" style={styles.email}>{userEmail}</Text>
        </View>

        {/* Goals Status */}
        {generatedGoals ? (
          <Card style={styles.goalsStatusCard}>
            <View style={styles.goalsStatusHeader}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
              <Text variant="body" weight="semibold">Goals Active</Text>
              {goalTypeLabel && (
                <View style={styles.goalTypeBadge}>
                  <Text variant="caption" weight="bold" style={styles.goalTypeBadgeText}>
                    {goalTypeLabel}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.goalsPreview}>
              <View style={styles.goalsPreviewRow}>
                <Text variant="caption" style={styles.goalsPreviewLabel}>Daily Target:</Text>
                <Text variant="body" weight="bold" style={styles.goalsPreviewValue}>
                  {generatedGoals.dailyCalories.target} kcal
                </Text>
              </View>
              <View style={styles.goalsPreviewRow}>
                <Text variant="caption" style={styles.goalsPreviewLabel}>Macros:</Text>
                <Text variant="body" weight="semibold">
                  P: {generatedGoals.macros_grams.protein_g}g | C: {generatedGoals.macros_grams.carbs_g}g | F: {generatedGoals.macros_grams.fat_g}g
                </Text>
              </View>
            </View>
            <Button
              title="Regenerate Goals"
              variant="secondary"
              onPress={() => setShowGoalsModal(true)}
            />
          </Card>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.generateGoalsCard,
              pressed && { opacity: 0.9 },
            ]}
            onPress={() => setShowGoalsModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Set your fitness goals with AI-powered personalization"
          >
            <LinearGradient
              colors={[BRAND_COLORS.primary, BRAND_COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.generateGoalsGradient}
            >
              <MaterialCommunityIcons name="target" size={48} color="#FFF" />
              <Text variant="heading3" weight="bold" style={styles.generateGoalsTitle}>
                Set Your Fitness Goals
              </Text>
              <Text variant="body" style={styles.generateGoalsText}>
                Get AI-powered calorie and macro targets personalized for you
              </Text>
              <View style={styles.generateGoalsArrow}>
                <Feather name="arrow-right" size={24} color="#FFF" />
              </View>
            </LinearGradient>
          </Pressable>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text variant="heading3" weight="semibold" style={styles.sectionTitle}>
            Your Library
          </Text>
          {renderMenuItem(
            'dumbbell',
            'Saved Workouts',
            'Your bookmarked workouts',
            () => navigation.navigate('Workouts'),
            stats.data?.activeGoals
          )}
          {renderMenuItem(
            'book-open-variant',
            'Saved Recipes',
            'Your favorite recipes',
            () => navigation.navigate('Recipes')
          )}
          {renderMenuItem(
            'food-apple',
            'Meal History',
            'View your nutrition logs',
            () => navigation.navigate('MealHistory' as any)
          )}
          {renderMenuItem(
            'chart-line',
            'Weekly Insights',
            'Analyze your nutrition trends',
            () => navigation.navigate('WeeklyInsights' as any)
          )}
        </View>

        <View style={styles.menuSection}>
          <Text variant="heading3" weight="semibold" style={styles.sectionTitle}>
            Settings
          </Text>
          {renderMenuItem(
            'bell-outline',
            'Notifications',
            'Manage reminders',
            () => Alert.alert('Coming Soon', 'Notification settings will be available soon.')
          )}
          {renderMenuItem(
            'account-cog-outline',
            'Account',

            'Manage your account',
            () => Alert.alert('Coming Soon', 'Account settings will be available soon.')
          )}
        </View>

        {/* Logout Button */}
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Logout from your account"
        >
          <Feather name="log-out" size={20} color="#EF4444" />
          <Text variant="body" weight="semibold" style={styles.logoutText}>
            Logout
          </Text>
        </Pressable>
      </ScrollView>

      {/* Only render Modal when it should be visible */}
      {showGoalsModal && renderGoalsModal()}
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
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BRAND_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  email: {
    opacity: 0.6,
    marginTop: spacing.xs,
  },
  goalsStatusCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  goalsStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  goalTypeBadge: {
    backgroundColor: BRAND_COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  goalTypeBadgeText: {
    color: '#FFF',
    fontSize: 11,
  },
  goalsPreview: {
    backgroundColor: 'rgba(167, 139, 250, 0.08)',
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.xs,
  },
  goalsPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalsPreviewLabel: {
    opacity: 0.7,
  },
  goalsPreviewValue: {
    color: BRAND_COLORS.primary,
  },
  generateGoalsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  generateGoalsGradient: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  generateGoalsTitle: {
    color: '#FFF',
    marginTop: spacing.sm,
  },
  generateGoalsText: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  generateGoalsArrow: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuSubtitle: {
    opacity: 0.6,
  },
  badge: {
    backgroundColor: BRAND_COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#1A1F2E',
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: spacing.sm,
  },
  logoutButtonPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  logoutText: {
    color: '#EF4444',
  },
  // Full-screen modal styles
  modalContainer: {
    flex: 1,
  },
  modalAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: BRAND_COLORS.background,
  },
  modalTitle: {
    flex: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    flexGrow: 1,
  },
  modalBottomCta: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: BRAND_COLORS.background,
  },
  ctaButton: {
    backgroundColor: BRAND_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  ctaButtonFlex: {
    flex: 1,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaButtonText: {
    color: '#1A1F2E',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    minHeight: 52,
  },
  secondaryButtonPressed: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    color: BRAND_COLORS.primary,
  },
  stepContent: {
    flex: 1,
    gap: spacing.xl,
    justifyContent: 'center',
  },
  optionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  stepDescription: {
    opacity: 0.7,
    lineHeight: 22,
  },
  stepLabel: {
    marginTop: spacing.sm,
  },
  sexOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sexOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: 'rgba(167, 139, 250, 0.08)',
    gap: spacing.sm,
  },
  optionTextSelected: {
    color: '#FFF',
  },
  wheelPickersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
  },
  goalOptions: {
    gap: spacing.md,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: 'rgba(167, 139, 250, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.md,
  },
  goalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTextContainer: {
    flex: 1,
  },
  goalDescription: {
    opacity: 0.6,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  generateButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: spacing.sm,
  },
  generateButtonText: {
    color: '#FFF',
  },
  generatingContent: {
    flex: 1,
    justifyContent: 'center',
  },
  generatingOverlay: {
    flex: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingInner: {
    alignItems: 'center',
    gap: spacing.md,
  },
  generatingText: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  generatingSubtext: {
    opacity: 0.6,
    textAlign: 'center',
  },
  completeContent: {
    flex: 1,
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  goalCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  goalValue: {
    color: BRAND_COLORS.primary,
    fontSize: 32,
  },
  goalRange: {
    opacity: 0.6,
  },
  goalRationale: {
    opacity: 0.7,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacing.sm,
  },
  macroItem: {
    alignItems: 'center',
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  safetyCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  safetyTitle: {
    color: '#F59E0B',
  },
  safetyText: {
    opacity: 0.8,
    lineHeight: 18,
  },
});

export default ProfileScreen;
