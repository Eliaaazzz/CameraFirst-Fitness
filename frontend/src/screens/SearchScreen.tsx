import React, { useState, useCallback } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { launchImageLibraryAsync } from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { SafeAreaWrapper, Text, LoadingState, useSnackbar, CameraView } from '@/components';
import { colors, spacing, radii, compressImage } from '@/utils';
import { getFriendlyErrorMessage } from '@/utils/errors';
import { useUploadWorkout, useUploadRecipe, searchWorkouts, searchRecipes } from '@/services';
import { useNavigation } from '@react-navigation/native';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { useGalleryPermission } from '@/hooks/useGalleryPermission';
import { usePermissionHelper } from '@/hooks/usePermissionHelper';

type SearchMode = 'home' | 'camera' | 'processing';

/**
 * SearchScreen - Multi-function search page
 * Supports: Camera, Gallery, Voice, Keyword - 4 search methods
 */
export const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const { showSnackbar } = useSnackbar();
  const cameraPerm = useCameraPermission();
  const galleryPerm = useGalleryPermission();
  const { requestWithTopSnackbar } = usePermissionHelper();
  
  const [mode, setMode] = useState<SearchMode>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchType, setSearchType] = useState<'workout' | 'recipe'>('workout');

  const uploadWorkout = useUploadWorkout();
  const uploadRecipe = useUploadRecipe();

  // Use light mode colors for better readability
  const light = colors.light;

  // Open camera
  const handleOpenCamera = async () => {
    if (cameraPerm.state !== 'granted') {
      const ok = await requestWithTopSnackbar(cameraPerm.request, cameraPerm.refresh, {
        denied: 'Camera permission required to take photos',
        granted: 'Camera permission granted',
        stillDenied: 'Please enable camera permission in settings',
      });
      if (!ok) return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setMode('camera');
  };

  // Pick from gallery
  const handlePickImage = async () => {
    if (galleryPerm.state !== 'granted') {
      const ok = await requestWithTopSnackbar(galleryPerm.request, galleryPerm.refresh, {
        denied: 'Gallery permission required to select photos',
        granted: 'Gallery permission granted',
        stillDenied: 'Please enable gallery permission in settings',
      });
      if (!ok) return;
    }

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

  // Voice search (placeholder)
  const handleVoiceSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    showSnackbar('Voice search coming soon', { variant: 'success' });
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
    return (
      <SafeAreaWrapper>
        <View style={[styles.container, { backgroundColor: light.background }]}>
          <LoadingState label="AI is analyzing image..." />
          {capturedImage && (
            <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          )}
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
              Camera, Gallery, Voice or Keyword
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
              <LinearGradient
                colors={[light.primary, light.primaryDark]}
                style={styles.methodGradient}
              >
                <CameraIcon size={32} color="#FFF" />
                <Text variant="body" weight="semibold" style={styles.methodLabel}>
                  Camera
                </Text>
                <Text variant="caption" style={styles.methodDesc}>
                  Capture equipment or food
                </Text>
              </LinearGradient>
            </Pressable>

            {/* Gallery */}
            <Pressable 
              style={({ pressed }) => [
                styles.methodCard,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
              onPress={handlePickImage}
            >
              <LinearGradient
                colors={[light.secondary, '#DB2777']}
                style={styles.methodGradient}
              >
                <GalleryIcon size={32} color="#FFF" />
                <Text variant="body" weight="semibold" style={styles.methodLabel}>
                  Gallery
                </Text>
                <Text variant="caption" style={styles.methodDesc}>
                  Pick from photos
                </Text>
              </LinearGradient>
            </Pressable>

            {/* Voice */}
            <Pressable 
              style={({ pressed }) => [
                styles.methodCard,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
              onPress={handleVoiceSearch}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.methodGradient}
              >
                <MicIcon size={32} color="#FFF" />
                <Text variant="body" weight="semibold" style={styles.methodLabel}>
                  Voice
                </Text>
                <Text variant="caption" style={styles.methodDesc}>
                  Speak your workout
                </Text>
              </LinearGradient>
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
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.methodGradient}
              >
                <SearchIcon size={32} color="#FFF" />
                <Text variant="body" weight="semibold" style={styles.methodLabel}>
                  Keyword
                </Text>
                <Text variant="caption" style={styles.methodDesc}>
                  Type to search
                </Text>
              </LinearGradient>
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

const MicIcon = ({ size = 24, color = '#FFF' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.35,
      height: size * 0.55,
      borderRadius: size * 0.175,
      backgroundColor: color,
    }} />
    <View style={{
      width: size * 0.5,
      height: size * 0.25,
      borderWidth: 2,
      borderColor: color,
      borderTopWidth: 0,
      borderBottomLeftRadius: size * 0.25,
      borderBottomRightRadius: size * 0.25,
      marginTop: -size * 0.1,
    }} />
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
    ...(Platform.OS === 'web' && {
      transition: 'transform 0.15s ease',
    }),
  },
  methodGradient: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodLabel: {
    color: '#FFF',
    marginTop: spacing.sm,
  },
  methodDesc: {
    color: 'rgba(255,255,255,0.8)',
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
  previewImage: {
    width: 120,
    height: 90,
    borderRadius: radii.md,
    marginTop: spacing.lg,
  },
});

export default SearchScreen;
