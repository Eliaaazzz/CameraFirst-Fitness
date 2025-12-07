import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Camera } from 'expo-camera';
import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';

import {
  Button,
  CameraView,
  Card,
  Container,
  LoadingState,
  SafeAreaWrapper,
  Text,
} from '@/components';
import { useSnackbar } from '@/components';
import { formatDifficulty, formatMinutes, formatNumber, compressImage, getFileSize, openSettingsAndCheck, spacing } from '@/utils';
import { getFriendlyErrorMessage } from '@/utils/errors';
import {
  DEFAULT_SAVED_PAGE_SIZE,
  permissionStorage,
  preferenceStorage,
  useRemoveRecipe,
  useRemoveWorkout,
  useSaveRecipe,
  useSaveWorkout,
  useSavedRecipes,
  useSavedWorkouts,
  useUploadRecipe,
  useUploadWorkout,
  DEFAULT_WORKOUT_SORT,
  DEFAULT_RECIPE_SORT,
} from '@/services';
import { useNavigation } from '@react-navigation/native';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { useGalleryPermission } from '@/hooks/useGalleryPermission';
import { usePermissionHelper } from '@/hooks/usePermissionHelper';
import { EquipmentSelectionModal, EquipmentChoice } from '@/components/EquipmentSelectionModal';
import { PermissionDialog } from '@/components/PermissionDialog';
import { RecipeCard, WorkoutCard } from '@/types';
import useCurrentUser from '@/hooks/useCurrentUser';

const MAX_IMAGE_DIMENSION = 1024;

type PermissionState = 'granted' | 'denied' | 'undetermined';

type ResultTab = 'workouts' | 'recipes';

const measureImage = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), (error) => reject(error));
  });

