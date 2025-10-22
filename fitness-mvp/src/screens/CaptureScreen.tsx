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
import { formatDifficulty, formatMinutes, formatNumber, compressImage, getFileSize } from '@/utils';
import { permissionStorage, preferenceStorage, useSaveRecipe, useSaveWorkout, useSavedRecipes, useSavedWorkouts, useUploadRecipe, useUploadWorkout } from '@/services';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { useGalleryPermission } from '@/hooks/useGalleryPermission';
import { EquipmentSelectionModal, EquipmentChoice } from '@/components/EquipmentSelectionModal';
import { PermissionExplanationScreen } from './PermissionExplanationScreen';
import { RecipeCard, WorkoutCard } from '@/types';

const MAX_IMAGE_DIMENSION = 1024;

type PermissionState = 'granted' | 'denied' | 'undetermined';

type ResultTab = 'workouts' | 'recipes';

const measureImage = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), (error) => reject(error));
  });

export const CaptureScreen = () => {
  const cameraPerm = useCameraPermission();
  const galleryPerm = useGalleryPermission();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>('workouts');
  const [isProcessing, setIsProcessing] = useState(false);
  const [equipmentModalVisible, setEquipmentModalVisible] = useState(false);
  const [equipmentChoice, setEquipmentChoice] = useState<EquipmentChoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadWorkout = useUploadWorkout();
  const uploadRecipe = useUploadRecipe();
  const saveWorkoutMutation = useSaveWorkout();
  const saveRecipeMutation = useSaveRecipe();
  const savedWorkoutsQuery = useSavedWorkouts();
  const savedRecipesQuery = useSavedRecipes();

  const [workoutResults, setWorkoutResults] = useState<WorkoutCard[]>([]);
  const [recipeResults, setRecipeResults] = useState<RecipeCard[]>([]);

  useEffect(() => {
    // hydrate last equipment selection
    preferenceStorage.equipment.read().then((val) => {
      if (val) setEquipmentChoice(val);
    });
  }, []);

  const handleRequestCamera = async () => {
    const response = await cameraPerm.request();
    if (response?.status === 'granted') {
      setErrorMessage(null);
    }
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
    if (galleryPermission?.status === 'granted') {
      return true;
    }

    const response = await galleryPerm.request();
    if (response?.status !== 'granted') {
      Alert.alert(
        'Gallery permission needed',
        'We need photo library access so you can pick existing photos of your equipment or ingredients.',
      );
      return false;
    }

    return true;
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to fetch workouts.');
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to fetch recipes.');
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, uploadRecipe]);

  const handleSaveWorkout = useCallback(
    async (id: string) => {
      try {
        await saveWorkoutMutation.mutateAsync(id);
        savedWorkoutsQuery.refetch();
        Alert.alert('Saved', 'Workout saved to your library.');
      } catch (error) {
        Alert.alert('Unable to save workout', error instanceof Error ? error.message : 'Try again later.');
      }
    },
    [saveWorkoutMutation, savedWorkoutsQuery],
  );

  const handleSaveRecipe = useCallback(
    async (id: string) => {
      try {
        await saveRecipeMutation.mutateAsync(id);
        savedRecipesQuery.refetch();
        Alert.alert('Saved', 'Recipe saved to your library.');
      } catch (error) {
        Alert.alert('Unable to save recipe', error instanceof Error ? error.message : 'Try again later.');
      }
    },
    [saveRecipeMutation, savedRecipesQuery],
  );

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
        {results.map((item) => (
          <Card key={item.id} style={styles.resultCard}>
            <Text variant="heading2" weight="bold">
              {item.title}
            </Text>
            {activeTab === 'workouts' ? (
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
              title="Save"
              variant="secondary"
              onPress={() => (activeTab === 'workouts' ? handleSaveWorkout(item.id) : handleSaveRecipe(item.id))}
            />
          </Card>
        ))}
      </ScrollView>
    );
  }, [activeTab, capturedImage, errorMessage, handleSaveRecipe, handleSaveWorkout, isProcessing, recipeResults, workoutResults]);

  if (!cameraPermission) {
    return (
      <SafeAreaWrapper>
        <LoadingState label="Requesting camera permission…" />
      </SafeAreaWrapper>
    );
  }

  if (!shouldShowCamera) {
    return (
      <PermissionExplanationScreen
        onRequestPermission={handleRequestCamera}
        onOpenSettings={openSettings}
        onChooseGallery={pickImageFromGallery}
        permissionDenied={permissionDenied}
      />
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
});
