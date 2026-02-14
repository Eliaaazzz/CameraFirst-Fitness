import { api } from '@/services/apiClient';
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
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, EditNameModal, SafeAreaWrapper, Text, WheelPicker } from '@/components';
import { StateView } from '@/components/common/StateView';
import useCurrentUser from '@/hooks/useCurrentUser';
import useImageCompressor from '@/hooks/useImageCompressor';
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
import { HYDRATION_STORAGE_KEY } from '@/stores/useHydrationStore';
import userApi from '@/services/userApi';
import { useAuthStore } from '@/stores';
import type { CurrentUserResponse, UserProfileResponse } from '@/types';
import { BRAND_COLORS, spacing, useContentBottomPadding } from '@/utils';
import { getUserEmail } from '@/utils/jwtStorage';
import { getTheme } from '@/utils/theme';

export const GENERATED_GOALS_KEY = '@generated_fitness_goals';
const DEFAULT_AVATAR_CONTENT_TYPE = 'image/jpeg';

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
    color: BRAND_COLORS.macros.protein
  },
  {
    value: 'diabetes_control',
    label: 'Blood Sugar',
    icon: 'heart-pulse',
    description: 'Diabetes management',
    color: BRAND_COLORS.macros.carbs
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
  // Always use light mode
  const theme = getTheme('light');
  const navigation = useNavigation<any>();
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const userId = currentUser.data?.userId || '';
  const stats = useGoalStatistics(userId);

  // Goals generation state
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [generatedGoals, setGeneratedGoals] = useState<GeneratedGoals | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Avatar upload state with high-performance compression
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarCacheKey, setAvatarCacheKey] = useState(Date.now());
  const avatarUrl = currentUser.data?.profile?.avatarUrl;

  // Use the image compressor hook for non-blocking compression
  // - compressImage: Off-main-thread compression (Web Worker on web, expo-image-manipulator on native)
  // - optimisticAvatarUri: Instant local preview for immediate UI feedback
  const {
    compress: compressImage,
    previewUri: optimisticAvatarUri,
    setPreviewUri: setOptimisticAvatarUri,
  } = useImageCompressor({
    defaultOptions: {
      maxDimension: 512, // Avatar images don't need to be large
      quality: 0.85,
    },
  });

  // Edit name modal state
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Helper to get the "Cache Busted" URL - ensures Image component treats it as a new resource
  const getAvatarUri = (url: string) => {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${avatarCacheKey}`;
  };

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

  // Handle username update
  const handleUpdateUsername = async (newUsername: string) => {
    // Store previous data for rollback
    const previousData = queryClient.getQueryData(['current-user']);

    // Optimistic update for immediate UI feedback
    queryClient.setQueryData(['current-user'], (old: any) => ({
      ...old,
      username: newUsername,
    }));

    setIsUpdatingName(true);
    try {
      const updatedUser = await userApi.updateUsername(newUsername);

      // Update cache with server response to ensure consistency
      queryClient.setQueryData(['current-user'], (old: any) => ({
        ...old,
        ...updatedUser,
      }));

      // Close modal FIRST before any query invalidation to prevent re-render interference
      setShowEditNameModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Invalidate queries AFTER modal is closed to ensure other screens get fresh data
      // Use setTimeout to ensure modal close state is committed before refetch triggers re-render
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['current-user'] });
      }, 0);
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(['current-user'], previousData);
      Alert.alert('Error', 'Failed to update name. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleAvatarPress = async () => {
    // Directly open the gallery (camera icon UX expectation)
    await pickImage('library');
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
        const selectedUri = result.assets[0].uri;

        // === Optimistic UI (方案 C) ===
        // Show local preview IMMEDIATELY - user sees instant feedback
        setOptimisticAvatarUri(selectedUri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

        // Set loading state for spinner overlay
        setIsUploadingAvatar(true);

        // === Double rAF (方案 B) ===
        // Ensures loading spinner renders on screen BEFORE heavy work begins
        // First rAF: browser prepares to paint the loading state
        // Second rAF: previous frame committed to GPU, safe to start heavy work
        requestAnimationFrame(() => {
          requestAnimationFrame(async () => {
            try {
              // Step 1: Compress image off-main-thread (Web Worker on web, expo-image-manipulator on native)
              // This keeps the UI at 60fps even for 4K/10MB images
              console.log('[ProfileScreen] Starting off-thread compression...');
              const compressed = await compressImage(selectedUri);
              console.log('[ProfileScreen] Compression complete:', {
                originalSize: compressed.originalSize,
                compressedSize: compressed.size,
                ratio: (compressed.ratio * 100).toFixed(1) + '%',
                duration: compressed.duration.toFixed(0) + 'ms',
              });

              // Step 2: Upload the compressed image
              // On native, we use the compressed URI; on web, we use the blob
              if (compressed.uri) {
                await uploadAvatar(compressed.uri);
              } else if (compressed.blob) {
                await uploadAvatarBlob(compressed.blob);
              } else {
                throw new Error('No compressed image data');
              }
            } catch (error) {
              console.error('[ProfileScreen] Compression/upload error:', error);
              Alert.alert('Error', 'Failed to process image. Please try again.');
              setIsUploadingAvatar(false);
              setOptimisticAvatarUri(null);
            }
          });
        });
      }
    } catch (error) {
      console.error('[ProfileScreen] Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setIsUploadingAvatar(false);
      setOptimisticAvatarUri(null);
    }
  };

  const uploadAvatar = async (imageUri: string) => {
    // Note: isUploadingAvatar and optimisticAvatarUri are already set in pickImage
    try {
      // Step 1: Convert image URI to blob first to get the actual MIME type
      const imageResponse = await fetch(imageUri);
      const blob = await imageResponse.blob();

      // Determine content type dynamically
      let contentType = blob.type;

      // Fallback if blob type is missing or generic (common on some Android versions)
      if (!contentType || contentType === 'application/octet-stream') {
        const ext = imageUri.split('.').pop()?.toLowerCase();
        if (ext === 'png') contentType = 'image/png';
        else if (ext === 'webp') contentType = 'image/webp';
        else contentType = DEFAULT_AVATAR_CONTENT_TYPE;
      }

      console.log('[ProfileScreen] Image blob type:', blob.type, 'Detected content type:', contentType, 'Size:', blob.size);

      // Check file size (max 5MB for avatars)
      const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
      if (blob.size > MAX_AVATAR_SIZE) {
        Alert.alert('Image Too Large', 'Please select an image smaller than 5MB.');
        // Rollback optimistic preview on validation error
        setOptimisticAvatarUri(null);
        setIsUploadingAvatar(false);
        return;
      }

      // Step 2: Get presigned URL from backend with the correct content type
      const presignResponse = await api.post<{
        uploadUrl: string;
        publicUrl: string;
        fileKey: string;
      }>('/api/v1/user/avatar/presign', {
        fileType: contentType,
      });

      console.log('[ProfileScreen] Got presigned URL:', presignResponse.uploadUrl.substring(0, 50) + '...');

      // Step 3: Upload image to R2 using presigned URL with timeout and retry
      // IMPORTANT: Use native fetch (not axios) to avoid Authorization header conflicts
      const uploadWithRetry = async (retries = 2): Promise<Response> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            // Create AbortController for timeout (60 seconds for upload)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const response = await fetch(presignResponse.uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': contentType,
              },
              body: blob,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              return response;
            }

            // If not ok and we have retries left, try again
            if (attempt < retries) {
              console.warn(`[ProfileScreen] Upload attempt ${attempt + 1} failed with status ${response.status}, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
              continue;
            }

            return response;
          } catch (error: any) {
            if (error.name === 'AbortError') {
              console.error(`[ProfileScreen] Upload attempt ${attempt + 1} timed out`);
              if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                continue;
              }
              throw new Error('Upload timed out. Please check your network connection and try again.');
            }

            // Network error - retry if we have attempts left
            if (attempt < retries) {
              console.warn(`[ProfileScreen] Upload attempt ${attempt + 1} failed:`, error.message, ', retrying...');
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              continue;
            }
            throw error;
          }
        }
        throw new Error('Upload failed after all retries');
      };

      const uploadResponse = await uploadWithRetry();

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => '');
        console.error('[ProfileScreen] R2 upload failed:', uploadResponse.status, errorText);
        throw new Error(`Upload failed: ${uploadResponse.status}. Please try again.`);
      }

      console.log('[ProfileScreen] Image uploaded to R2');

      // Step 4: Confirm upload with backend
      const updatedProfile = await api.post<UserProfileResponse>('/api/v1/user/avatar/confirm', {
        publicUrl: presignResponse.publicUrl,
        fileKey: presignResponse.fileKey,
      });

      console.log('[ProfileScreen] Avatar confirmed, updated profile:', updatedProfile);
      console.log('[ProfileScreen] Updated profile avatarUrl:', updatedProfile?.avatarUrl);
      console.log('[ProfileScreen] Presigned publicUrl:', presignResponse.publicUrl);

      // Update the cached current user so the UI switches to server URL
      const newAvatarUrl = updatedProfile?.avatarUrl ?? presignResponse.publicUrl;
      console.log('[ProfileScreen] Setting new avatar URL:', newAvatarUrl);

      queryClient.setQueryData<CurrentUserResponse>(['current-user'], (old) => {
        if (!old) return old as any;
        return {
          ...old,
          profile: {
            ...(old.profile ?? {}),
            avatarUrl: newAvatarUrl,
          },
        };
      });

      // Update cache key to force Image component to re-fetch with new URL
      const newCacheKey = Date.now();
      setAvatarCacheKey(newCacheKey);

      // === Success: Clear optimistic preview and loading state ===
      // The Image component will now render with the server URL
      setOptimisticAvatarUri(null);
      setIsUploadingAvatar(false);

      // Invalidate queries in background (no await) - cache update already applied
      // This ensures other screens get fresh data on next access without causing a refresh
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    } catch (error) {
      console.error('[ProfileScreen] Avatar upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload avatar. Please try again.');
      // === Failure: Rollback optimistic preview ===
      setOptimisticAvatarUri(null);
      setIsUploadingAvatar(false);
    }
  };

  /**
   * Upload avatar from a Blob (web platform after compression)
   * Shares the same upload logic but skips the URI-to-blob conversion
   */
  const uploadAvatarBlob = async (blob: Blob) => {
    try {
      const contentType = blob.type || DEFAULT_AVATAR_CONTENT_TYPE;
      console.log('[ProfileScreen] Uploading compressed blob:', contentType, 'Size:', blob.size);

      // Check file size (max 5MB for avatars - should be well under after compression)
      const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
      if (blob.size > MAX_AVATAR_SIZE) {
        Alert.alert('Image Too Large', 'Please select a smaller image.');
        setOptimisticAvatarUri(null);
        setIsUploadingAvatar(false);
        return;
      }

      // Get presigned URL
      const presignResponse = await api.post<{
        uploadUrl: string;
        publicUrl: string;
        fileKey: string;
      }>('/api/v1/user/avatar/presign', {
        fileType: contentType,
      });

      // Upload to R2
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const uploadResponse = await fetch(presignResponse.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      console.log('[ProfileScreen] Compressed image uploaded to R2');

      // Confirm with backend
      const updatedProfile = await api.post<UserProfileResponse>('/api/v1/user/avatar/confirm', {
        publicUrl: presignResponse.publicUrl,
        fileKey: presignResponse.fileKey,
      });

      // Update cache
      const newAvatarUrl = updatedProfile?.avatarUrl ?? presignResponse.publicUrl;
      queryClient.setQueryData<CurrentUserResponse>(['current-user'], (old) => {
        if (!old) return old as any;
        return {
          ...old,
          profile: { ...(old.profile ?? {}), avatarUrl: newAvatarUrl },
        };
      });

      setAvatarCacheKey(Date.now());
      setOptimisticAvatarUri(null);
      setIsUploadingAvatar(false);

      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    } catch (error) {
      console.error('[ProfileScreen] Blob upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload avatar. Please try again.');
      setOptimisticAvatarUri(null);
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
      // Clear generated goals from AsyncStorage
      await AsyncStorage.removeItem(GENERATED_GOALS_KEY);

      // Clear React Query cache
      queryClient.clear();

      // Sign out via Zustand store (handles token cleanup + navigation)
      await useAuthStore.getState().signOut();
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

  const performDeleteAccount = async () => {
    try {
      await userApi.deleteAccount();
      // Clear local data
      await AsyncStorage.multiRemove([GENERATED_GOALS_KEY, HYDRATION_STORAGE_KEY]);
      queryClient.clear();
      // Sign out and navigate to login
      await useAuthStore.getState().signOut();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to delete account:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleCloseAccount = () => {
    // On web, fall back to native confirm since Alert can be ignored by browsers
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' 
        ? window.confirm('Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.') 
        : true;
      if (confirmed) {
        performDeleteAccount();
      }
      return;
    }

    Alert.alert(
      'Close Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: performDeleteAccount,
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
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: theme.colors.surface },
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      <View style={[styles.menuIcon, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text variant="body" weight="semibold" style={{ color: theme.colors.textPrimary }}>{title}</Text>
        <Text variant="caption" style={[styles.menuSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
      </View>
      {badge !== undefined && (
        <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
          <Text variant="caption" weight="bold" style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
    </Pressable>
  );
  // last seen

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
        style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Fixed App Bar */}
        <View style={[styles.modalAppBar, { paddingTop: insets.top + 8, borderBottomColor: theme.colors.border }]}>
          {/* Home Button - Navigate back to Dashboard */}
          <Pressable
            onPress={() => {
              resetGoalsModal();
              navigation.navigate('Dashboard');
            }}
            style={styles.homeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go to Home"
          >
            <Feather name="home" size={22} color={theme.colors.primary} />
          </Pressable>
          <Text variant="heading2" weight="bold" style={[styles.modalTitle, styles.modalTitleCentered, { color: theme.colors.textPrimary }]}>
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
            <Feather name="x" size={24} color={theme.colors.textSecondary} />
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
              <Text variant="body" style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
                Let's personalize your fitness journey! First, tell us about yourself:
              </Text>

              <Text variant="heading3" weight="semibold" style={[styles.stepLabel, { color: theme.colors.textPrimary }]}>
                I am...
              </Text>

              <View style={styles.sexOptions}>
                {SEX_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.sexOption,
                      { backgroundColor: theme.colors.surface },
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
                      style={[
                        { color: theme.colors.textPrimary },
                        selectedSex === option.value ? styles.optionTextSelected : {}
                      ]}
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
              <Text variant="body" style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
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
              <Text variant="body" style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
                What's your primary fitness goal?
              </Text>

              <View style={styles.goalOptions}>
                {GOAL_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.goalOption,
                      { backgroundColor: theme.colors.surface },
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
                      <Text variant="body" weight="bold" style={{ color: theme.colors.textPrimary }}>{option.label}</Text>
                      <Text variant="caption" style={[styles.goalDescription, { color: theme.colors.textSecondary }]}>
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
                colors={[theme.colors.primary + '20', theme.colors.secondary + '20']}
                style={styles.generatingOverlay}
              >
                <View style={styles.generatingInner}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text variant="heading3" weight="semibold" style={[styles.generatingText, { color: theme.colors.textPrimary }]}>
                    Generating your personalized goals...
                  </Text>
                  <Text variant="caption" style={[styles.generatingSubtext, { color: theme.colors.textSecondary }]}>
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
                <Text variant="caption" style={styles.goalRationale}>
                  {generatedGoals.macros_grams.notes}
                </Text>
              </Card>

              {/* Other Targets */}
              <Card style={[styles.goalCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.goalCardHeader}>
                  <MaterialCommunityIcons name="target" size={24} color={theme.colors.info} />
                  <Text variant="body" weight="semibold" style={{ color: theme.colors.textPrimary }}>Daily Targets</Text>
                </View>
                <View style={styles.targetRow}>
                  <MaterialCommunityIcons name="cube-outline" size={20} color={theme.colors.warning} />
                  <Text variant="body" style={{ color: theme.colors.textSecondary }}>Sugar Limit: {generatedGoals.sugarLimit_g_per_day}g</Text>
                </View>
                <View style={styles.targetRow}>
                  <MaterialCommunityIcons name="leaf" size={20} color={theme.colors.success} />
                  <Text variant="body" style={{ color: theme.colors.textSecondary }}>Fiber Target: {generatedGoals.fiberTarget_g_per_day}g</Text>
                </View>
                <View style={styles.targetRow}>
                  <MaterialCommunityIcons name="run" size={20} color={theme.colors.error} />
                  <Text variant="body" style={{ color: theme.colors.textSecondary }}>
                    Cardio: {generatedGoals.weeklyActivityPlan.cardio_minutes_per_week} min/week
                  </Text>
                </View>
                <View style={styles.targetRow}>
                  <MaterialCommunityIcons name="dumbbell" size={20} color={theme.colors.primary} />
                  <Text variant="body" style={{ color: theme.colors.textSecondary }}>
                    Strength: {generatedGoals.weeklyActivityPlan.strength_sessions_per_week}x/week
                  </Text>
                </View>
                <View style={styles.targetRow}>
                  <MaterialCommunityIcons name="shoe-print" size={20} color={theme.colors.info} />
                  <Text variant="body" style={{ color: theme.colors.textSecondary }}>
                    Steps: {generatedGoals.weeklyActivityPlan.steps_per_day_target.toLocaleString()}/day
                  </Text>
                </View>
              </Card>

              {/* Safety Note */}
              <Card style={[styles.goalCard, styles.safetyCard, { backgroundColor: theme.colors.warning + '15', borderColor: theme.colors.warning + '40' }]}>
                <View style={styles.safetyHeader}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.colors.warning} />
                  <Text variant="caption" weight="semibold" style={[styles.safetyTitle, { color: theme.colors.warning }]}>
                    Important Note
                  </Text>
                </View>
                <Text variant="caption" style={[styles.safetyText, { color: theme.colors.textSecondary }]}>
                  {generatedGoals.safetyNote}
                </Text>
              </Card>
            </View>
          )}
        </ScrollView>

        {/* Fixed Bottom CTA */}
        {step !== 'generating' && (
          <View style={[styles.modalBottomCta, { paddingBottom: insets.bottom + 12, backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
            {step === 'sex' && (
              <Pressable
                style={({ pressed }) => [
                  styles.ctaButton,
                  { backgroundColor: theme.colors.primary },
                  !canProceedToMeasurements && styles.ctaButtonDisabled,
                  pressed && canProceedToMeasurements && styles.ctaButtonPressed,
                ]}
                disabled={!canProceedToMeasurements}
                onPress={() => setStep('measurements')}
                accessibilityRole="button"
                accessibilityLabel="Continue to measurements"
                accessibilityState={{ disabled: !canProceedToMeasurements }}
              >
                <Text variant="body" weight="bold" style={[styles.ctaButtonText, { color: '#FFFFFF' }]}>
                  Continue
                </Text>
              </Pressable>
            )}

            {step === 'measurements' && (
              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { backgroundColor: theme.colors.surface },
                    pressed && styles.secondaryButtonPressed,
                  ]}
                  onPress={() => setStep('sex')}
                  accessibilityRole="button"
                  accessibilityLabel="Go back to sex selection"
                >
                  <Text variant="body" weight="semibold" style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
                    Back
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.ctaButton,
                    styles.ctaButtonFlex,
                    { backgroundColor: theme.colors.primary },
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
                    { backgroundColor: theme.colors.surface },
                    pressed && styles.secondaryButtonPressed,
                  ]}
                  onPress={() => setStep('measurements')}
                  accessibilityRole="button"
                  accessibilityLabel="Go back to measurements"
                >
                  <Text variant="body" weight="semibold" style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
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
                    colors={canGenerate ? [theme.colors.primary, theme.colors.secondary] : ['#6B7280', '#6B7280']}
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
                <Text variant="body" weight="bold" style={[styles.ctaButtonText, { color: '#FFFFFF' }]}>
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

  const displayName = currentUser.data?.username || userEmail?.split('@')[0] || 'User';
  const goalTypeLabel = generatedGoals?.goalType
    ? GOAL_OPTIONS.find(g => g.value === generatedGoals.goalType)?.label
    : null;

  // Calculate bottom padding to account for tab bar
  const contentBottomPadding = useContentBottomPadding(spacing.xl);

  // Determine which avatar to display:
  // 1. Optimistic preview (local file) - shows immediately after selection
  // 2. Server URL with cache busting - shows after upload completes
  // 3. Default icon - when no avatar exists
  const displayAvatarUri = optimisticAvatarUri || (avatarUrl ? getAvatarUri(avatarUrl) : undefined);

  return (
    <SafeAreaWrapper>
      <ScrollView
        style={[styles.container, { backgroundColor: 'transparent' }]}
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          {/* Single Pressable for entire avatar area to avoid touch conflicts */}
          <Pressable
            style={({ pressed }) => [
              styles.avatarContainer,
              pressed && !isUploadingAvatar && { opacity: 0.7 },
            ]}
            onPress={handleAvatarPress}
            disabled={isUploadingAvatar}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              {/* Avatar content - prioritizes optimistic preview for instant feedback */}
              {displayAvatarUri ? (
                <Image
                  key={optimisticAvatarUri ? 'optimistic' : avatarCacheKey}
                  source={{ uri: displayAvatarUri }}
                  style={styles.avatarImage}
                />
              ) : (
                <Feather name="user" size={40} color={theme.colors.primary} />
              )}
              {/* Loading overlay - shows spinner while uploading (optimistic preview visible underneath) */}
              {isUploadingAvatar && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              )}
            </View>
            <View
              style={[
                styles.editAvatarBtn,
                { backgroundColor: theme.colors.primary },
                isUploadingAvatar && { opacity: 0.5 },
              ]}
              pointerEvents="none"
            >
              <Feather name="camera" size={14} color="#FFF" />
            </View>
          </Pressable>
          <Text variant="heading2" weight="bold" style={{ color: theme.colors.textPrimary }}>Hi, {displayName}</Text>
          <Text variant="caption" style={[styles.email, { color: theme.colors.textSecondary }]}>{userEmail}</Text>
        </View>

        {/* Goals Status */}
        {generatedGoals ? (
          <Card style={[styles.goalsStatusCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.goalsStatusHeader}>
              <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.success} />
              <Text variant="body" weight="semibold" style={{ color: theme.colors.textPrimary }}>Goals Active</Text>
              {goalTypeLabel && (
                <View style={[styles.goalTypeBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text variant="caption" weight="bold" style={styles.goalTypeBadgeText}>
                    {goalTypeLabel}
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.goalsPreview, { backgroundColor: theme.colors.background }]}>
              <View style={styles.goalsPreviewRow}>
                <Text variant="caption" style={[styles.goalsPreviewLabel, { color: theme.colors.textSecondary }]}>Daily Target:</Text>
                <Text variant="body" weight="bold" style={{ color: theme.colors.primary }}>
                  {generatedGoals.dailyCalories.target} kcal
                </Text>
              </View>
              <View style={styles.goalsPreviewRow}>
                <Text variant="caption" style={[styles.goalsPreviewLabel, { color: theme.colors.textSecondary }]}>Macros:</Text>
                <Text variant="body" weight="semibold" style={{ color: theme.colors.textPrimary }}>
                  P: {generatedGoals.macros_grams.protein_g}g | C: {generatedGoals.macros_grams.carbs_g}g | F: {generatedGoals.macros_grams.fat_g}g
                </Text>
              </View>
            </View>
            <Button
              title="Regenerate Goals"
              variant="primary"
              onPress={() => setShowGoalsModal(true)}
              style={{ backgroundColor: '#F97316' }}
              textColor="#FFFFFF"
            />
          </Card>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.generateGoalsCard,
              pressed && styles.generateGoalsCardPressed,
            ]}
            onPress={() => setShowGoalsModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Set your fitness goals with AI-powered personalization"
          >
            <View style={styles.generateGoalsInner}>
              <View style={styles.generateGoalsIcon}>
                <MaterialCommunityIcons name="target" size={22} color={BRAND_COLORS.primary} />
              </View>
              <View style={styles.generateGoalsCopy}>
                <Text variant="body" weight="bold" style={styles.generateGoalsTitle}>
                  Set Your Fitness Goals
                </Text>
                <Text variant="caption" style={styles.generateGoalsText} numberOfLines={2}>
                  AI-powered calorie and macro targets personalized for you
                </Text>
              </View>
              <View style={styles.generateGoalsCta}>
                <Text variant="caption" weight="semibold" style={styles.generateGoalsCtaText}>
                  Start
                </Text>
                <Feather name="arrow-right" size={16} color={BRAND_COLORS.primary} />
              </View>
            </View>
          </Pressable>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text variant="heading3" weight="semibold" style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Your Library
          </Text>
          {renderMenuItem(
            'dumbbell',
            'Saved Workouts',
            'Your bookmarked workouts',
            () => navigation.navigate('SavedWorkouts' as any)
          )}
          {renderMenuItem(
            'book-open-variant',
            'Saved Recipes',
            'Your favorite recipes',
            () => navigation.navigate('SavedRecipes' as any)
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
          <Text variant="heading3" weight="semibold" style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Settings
          </Text>
          {renderMenuItem(
            'account-edit-outline',
            'Account Details',
            'Change name',
            () => setShowEditNameModal(true)
          )}
          {renderMenuItem(
            'bell-outline',
            'Notifications',
            'Manage reminders',
            () => Alert.alert('Coming Soon', 'Notification settings will be available soon.')
          )}
          {renderMenuItem(
            'account-remove-outline',
            'Close Account',
            'Permanently delete your account',
            handleCloseAccount
          )}
        </View>

        {/* Logout Button */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            { backgroundColor: theme.colors.surface },
            pressed && { opacity: 0.7 }
          ]}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Logout from your account"
        >
          <Feather name="log-out" size={20} color={theme.colors.error} />
          <Text variant="body" weight="semibold" style={[styles.logoutText, { color: theme.colors.error }]}>
            Logout
          </Text>
        </Pressable>
      </ScrollView>

      {/* Only render Modal when it should be visible */}
      {showGoalsModal && renderGoalsModal()}

      {/* Edit Name Modal */}
      <EditNameModal
        visible={showEditNameModal}
        onDismiss={() => setShowEditNameModal(false)}
        onSave={handleUpdateUsername}
        currentName={currentUser.data?.username || ''}
        isLoading={isUpdatingName}
      />
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
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    zIndex: 10,
    elevation: 5, // Android shadow/z-index
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
    }),
  },
  generateGoalsCardPressed: {
    backgroundColor: '#FFF7ED',
  },
  generateGoalsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  generateGoalsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND_COLORS.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  generateGoalsCopy: {
    flex: 1,
    minWidth: 0,
  },
  generateGoalsTitle: {
    color: BRAND_COLORS.textPrimary,
  },
  generateGoalsText: {
    color: BRAND_COLORS.textMuted,
    marginTop: 2,
  },
  generateGoalsCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: BRAND_COLORS.primaryTint,
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexShrink: 0,
  },
  generateGoalsCtaText: {
    color: BRAND_COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
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
  homeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
  },
  modalTitle: {
    flex: 1,
  },
  modalTitleCentered: {
    textAlign: 'center',
    marginHorizontal: spacing.sm,
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
