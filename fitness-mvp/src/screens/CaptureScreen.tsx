import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CameraView as ExpoCameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  Button,
  Card,
  LoadingSpinner,
  LoadingState,
  SafeAreaWrapper,
  Text,
  useSnackbar,
} from '@/components';
import { EquipmentChoice, EquipmentSelectionModal } from '@/components/EquipmentSelectionModal';
import { Chip } from '@/components/ui';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useGalleryPermission } from '@/hooks/useGalleryPermission';
import { usePermissionHelper } from '@/hooks/usePermissionHelper';
import {
  preferenceStorage,
  useSavedRecipes,
  useSavedWorkouts,
  useSaveRecipe,
  useSaveWorkout,
  useSearchRecipes,
  useSearchWorkouts,
  useUploadRecipe,
  useUploadWorkout,
} from '@/services';
import { SearchParams } from '@/types';
import { COLORS, compressImage, SHAPE, SPACING } from '@/utils';
import { getFriendlyErrorMessage } from '@/utils/errors';

const MAX_IMAGE_DIMENSION = 1024;

// Input modes for the capture screen
type InputMode = 'camera' | 'search' | 'voice' | 'gallery';

// Results type
type ResultTab = 'workouts' | 'recipes';

export const CaptureScreen = () => {
  const navigation = useNavigation<any>();
  const { showSnackbar, showTopSnackbar } = useSnackbar();
  const { requestWithTopSnackbar } = usePermissionHelper();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;

  // Camera
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<ExpoCameraView>(null);
  const galleryPerm = useGalleryPermission();

  // State
  const [inputMode, setInputMode] = useState<InputMode>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>('workouts');
  const [isProcessing, setIsProcessing] = useState(false);
  const [equipmentModalVisible, setEquipmentModalVisible] = useState(false);
  const [equipmentChoice, setEquipmentChoice] = useState<EquipmentChoice | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Animation for voice button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Mutations
  const uploadWorkout = useUploadWorkout();
  const uploadRecipe = useUploadRecipe();
  const saveWorkoutMutation = useSaveWorkout(userId);
  const saveRecipeMutation = useSaveRecipe(userId);
  const savedWorkoutsQuery = useSavedWorkouts(userId);
  const savedRecipesQuery = useSavedRecipes(userId);

  // Search queries
  const workoutSearch = useSearchWorkouts(searchParams);
  const recipeSearch = useSearchRecipes(searchParams);

  useEffect(() => {
    if (currentUser.isError) {
      const message =
        currentUser.error instanceof Error
          ? currentUser.error.message
          : 'Failed to load user information';
      showTopSnackbar(message, { variant: 'error' });
    }
    // Hydrate equipment selection
    preferenceStorage.equipment.read().then((val) => {
      if (val) setEquipmentChoice(val);
    });
  }, [currentUser.isError, currentUser.error, showTopSnackbar]);

  // Pulse animation for voice recording
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  // Camera Functions
  const handleRequestCamera = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      showTopSnackbar('Camera access denied. Enable in settings.', { variant: 'error' });
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (photo?.uri) {
        const resizedUri = await resizeImageIfNeeded(photo.uri);
        setCapturedImage(resizedUri);
        setEquipmentModalVisible(true);
      }
    } catch {
      showTopSnackbar('Failed to capture photo', { variant: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Gallery Functions
  const ensureGalleryPermission = async (): Promise<boolean> => {
    if (galleryPerm.state === 'granted') return true;

    const ok = await requestWithTopSnackbar(galleryPerm.request, galleryPerm.refresh, {
      denied: 'Photo library access needed.',
      granted: 'Photo library access granted',
      stillDenied: 'Enable library access in Settings.',
    });
    return ok;
  };

  const resizeImageIfNeeded = async (uri: string) => {
    try {
      const { uri: outUri } = await compressImage(uri, {
        maxDimension: MAX_IMAGE_DIMENSION,
        quality: 0.8,
      });
      return outUri;
    } catch {
      return uri;
    }
  };

  const pickImageFromGallery = async () => {
    const granted = await ensureGalleryPermission();
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) return;

    const [asset] = result.assets;
    const uri = await resizeImageIfNeeded(asset.uri);
    setCapturedImage(uri);
    setEquipmentModalVisible(true);
    setInputMode('camera');
  };

  // Search Functions
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    setSearchParams({ query: searchQuery.trim() });
  };

  const handleSearchSubmit = () => {
    handleSearch();
  };

  // Voice Functions
  const handleVoiceStart = async () => {
    setIsListening(true);
    showTopSnackbar('🎤 Listening... Say workout or recipe name');

    // Simulate voice recognition after 3 seconds
    setTimeout(() => {
      setIsListening(false);
      const simulatedText = 'chest workout';
      setSearchQuery(simulatedText);
      setSearchParams({ query: simulatedText });
      showTopSnackbar(`Recognized: "${simulatedText}"`, { variant: 'success' });
    }, 3000);
  };

  const handleVoiceStop = () => {
    setIsListening(false);
  };

  // Upload Functions
  const handleUploadWorkouts = useCallback(async () => {
    if (!capturedImage) return;

    try {
      setIsProcessing(true);
      const data = await uploadWorkout.mutateAsync({
        uri: capturedImage,
        metadata: equipmentChoice ? { equipment: [equipmentChoice] } : undefined,
      });
      setCapturedImage(null);
      setEquipmentModalVisible(false);
      navigation.navigate('Results', { workouts: data });
    } catch (error) {
      showTopSnackbar(getFriendlyErrorMessage(error), { variant: 'error' });
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, uploadWorkout, equipmentChoice, navigation, showTopSnackbar]);

  const handleUploadRecipes = useCallback(async () => {
    if (!capturedImage) return;

    try {
      setIsProcessing(true);
      const data = await uploadRecipe.mutateAsync({ uri: capturedImage });
      setCapturedImage(null);
      setEquipmentModalVisible(false);
      navigation.navigate('Results', { recipes: data });
    } catch (error) {
      showTopSnackbar(getFriendlyErrorMessage(error), { variant: 'error' });
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, uploadRecipe, navigation, showTopSnackbar]);

  // Save Functions
  const handleSaveWorkout = useCallback(
    async (id: string) => {
      if (!userId) {
        showSnackbar('Please log in to save content', { variant: 'error' });
        return;
      }
      try {
        await saveWorkoutMutation.mutateAsync(id);
        savedWorkoutsQuery.refetch();
        showSnackbar('Workout saved!', { variant: 'success' });
      } catch {
        showSnackbar('Failed to save workout', { variant: 'error' });
      }
    },
    [saveWorkoutMutation, savedWorkoutsQuery, showSnackbar, userId]
  );

  const handleSaveRecipe = useCallback(
    async (id: string) => {
      if (!userId) {
        showSnackbar('Please log in to save content', { variant: 'error' });
        return;
      }
      try {
        await saveRecipeMutation.mutateAsync(id);
        savedRecipesQuery.refetch();
        showSnackbar('Recipe saved!', { variant: 'success' });
      } catch {
        showSnackbar('Failed to save recipe', { variant: 'error' });
      }
    },
    [saveRecipeMutation, savedRecipesQuery, showSnackbar, userId]
  );

  // Render Mode Selector
  const renderModeSelector = () => (
    <View style={styles.modeSelector}>
      <Pressable
        style={[styles.modeButton, inputMode === 'camera' && styles.modeButtonActive]}
        onPress={() => setInputMode('camera')}
      >
        <Feather
          name="camera"
          size={24}
          color={inputMode === 'camera' ? COLORS.primary.main : COLORS.text.secondary}
        />
        <Text
          variant="caption"
          style={[styles.modeLabel, inputMode === 'camera' && styles.modeLabelActive]}
        >
          Camera
        </Text>
      </Pressable>

      <Pressable
        style={[styles.modeButton, inputMode === 'search' && styles.modeButtonActive]}
        onPress={() => setInputMode('search')}
      >
        <Feather
          name="search"
          size={24}
          color={inputMode === 'search' ? COLORS.primary.main : COLORS.text.secondary}
        />
        <Text
          variant="caption"
          style={[styles.modeLabel, inputMode === 'search' && styles.modeLabelActive]}
        >
          Search
        </Text>
      </Pressable>

      <Pressable
        style={[styles.modeButton, inputMode === 'voice' && styles.modeButtonActive]}
        onPress={() => setInputMode('voice')}
      >
        <Feather
          name="mic"
          size={24}
          color={inputMode === 'voice' ? COLORS.primary.main : COLORS.text.secondary}
        />
        <Text
          variant="caption"
          style={[styles.modeLabel, inputMode === 'voice' && styles.modeLabelActive]}
        >
          Voice
        </Text>
      </Pressable>

      <Pressable
        style={[styles.modeButton, inputMode === 'gallery' && styles.modeButtonActive]}
        onPress={() => {
          setInputMode('gallery');
          pickImageFromGallery();
        }}
      >
        <Feather
          name="image"
          size={24}
          color={inputMode === 'gallery' ? COLORS.primary.main : COLORS.text.secondary}
        />
        <Text
          variant="caption"
          style={[styles.modeLabel, inputMode === 'gallery' && styles.modeLabelActive]}
        >
          Gallery
        </Text>
      </Pressable>
    </View>
  );

  // Render Camera View
  const renderCameraView = () => {
    if (!permission?.granted) {
      return (
        <View style={styles.permissionContainer}>
          <LinearGradient
            colors={[COLORS.primary.main + '30', COLORS.dark.background]}
            style={StyleSheet.absoluteFill}
          />
          <Feather name="camera-off" size={64} color={COLORS.text.secondary} />
          <Text variant="heading2" style={styles.permissionTitle}>
            Camera Access Required
          </Text>
          <Text variant="body" color={COLORS.text.secondary} style={styles.permissionText}>
            Allow camera access to take photos of equipment or ingredients
          </Text>
          <Button title="Enable Camera" onPress={handleRequestCamera} />
          <Pressable onPress={() => Linking.openSettings()} style={styles.settingsLink}>
            <Text variant="caption" color={COLORS.primary.main}>
              Open Settings
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <ExpoCameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.cameraOverlay}>
            <View style={styles.guideFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text variant="body" style={styles.guideText}>
              Frame your equipment or ingredients
            </Text>
          </View>
        </ExpoCameraView>
        <View style={styles.captureButtonContainer}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleCapture}
            disabled={isProcessing}
          >
            <View style={styles.captureButtonInner}>
              {isProcessing ? (
                <LoadingSpinner size="small" color="#FFF" />
              ) : (
                <Feather name="camera" size={32} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render Search View
  const renderSearchView = () => (
    <ScrollView style={styles.searchContainer} contentContainerStyle={styles.searchScrollContent}>
      <LinearGradient
        colors={[COLORS.primary.main + '20', COLORS.dark.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.searchContent}>
        <Feather name="search" size={48} color={COLORS.primary.main} style={styles.searchIcon} />
        <Text variant="heading2" style={styles.searchTitle}>
          Search Workouts & Recipes
        </Text>

        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color={COLORS.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Try 'chest workout' or 'chicken recipe'"
            placeholderTextColor={COLORS.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Feather name="x" size={20} color={COLORS.text.secondary} />
            </Pressable>
          )}
        </View>

        <View style={styles.quickFilters}>
          <Text variant="caption" color={COLORS.text.secondary}>
            Quick searches:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {['chest', 'legs', 'arms', 'cardio', 'protein', 'low-carb', 'vegan'].map((tag) => (
              <Chip
                key={tag}
                label={tag}
                variant="tonal"
                size="small"
                onPress={() => {
                  setSearchQuery(tag);
                  setSearchParams({ query: tag });
                }}
                style={styles.quickChip}
              />
            ))}
          </ScrollView>
        </View>

        <Button title="Search" onPress={handleSearch} disabled={!searchQuery.trim()} />
      </View>

      {/* Search Results */}
      {(workoutSearch.data || recipeSearch.data) && (
        <View style={styles.searchResults}>
          <View style={styles.tabRow}>
            <Chip
              label={`Workouts (${workoutSearch.data?.totalResults ?? 0})`}
              variant={activeTab === 'workouts' ? 'filled' : 'tonal'}
              onPress={() => setActiveTab('workouts')}
            />
            <Chip
              label={`Recipes (${recipeSearch.data?.totalResults ?? 0})`}
              variant={activeTab === 'recipes' ? 'filled' : 'tonal'}
              onPress={() => setActiveTab('recipes')}
            />
          </View>

          {(workoutSearch.isLoading || recipeSearch.isLoading) && (
            <LoadingState label="Searching..." />
          )}

          {activeTab === 'workouts' &&
            workoutSearch.data?.workouts.map((workout) => (
              <Card key={workout.id} style={styles.resultCard}>
                {workout.thumbnailUrl && (
                  <Image source={{ uri: workout.thumbnailUrl }} style={styles.resultImage} />
                )}
                <Text variant="body" weight="bold">
                  {workout.title}
                </Text>
                <Text variant="caption" color={COLORS.text.secondary}>
                  {workout.durationMinutes} min • {workout.level}
                </Text>
                <Button
                  title="Save"
                  variant="secondary"
                  size="small"
                  onPress={() => handleSaveWorkout(workout.id)}
                />
              </Card>
            ))}
          {activeTab === 'recipes' &&
            recipeSearch.data?.recipes.map((recipe) => (
              <Card key={recipe.id} style={styles.resultCard}>
                {recipe.imageUrl && (
                  <Image source={{ uri: recipe.imageUrl }} style={styles.resultImage} />
                )}
                <Text variant="body" weight="bold">
                  {recipe.title}
                </Text>
                <Text variant="caption" color={COLORS.text.secondary}>
                  {recipe.timeMinutes} min • {recipe.difficulty}
                </Text>
                <Button
                  title="Save"
                  variant="secondary"
                  size="small"
                  onPress={() => handleSaveRecipe(recipe.id)}
                />
              </Card>
            ))}
        </View>
      )}
    </ScrollView>
  );

  // Render Voice View
  const renderVoiceView = () => (
    <ScrollView style={styles.voiceContainer} contentContainerStyle={styles.voiceScrollContent}>
      <LinearGradient
        colors={[COLORS.primary.main + '20', COLORS.dark.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.voiceContent}>
        <Animated.View
          style={[
            styles.voiceButton,
            isListening && styles.voiceButtonActive,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <TouchableOpacity
            onPress={isListening ? handleVoiceStop : handleVoiceStart}
            style={styles.voiceButtonInner}
          >
            <Feather
              name={isListening ? 'mic-off' : 'mic'}
              size={48}
              color={isListening ? '#FFF' : COLORS.primary.main}
            />
          </TouchableOpacity>
        </Animated.View>

        <Text variant="heading2" style={styles.voiceTitle}>
          {isListening ? 'Listening...' : 'Tap to Speak'}
        </Text>
        <Text variant="body" color={COLORS.text.secondary} style={styles.voiceSubtitle}>
          {isListening
            ? 'Say a workout or recipe name'
            : 'Search for workouts and recipes using your voice'}
        </Text>

        {Boolean(searchQuery) && !isListening && (
          <View style={styles.recognizedContainer}>
            <Text variant="caption" color={COLORS.text.secondary}>
              Recognized:
            </Text>
            <Text variant="body" weight="bold" style={styles.recognizedText}>
              "{searchQuery}"
            </Text>
            <Button
              title="Search This"
              onPress={() => setSearchParams({ query: searchQuery })}
              style={styles.searchButton}
            />
          </View>
        )}
      </View>

      {/* Show search results if we have them */}
      {searchParams && (workoutSearch.data || recipeSearch.data) && (
        <View style={styles.searchResults}>
          <View style={styles.tabRow}>
            <Chip
              label={`Workouts (${workoutSearch.data?.totalResults ?? 0})`}
              variant={activeTab === 'workouts' ? 'filled' : 'tonal'}
              onPress={() => setActiveTab('workouts')}
            />
            <Chip
              label={`Recipes (${recipeSearch.data?.totalResults ?? 0})`}
              variant={activeTab === 'recipes' ? 'filled' : 'tonal'}
              onPress={() => setActiveTab('recipes')}
            />
          </View>

          {(workoutSearch.isLoading || recipeSearch.isLoading) && (
            <LoadingState label="Searching..." />
          )}

          {activeTab === 'workouts' &&
            workoutSearch.data?.workouts.map((workout) => (
              <Card key={workout.id} style={styles.resultCard}>
                <Text variant="body" weight="bold">
                  {workout.title}
                </Text>
                <Text variant="caption" color={COLORS.text.secondary}>
                  {workout.durationMinutes} min • {workout.level}
                </Text>
                <Button
                  title="Save"
                  variant="secondary"
                  size="small"
                  onPress={() => handleSaveWorkout(workout.id)}
                />
              </Card>
            ))}
          {activeTab === 'recipes' &&
            recipeSearch.data?.recipes.map((recipe) => (
              <Card key={recipe.id} style={styles.resultCard}>
                <Text variant="body" weight="bold">
                  {recipe.title}
                </Text>
                <Text variant="caption" color={COLORS.text.secondary}>
                  {recipe.timeMinutes} min • {recipe.difficulty}
                </Text>
                <Button
                  title="Save"
                  variant="secondary"
                  size="small"
                  onPress={() => handleSaveRecipe(recipe.id)}
                />
              </Card>
            ))}
        </View>
      )}
    </ScrollView>
  );

  // Main Render
  return (
    <SafeAreaWrapper edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="heading1">Capture</Text>
          <Text variant="body" color={COLORS.text.secondary}>
            Find workouts & recipes
          </Text>
        </View>

        {/* Mode Selector */}
        {renderModeSelector()}

        {/* Content based on mode */}
        <View style={styles.content}>
          {inputMode === 'camera' && renderCameraView()}
          {inputMode === 'search' && renderSearchView()}
          {inputMode === 'voice' && renderVoiceView()}
          {inputMode === 'gallery' && renderCameraView()}
        </View>

        {/* Equipment Modal */}
        <EquipmentSelectionModal
          visible={!!capturedImage && !isProcessing && equipmentModalVisible}
          lastChoice={equipmentChoice ?? null}
          onSelect={(choice) => {
            setEquipmentChoice(choice);
            preferenceStorage.equipment.save(choice).catch(() => undefined);
            setEquipmentModalVisible(false);
          }}
          onSkip={() => setEquipmentModalVisible(false)}
          onRequestClose={() => setEquipmentModalVisible(false)}
        />

        {/* Image Preview & Actions */}
        {capturedImage && !equipmentModalVisible && (
          <View style={styles.previewContainer}>
            <LinearGradient
              colors={[COLORS.primary.main + '20', COLORS.dark.background]}
              style={styles.previewGradient}
            >
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />
              <View style={styles.previewActions}>
                <Button
                  title="Find Workouts"
                  onPress={handleUploadWorkouts}
                  loading={uploadWorkout.isPending}
                  icon={<Feather name="activity" size={16} color="#FFF" />}
                />
                <Button
                  title="Find Recipes"
                  variant="secondary"
                  onPress={handleUploadRecipes}
                  loading={uploadRecipe.isPending}
                  icon={<Feather name="book-open" size={16} color={COLORS.primary.main} />}
                />
              </View>
              <Pressable style={styles.retakeButton} onPress={() => setCapturedImage(null)}>
                <Feather name="x" size={20} color={COLORS.text.secondary} />
                <Text variant="caption" color={COLORS.text.secondary}>
                  Retake
                </Text>
              </Pressable>
            </LinearGradient>
          </View>
        )}
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.dark.surface,
  },
  content: {
    flex: 1,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.divider,
  },
  modeButton: {
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: SHAPE.borderRadius.md,
    minWidth: 70,
  },
  modeButtonActive: {
    backgroundColor: COLORS.primary.main + '20',
  },
  modeLabel: {
    marginTop: 4,
    color: COLORS.text.secondary,
  },
  modeLabelActive: {
    color: COLORS.primary.main,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  permissionTitle: {
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  settingsLink: {
    marginTop: SPACING.sm,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.primary.main,
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: SHAPE.borderRadius.md,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: SHAPE.borderRadius.md,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: SHAPE.borderRadius.md,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: SHAPE.borderRadius.md,
  },
  guideText: {
    color: '#FFF',
    marginTop: SPACING.lg,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  captureButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  captureButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flex: 1,
  },
  searchScrollContent: {
    flexGrow: 1,
  },
  searchContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  searchIcon: {
    alignSelf: 'center',
    marginTop: SPACING.xl,
  },
  searchTitle: {
    textAlign: 'center',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dark.surface,
    borderRadius: SHAPE.borderRadius.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral.divider,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text.primary,
    fontSize: 16,
    paddingVertical: SPACING.xs,
  },
  quickFilters: {
    gap: SPACING.xs,
  },
  chipScroll: {
    flexGrow: 0,
  },
  quickChip: {
    marginRight: SPACING.xs,
  },
  searchResults: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  tabRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  resultCard: {
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  resultImage: {
    width: '100%',
    height: 120,
    borderRadius: SHAPE.borderRadius.md,
    marginBottom: SPACING.xs,
  },
  voiceContainer: {
    flex: 1,
  },
  voiceScrollContent: {
    flexGrow: 1,
  },
  voiceContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
    paddingTop: SPACING.xl * 2,
  },
  voiceButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary.main,
  },
  voiceButtonActive: {
    backgroundColor: COLORS.primary.main,
  },
  voiceButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceTitle: {
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  voiceSubtitle: {
    textAlign: 'center',
  },
  recognizedContainer: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.dark.surface,
    borderRadius: SHAPE.borderRadius.lg,
    width: '100%',
  },
  recognizedText: {
    marginVertical: SPACING.sm,
    color: COLORS.primary.main,
  },
  searchButton: {
    marginTop: SPACING.sm,
  },
  previewContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  previewGradient: {
    padding: SPACING.lg,
    borderTopLeftRadius: SHAPE.borderRadius.xl,
    borderTopRightRadius: SHAPE.borderRadius.xl,
    gap: SPACING.md,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: SHAPE.borderRadius.lg,
  },
  previewActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
  },
});