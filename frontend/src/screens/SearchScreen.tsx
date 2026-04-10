import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { launchImageLibraryAsync } from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

import { CameraView, SafeAreaWrapper, Text, useSnackbar } from '@/components';
import { PermissionRequestModal, PermissionType } from '@/components/common/PermissionRequestModal';
import { RecognitionProcessingHero } from '@/components/common/RecognitionProcessingHero';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { useGalleryPermission } from '@/hooks/useGalleryPermission';
import { searchRecipes, searchWorkouts, useUploadRecipe, useUploadWorkout } from '@/services';
import { colors, compressImage, radii, spacing } from '@/utils';
import { getFriendlyErrorMessage } from '@/utils/errors';
import { useNavigation } from '@react-navigation/native';

type SearchMode = 'home' | 'camera' | 'processing';

/**
 * SearchScreen - Multi-function search page
 * Supports: Camera, Gallery, Help, Keyword - 4 search methods
 */
export const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const { showSnackbar } = useSnackbar();
  const cameraPerm = useCameraPermission();
  const galleryPerm = useGalleryPermission();
  
  const [mode, setMode] = useState<SearchMode>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<1 | 2 | 3>(1);
  const [searchType, setSearchType] = useState<'workout' | 'recipe'>('workout');

  // Apple HIG pre-permission modal state
  const [permissionModal, setPermissionModal] = useState<{ visible: boolean; type: PermissionType; action: 'camera' | 'gallery' }>({
    visible: false, type: 'camera', action: 'camera',
  });

  const uploadWorkout = useUploadWorkout();
  const uploadRecipe = useUploadRecipe();

  // Use light mode colors for better readability
  const light = colors.light;

  useEffect(() => {
    if (!(mode === 'processing' || isProcessing)) {
      setProcessingPhase(1);
      return;
    }

    setProcessingPhase(1);
    const timer1 = setTimeout(() => setProcessingPhase(2), 700);
    const timer2 = setTimeout(() => setProcessingPhase(3), 1550);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isProcessing, mode]);

  // Called after user taps "Allow" in the pre-permission modal
  const handlePermissionAllowed = async () => {
    const action = permissionModal.action;
    setPermissionModal((p) => ({ ...p, visible: false }));

    if (action === 'camera') {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status === 'granted') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          setMode('camera');
        } else {
          Alert.alert(
            'Camera access needed',
            'Allow camera access in Settings to take photos.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        }
      }
    } else {
      // Gallery permission
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Photo access needed',
            'Allow photo library access in Settings to select photos.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }
      }
      await doPickImage();
    }
  };

  // Open camera — show pre-permission modal first (Apple HIG)
  const handleOpenCamera = async () => {
    if (cameraPerm.state !== 'granted') {
      setPermissionModal({ visible: true, type: 'camera', action: 'camera' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setMode('camera');
  };

  // Actual gallery picking logic
  const doPickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const result = await launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const compressed = await compressImage(uri, { maxDimension: 1024, quality: 0.8 });
      setCapturedImage(compressed.uri);
      handleProcessImage(compressed.uri);
    }
  };

  // Pick from gallery — show pre-permission modal first (Apple HIG)
  const handlePickImage = async () => {
    if (Platform.OS !== 'web' && galleryPerm.state !== 'granted') {
      setPermissionModal({ visible: true, type: 'photoLibrary', action: 'gallery' });
      return;
    }
    if (Platform.OS === 'web') {
      setPermissionModal({ visible: true, type: 'photoLibrary', action: 'gallery' });
      return;
    }
    await doPickImage();
  };

  const handleHelpPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    navigation.navigate('Help');
  };

  // Keyword search
  const handleKeywordSearch = async () => {
    if (!searchQuery.trim()) {
      showSnackbar('Please enter search keywords', { variant: 'error' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    setIsProcessing(true);
    setMode('processing');
    setProcessingPhase(1);

    try {
      if (searchType === 'workout') {
        const workouts = await searchWorkouts(searchQuery.trim());
        if (workouts.length === 0) {
          showSnackbar('No workouts found', { variant: 'error' });
          setMode('home');
        } else {
          console.log(`[SearchScreen] Found ${workouts.length} workouts`);
          navigation.navigate('Results', { workouts });
          // Reset to home after navigation
          setMode('home');
        }
      } else {
        const recipes = await searchRecipes(searchQuery.trim());

        // Validate recipe data
        const validRecipes = recipes.filter(r => {
          const hasValidImage = r.image && r.image.thumb && r.image.medium;
          if (!hasValidImage) {
            console.warn(`[SearchScreen] Recipe ${r.id} (${r.title}) has invalid image data`);
          }
          // Must have id and title at minimum
          return r.id && r.title;
        });

        console.log(`[SearchScreen] Found ${recipes.length} recipes, ${validRecipes.length} valid`);

        if (validRecipes.length === 0) {
          showSnackbar('No recipes found', { variant: 'error' });
          setMode('home');
        } else {
          navigation.navigate('Results', { recipes: validRecipes });
          // Reset to home after navigation
          setMode('home');
        }
      }
    } catch (error) {
      console.error('[SearchScreen] Search error:', error);
      showSnackbar(getFriendlyErrorMessage(error), { variant: 'error' });
      setMode('home');
    } finally {
      setIsProcessing(false);
    }
  };

  // Camera capture complete
  const handleCaptureComplete = useCallback((uri: string) => {
    setCapturedImage(uri);
    setMode('home');
    handleProcessImage(uri);
  }, []);

  // Process image (upload for recognition)
  const handleProcessImage = async (uri: string) => {
    setIsProcessing(true);
    setMode('processing');
    setProcessingPhase(1);

    try {
      if (searchType === 'workout') {
        const data = await uploadWorkout.mutateAsync({ uri });
        navigation.navigate('Results', { workouts: data });
      } else {
        const data = await uploadRecipe.mutateAsync({ uri });
        navigation.navigate('Results', { recipes: data });
      }
    } catch (error) {
      showSnackbar(getFriendlyErrorMessage(error), { variant: 'error' });
      setMode('home');
    } finally {
      setIsProcessing(false);
      setCapturedImage(null);
    }
  };

  // Camera mode
  if (mode === 'camera') {
    return (
      <SafeAreaWrapper>
        <View style={styles.cameraContainer}>
          <CameraView onCapture={handleCaptureComplete} />
          <Pressable style={styles.cameraBackBtn} onPress={() => setMode('home')}>
            <Text style={{ color: '#FFF', fontSize: 18 }}>✕</Text>
          </Pressable>
        </View>
      </SafeAreaWrapper>
    );
  }

  // Processing state
  if (mode === 'processing' || isProcessing) {
    const processingTitle =
      searchType === 'workout'
        ? 'Matching your photo to workouts'
        : 'Matching your photo to recipes';
    const processingSubtitle =
      searchType === 'workout'
        ? 'Aura is reading shapes, identifying equipment cues, and ranking the best-fit sessions.'
        : 'Aura is reading ingredients, dish patterns, and likely meal matches from the photo.';
    const callouts =
      searchType === 'workout'
        ? ['Equipment cues', 'Movement match', 'Session ranking']
        : ['Ingredients', 'Dish match', 'Recipe ranking'];

    return (
      <SafeAreaWrapper>
        <View style={[styles.container, { backgroundColor: light.background }]}>
          <View style={styles.processingWrap}>
            <RecognitionProcessingHero
              imageUri={capturedImage}
              modeLabel={searchType === 'workout' ? 'AURA MATCH' : 'AURA RECIPE'}
              title={processingTitle}
              subtitle={processingSubtitle}
              activePhase={processingPhase}
              phaseLabels={['Read', 'Match', 'Build']}
              callouts={callouts}
              compact
            />
          </View>
        </View>
      </SafeAreaWrapper>
    );
  }

  // Main page
  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: light.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text variant="heading1" style={{ color: light.textPrimary }}>
              Search
            </Text>
            <Text variant="body" style={{ color: light.textSecondary, marginTop: spacing.xs }}>
              Camera, Gallery, Keyword or Help
            </Text>
          </View>

          {/* Search type toggle */}
          <View style={styles.typeToggle}>
            <Pressable
              style={[
                styles.typeBtn,
                searchType === 'workout' && { backgroundColor: light.primary },
              ]}
              onPress={() => setSearchType('workout')}
            >
              <Text style={{ 
                color: searchType === 'workout' ? '#FFFFFF' : light.textSecondary,
                fontWeight: '600',
              }}>
                Workout
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.typeBtn,
                searchType === 'recipe' && { backgroundColor: light.secondary },
              ]}
              onPress={() => setSearchType('recipe')}
            >
              <Text style={{ 
                color: searchType === 'recipe' ? '#FFFFFF' : light.textSecondary,
                fontWeight: '600',
              }}>
                Recipe
              </Text>
            </Pressable>
          </View>

          {/* Keyword search box */}
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder={searchType === 'workout' ? 'Search workouts...' : 'Search recipes...'}
              placeholderTextColor={light.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleKeywordSearch}
              returnKeyType="search"
            />
            <Pressable style={styles.searchIconBtn} onPress={handleKeywordSearch}>
              <SearchIcon color={light.textSecondary} />
            </Pressable>
          </View>

          {/* Four search methods */}
          <View style={styles.methodsGrid}>
            {/* Camera */}
            <Pressable 
              style={({ pressed }) => [
                styles.methodCard,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
              onPress={handleOpenCamera}
            >
              <View style={[styles.methodFill, { backgroundColor: '#FFF2EA' }]}>
                <CameraIcon size={32} color={light.textPrimary} />
                <Text variant="body" weight="semibold" style={styles.methodLabel}>
                  Camera
                </Text>
                <Text variant="caption" style={styles.methodDesc}>
                  Capture equipment or food
                </Text>
              </View>
            </Pressable>

            {/* Gallery */}
            <Pressable 
              style={({ pressed }) => [
                styles.methodCard,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
              onPress={handlePickImage}
            >
              <View style={[styles.methodFill, { backgroundColor: '#EEF8F4' }]}>
                <GalleryIcon size={32} color={light.textPrimary} />
                <Text variant="body" weight="semibold" style={styles.methodLabel}>
                  Gallery
                </Text>
                <Text variant="caption" style={styles.methodDesc}>
                  Pick from photos
                </Text>
              </View>
            </Pressable>

            {/* Help */}
            <Pressable 
              style={({ pressed }) => [
                styles.methodCard,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
              onPress={handleHelpPress}
            >
              <View style={[styles.methodFill, { backgroundColor: '#FFF7E8' }]}>
                <HelpIcon size={32} color={light.textPrimary} />
                <Text variant="body" weight="semibold" style={styles.methodLabel}>
                  Help
                </Text>
                <Text variant="caption" style={styles.methodDesc}>
                  Learn search tips
                </Text>
              </View>
            </Pressable>

            {/* Keyword */}
            <Pressable 
              style={({ pressed }) => [
                styles.methodCard,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
              onPress={() => {
                // Focus on search input
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }}
            >
              <View style={[styles.methodFill, { backgroundColor: '#EFF6FF' }]}>
                <SearchIcon size={32} color={light.textPrimary} />
                <Text variant="body" weight="semibold" style={styles.methodLabel}>
                  Keyword
                </Text>
                <Text variant="caption" style={styles.methodDesc}>
                  Type to search
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Tips */}
          <View style={styles.tips}>
            <Text variant="caption" style={{ color: light.textSecondary, textAlign: 'center' }}>
              💡 Snap gym equipment for workouts, or food for healthy recipes
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Apple HIG pre-permission modal */}
      <PermissionRequestModal
        visible={permissionModal.visible}
        permissionType={permissionModal.type}
        onAllow={handlePermissionAllowed}
        onCancel={() => setPermissionModal((p) => ({ ...p, visible: false }))}
      />
    </SafeAreaWrapper>
  );
};

// Simple icon components
const CameraIcon = ({ size = 24, color = '#FFF' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.8,
      height: size * 0.6,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: color,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <View style={{
        width: size * 0.25,
        height: size * 0.25,
        borderRadius: size * 0.125,
        backgroundColor: color,
      }} />
    </View>
  </View>
);

const GalleryIcon = ({ size = 24, color = '#FFF' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.8,
      height: size * 0.65,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: color,
    }}>
      <View style={{
        position: 'absolute',
        bottom: 4,
        left: 4,
        right: 4,
        height: size * 0.2,
        backgroundColor: color,
        opacity: 0.5,
        borderRadius: 2,
      }} />
    </View>
  </View>
);

const HelpIcon = ({ size = 24, color = '#FFF' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.78,
      height: size * 0.78,
      borderRadius: size * 0.39,
      borderWidth: 2,
      borderColor: color,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Text style={{ color, fontSize: size * 0.44, fontWeight: '700' }}>?</Text>
    </View>
  </View>
);

const SearchIcon = ({ size = 24, color = '#FFF' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.55,
      height: size * 0.55,
      borderRadius: size * 0.275,
      borderWidth: 2,
      borderColor: color,
    }} />
    <View style={{
      width: 2,
      height: size * 0.25,
      backgroundColor: color,
      position: 'absolute',
      bottom: 2,
      right: 4,
      transform: [{ rotate: '45deg' }],
    }} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  header: {
    marginBottom: spacing.xl,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.light.surfaceVariant,
    borderRadius: radii.lg,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.light.textPrimary,
  },
  searchIconBtn: {
    padding: spacing.sm,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  methodCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' && {
      transition: 'transform 0.15s ease',
    }),
  },
  methodFill: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodLabel: {
    color: '#111111',
    marginTop: spacing.sm,
  },
  methodDesc: {
    color: colors.light.textSecondary,
    marginTop: spacing.xs,
  },
  tips: {
    paddingHorizontal: spacing.lg,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraBackBtn: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
});

export default SearchScreen;