export const CaptureScreen = () => {
  const navigation = useNavigation<any>();
  const cameraPerm = useCameraPermission();
  const galleryPerm = useGalleryPermission();
  const { showSnackbar, showTopSnackbar } = useSnackbar();
  const { requestWithTopSnackbar } = usePermissionHelper();
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const savedPageSize = DEFAULT_SAVED_PAGE_SIZE;
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>('workouts');
  const [isProcessing, setIsProcessing] = useState(false);
  const [equipmentModalVisible, setEquipmentModalVisible] = useState(false);
  const [equipmentChoice, setEquipmentChoice] = useState<EquipmentChoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadWorkout = useUploadWorkout();
  const uploadRecipe = useUploadRecipe();
  const saveWorkoutMutation = useSaveWorkout(userId, savedPageSize, DEFAULT_WORKOUT_SORT);
  const removeWorkoutMutation = useRemoveWorkout(userId, savedPageSize, DEFAULT_WORKOUT_SORT);
  const saveRecipeMutation = useSaveRecipe(userId, savedPageSize, DEFAULT_RECIPE_SORT);
  const removeRecipeMutation = useRemoveRecipe(userId, savedPageSize, DEFAULT_RECIPE_SORT);
  const savedWorkoutsQuery = useSavedWorkouts(userId, savedPageSize, DEFAULT_WORKOUT_SORT);
  const savedRecipesQuery = useSavedRecipes(userId, savedPageSize, DEFAULT_RECIPE_SORT);

  const [workoutResults, setWorkoutResults] = useState<WorkoutCard[]>([]);
  const [recipeResults, setRecipeResults] = useState<RecipeCard[]>([]);
  const [savedWorkoutIds, setSavedWorkoutIds] = useState<Set<string>>(new Set());
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentUser.isError) {
      const message = currentUser.error instanceof Error ? currentUser.error.message : 'Failed to load user information';
      showTopSnackbar(message, { variant: 'error' });
    }
    // hydrate last equipment selection
    preferenceStorage.equipment.read().then((val) => {
      if (val) setEquipmentChoice(val);
    });
  }, [currentUser.isError, currentUser.error, showTopSnackbar]);

  useEffect(() => {
    if (savedWorkoutsQuery.data?.pages) {
      const ids = savedWorkoutsQuery.data.pages.flatMap((page) => page.items.map((item) => item.id));
      setSavedWorkoutIds(new Set(ids));
    }
  }, [savedWorkoutsQuery.data]);

  useEffect(() => {
    if (savedRecipesQuery.data?.pages) {
      const ids = savedRecipesQuery.data.pages.flatMap((page) => page.items.map((item) => item.id));
      setSavedRecipeIds(new Set(ids));
    }
  }, [savedRecipesQuery.data]);

  const handleRequestCamera = async () => {
    const ok = await requestWithTopSnackbar(cameraPerm.request, cameraPerm.refresh, {
      denied: 'Camera access denied. Open settings to enable.',
      granted: 'Camera access granted',
      stillDenied: 'Still denied. You can enable camera in Settings.',
    });
    if (ok) setErrorMessage(null);
  };

  const openSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert('Unable to open settings', 'Please open settings manually to enable camera access.');
    });
  };

  const handleCaptureComplete = useCallback((uri: string) => {
    setCapturedImage(uri);
    setWorkoutResults([]);
    setRecipeResults([]);
    setEquipmentModalVisible(true);
  }, []);

  const ensureGalleryPermission = async (): Promise<boolean> => {
    if (galleryPerm.state === 'granted') {
      return true;
    }

    const ok = await requestWithTopSnackbar(galleryPerm.request, galleryPerm.refresh, {
      denied: 'Photo library access needed to choose images.',
      granted: 'Photo library access granted',
      stillDenied: 'Still denied. You can enable library access in Settings.',
    });
    return ok;
  };

  const resizeImageIfNeeded = async (uri: string) => {
    try {
      const { uri: outUri } = await compressImage(uri, { maxDimension: MAX_IMAGE_DIMENSION, quality: 0.8 });
      return outUri;
    } catch (error) {
      if (__DEV__) console.warn('Failed to resize image', error);
      return uri;
    }
  };

  const pickImageFromGallery = async () => {
    const granted = await ensureGalleryPermission();
    if (!granted) {
      return;
    }

    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const [asset] = result.assets;
    const uri = await resizeImageIfNeeded(asset.uri);
    setCapturedImage(uri);
    setWorkoutResults([]);
    setRecipeResults([]);
  };

  const handleUploadWorkouts = useCallback(async () => {
    if (!capturedImage) {
      return;
    }

    try {
      setIsProcessing(true);
      const data = await uploadWorkout.mutateAsync({
        uri: capturedImage,
        metadata: equipmentChoice ? { equipment: [equipmentChoice] } : undefined,
      });
      setWorkoutResults(data);
      setActiveTab('workouts');
      setErrorMessage(null);
      // Navigate to Results screen with fresh results
      setCapturedImage(null);
      setEquipmentModalVisible(false);
      navigation.navigate('Results', { workouts: data });
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, uploadWorkout]);

  const handleUploadRecipes = useCallback(async () => {
    if (!capturedImage) {
      return;
    }

    try {
      setIsProcessing(true);
      const data = await uploadRecipe.mutateAsync({ uri: capturedImage });
      setRecipeResults(data);
      setActiveTab('recipes');
      setErrorMessage(null);
      // Navigate to Results with recipes
      setCapturedImage(null);
      setEquipmentModalVisible(false);
      navigation.navigate('Results', { recipes: data });
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, uploadRecipe]);

  const handleToggleWorkout = useCallback(async (id: string) => {
    if (!userId) {
      showSnackbar('请先登录以保存内容', { variant: 'error' });
      return;
    }
    try {
        if (savedWorkoutIds.has(id)) {
          await removeWorkoutMutation.mutateAsync(id);
          setSavedWorkoutIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          showSnackbar('Removed from your workouts', { variant: 'success' });
        } else {
          await saveWorkoutMutation.mutateAsync(id);
          setSavedWorkoutIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
          showSnackbar('Workout saved to your library', { variant: 'success' });
        }
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败，请稍后重试';
      showSnackbar(message, { variant: 'error', actionLabel: 'Retry', onAction: () => handleToggleWorkout(id) });
    }
  }, [removeWorkoutMutation, saveWorkoutMutation, savedWorkoutIds, showSnackbar, userId]);

  const handleToggleRecipe = useCallback(async (id: string) => {
    if (!userId) {
      showSnackbar('请先登录以保存内容', { variant: 'error' });
      return;
    }
    try {
        if (savedRecipeIds.has(id)) {
          await removeRecipeMutation.mutateAsync(id);
          setSavedRecipeIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          showSnackbar('Removed from your recipes', { variant: 'success' });
        } else {
          await saveRecipeMutation.mutateAsync(id);
          setSavedRecipeIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
          showSnackbar('Recipe saved to your library', { variant: 'success' });
        }
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败，请稍后重试';
      showSnackbar(message, { variant: 'error', actionLabel: 'Retry', onAction: () => handleToggleRecipe(id) });
    }
  }, [removeRecipeMutation, saveRecipeMutation, savedRecipeIds, showSnackbar, userId]);

  const shouldShowCamera = cameraPerm.state === 'granted';
  const permissionDenied = cameraPerm.state === 'denied';

  const renderResults = useMemo(() => {
    if (!capturedImage) {
      return null;
    }

    if (isProcessing) {
      return <LoadingState label="Analyzing photo…" />;
    }

    if (errorMessage) {
      return (
        <Card>
          <Text variant="body" color="#F87171">
            {errorMessage}
          </Text>
        </Card>
      );
    }

    const results = activeTab === 'workouts' ? workoutResults : recipeResults;

    if (!results.length) {
      return (
        <Card>
          <Text variant="body" color="rgba(148,163,184,0.9)">
            Select an option above to get personalized {activeTab} based on your photo.
          </Text>
        </Card>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.resultList} showsVerticalScrollIndicator={false}>
        {results.map((item) => {
          const isWorkout = activeTab === 'workouts';
          const isSaved = isWorkout ? savedWorkoutIds.has(item.id) : savedRecipeIds.has(item.id);
          return (
            <Card key={item.id} style={styles.resultCard}>
              <Text variant="heading2" weight="bold">
                {item.title}
              </Text>
              {isWorkout ? (
                <View style={styles.resultMetaRow}>
                  <Text variant="caption">Duration: {formatMinutes((item as WorkoutCard).durationMinutes)}</Text>
                  <Text variant="caption">Level: {(item as WorkoutCard).level.toUpperCase()}</Text>
                  <Text variant="caption">Views: {formatNumber((item as WorkoutCard).viewCount)}</Text>
                </View>
              ) : (
                <View style={styles.resultMetaRow}>
                  <Text variant="caption">Time: {formatMinutes((item as RecipeCard).timeMinutes)}</Text>
                  <Text variant="caption">Difficulty: {formatDifficulty((item as RecipeCard).difficulty)}</Text>
                </View>
              )}
              <Button
                title={isSaved ? 'Saved' : 'Save'}
                variant={isSaved ? 'outline' : 'secondary'}
                onPress={() => (isWorkout ? handleToggleWorkout(item.id) : handleToggleRecipe(item.id))}
              />
              {isSaved && (
                <Text variant="caption" style={styles.savedTag}>已保存到你的收藏</Text>
              )}
            </Card>
          );
        })}
      </ScrollView>
    );
  }, [
    activeTab,
    capturedImage,
    errorMessage,
    handleToggleRecipe,
    handleToggleWorkout,
    isProcessing,
    recipeResults,
    savedRecipeIds,
    savedWorkoutIds,
    workoutResults,
  ]);

  if (!cameraPerm.permission) {
    return (
      <SafeAreaWrapper>
        <LoadingState label="Requesting camera permission…" />
      </SafeAreaWrapper>
    );
  }

  if (!shouldShowCamera) {
    // Render an empty shell with Material Dialog on top
    return (
      <SafeAreaWrapper>
        <Container>
          <PermissionDialog
            visible
            onRequestPermission={handleRequestCamera}
            onOpenSettings={async () => {
              // mirror the dialog open-settings flow with the helper
              await requestWithTopSnackbar(
                async () => ({ status: 'denied' as const }),
                cameraPerm.refresh,
                {
                  denied: 'Opening settings…',
                  granted: 'Camera access granted',
                  stillDenied: 'Still denied. You can enable camera in Settings.',
                },
              );
            }}
            onChooseGallery={pickImageFromGallery}
            permissionDenied={permissionDenied}
          />
        </Container>
      </SafeAreaWrapper>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        guideText="Frame your equipment or ingredients"
        onCapture={handleCaptureComplete}
        processing={isProcessing || uploadWorkout.isPending || uploadRecipe.isPending}
        onGalleryPress={pickImageFromGallery}
      />
      <EquipmentSelectionModal
        visible={!!capturedImage && !isProcessing && equipmentModalVisible}
        lastChoice={equipmentChoice ?? null}
        onSelect={(choice) => {
          setEquipmentChoice(choice);
          preferenceStorage.equipment.save(choice).catch(() => undefined);
          setEquipmentModalVisible(false);
        }}
        onSkip={() => {
          setEquipmentModalVisible(false);
        }}
        onRequestClose={() => setEquipmentModalVisible(false)}
      />
      {capturedImage && (
        <SafeAreaWrapper style={styles.resultsWrapper}>
          <Container style={styles.resultsContainer}>
            <Image source={{ uri: capturedImage }} style={styles.thumbnail} />
            <View style={styles.actionsRow}>
              <Button title="Find Workouts" onPress={handleUploadWorkouts} loading={uploadWorkout.isPending} />
              <Button
                title="Find Recipes"
                variant="secondary"
                onPress={handleUploadRecipes}
                loading={uploadRecipe.isPending}
              />
            </View>
            <View style={styles.equipmentRow}>
              <Text variant="caption" style={{ opacity: 0.9 }}>
                {equipmentChoice ? `Equipment: ${equipmentChoice}` : 'Equipment: (not set)' }
              </Text>
              <Button title="Change" variant="outline" size="small" onPress={() => setEquipmentModalVisible(true)} />
            </View>
            <View style={styles.tabRow}>
              <Button
                title="Workouts"
                variant={activeTab === 'workouts' ? 'primary' : 'ghost'}
                onPress={() => setActiveTab('workouts')}
              />
              <Button
                title="Recipes"
                variant={activeTab === 'recipes' ? 'primary' : 'ghost'}
                onPress={() => setActiveTab('recipes')}
              />
            </View>
            {renderResults}
          </Container>
        </SafeAreaWrapper>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#000',
  },
  resultsWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  resultsContainer: {
    backgroundColor: 'rgba(10, 12, 26, 0.95)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 32,
    gap: 16,
  },
  thumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: '#0f172a',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 12,
  },
  resultList: {
    gap: 16,
    paddingBottom: 120,
  },
  resultCard: {
    gap: 8,
  },
  resultMetaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  savedTag: {
    marginTop: spacing.xs,
    color: '#f97316',
    opacity: 0.85,
  },
});
