import * as ImagePicker from 'expo-image-picker';
import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';

import {
    Button,
    CameraView,
    Card,
    Container,
    LoadingState,
    SafeAreaWrapper,
    Text,
    useSnackbar,
} from '@/components';
import { PermissionRequestModal, PermissionType } from '@/components/common/PermissionRequestModal';
import { EquipmentChoice, EquipmentSelectionModal } from '@/components/EquipmentSelectionModal';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useGalleryPermission } from '@/hooks/useGalleryPermission';
import { preferenceStorage, useSaveRecipe, useSaveWorkout, useUploadRecipe, useUploadWorkout } from '@/services';
import { RecipeCard, WorkoutCard } from '@/types';
import { compressImage, formatDifficulty, formatMinutes, formatNumber } from '@/utils';
import { getFriendlyErrorMessage } from '@/utils/errors';
import { useNavigation } from '@react-navigation/native';

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
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const hasRequestedCameraPermissionRef = useRef(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>('workouts');
  const [isProcessing, setIsProcessing] = useState(false);
  const [equipmentModalVisible, setEquipmentModalVisible] = useState(false);
  const [equipmentChoice, setEquipmentChoice] = useState<EquipmentChoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadWorkout = useUploadWorkout();
  const uploadRecipe = useUploadRecipe();
  const saveWorkoutMutation = useSaveWorkout(userId);
  const saveRecipeMutation = useSaveRecipe(userId);

  const [workoutResults, setWorkoutResults] = useState<WorkoutCard[]>([]);
  const [recipeResults, setRecipeResults] = useState<RecipeCard[]>([]);

  // Apple HIG pre-permission modal state
  const [permissionModal, setPermissionModal] = useState<{ visible: boolean; type: PermissionType; action: 'camera' | 'gallery' }>({
    visible: false, type: 'camera', action: 'camera',
  });

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

  // Show pre-permission modal when camera permission is undetermined (Apple HIG)
  // No longer auto-requests — user must acknowledge the modal first
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (cameraPerm.state === 'undetermined' && !hasRequestedCameraPermissionRef.current) {
      setPermissionModal({ visible: true, type: 'camera', action: 'camera' });
    }
  }, [cameraPerm.state]);

  const handlePermissionAllowed = async () => {
    const action = permissionModal.action;
    setPermissionModal((p) => ({ ...p, visible: false }));

    if (action === 'camera') {
      hasRequestedCameraPermissionRef.current = true;
      cameraPerm.request().catch((error) => {
        console.warn('Camera permission request failed', error);
        hasRequestedCameraPermissionRef.current = false;
      });
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
      await doPickImageFromGallery();
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

  const resizeImageIfNeeded = async (uri: string) => {
    try {
      const { uri: outUri } = await compressImage(uri, { maxDimension: MAX_IMAGE_DIMENSION, quality: 0.8 });
      return outUri;
    } catch (error) {
      if (__DEV__) console.warn('Failed to resize image', error);
      return uri;
    }
  };

  /** Actual gallery picking logic (called after permission is granted) */
  const doPickImageFromGallery = async () => {
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

  /** Show pre-permission modal before gallery access */
  const pickImageFromGallery = async () => {
    if (Platform.OS !== 'web' && galleryPerm.state !== 'granted') {
      setPermissionModal({ visible: true, type: 'photoLibrary', action: 'gallery' });
      return;
    }
    // On web, show modal too (explain before proceeding)
    if (Platform.OS === 'web') {
      setPermissionModal({ visible: true, type: 'photoLibrary', action: 'gallery' });
      return;
    }
    await doPickImageFromGallery();
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

  const handleSaveWorkout = useCallback(
    async (id: string) => {
      if (!userId) {
        showSnackbar('Please log in to save content', { variant: 'error' });
        return;
      }
      try {
        await saveWorkoutMutation.mutateAsync(id);
        showSnackbar('Workout saved to your library', { variant: 'success' });
      } catch (error) {
        showSnackbar(
          error instanceof Error ? error.message : 'Unable to save workout. Try again later.',
          { variant: 'error', actionLabel: 'Retry', onAction: () => handleSaveWorkout(id) },
        );
      }
    },
    [saveWorkoutMutation, showSnackbar, userId],
  );

  const handleSaveRecipe = useCallback(
    async (id: string) => {
      if (!userId) {
        showSnackbar('Please log in to save content', { variant: 'error' });
        return;
      }
      try {
        await saveRecipeMutation.mutateAsync(id);
        showSnackbar('Recipe saved to your library', { variant: 'success' });
      } catch (error) {
        showSnackbar(
          error instanceof Error ? error.message : 'Unable to save recipe. Try again later.',
          { variant: 'error', actionLabel: 'Retry', onAction: () => handleSaveRecipe(id) },
        );
      }
    },
    [saveRecipeMutation, showSnackbar, userId],
  );

  // On web, camera is not available — always show gallery-based flow
  const shouldShowCamera = Platform.OS !== 'web' && cameraPerm.state === 'granted';

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

  if (!cameraPerm.permission && Platform.OS !== 'web') {
    return (
      <SafeAreaWrapper>
        <LoadingState label="Checking camera permission…" />
        <PermissionRequestModal
          visible={permissionModal.visible}
          permissionType={permissionModal.type}
          onAllow={handlePermissionAllowed}
          onCancel={() => {
            setPermissionModal((p) => ({ ...p, visible: false }));
            navigation.navigate('Main', { screen: 'Dashboard' });
          }}
        />
      </SafeAreaWrapper>
    );
  }

  if (!shouldShowCamera) {
    if (cameraPerm.state === 'undetermined' && Platform.OS !== 'web') {
      // Show pre-permission modal (Apple HIG) instead of auto-requesting
      return (
        <SafeAreaWrapper>
          <Container style={styles.permissionFallback}>
            <Card style={styles.permissionFallbackCard}>
              <Text variant="heading2" weight="bold">
                Camera access
              </Text>
              <Text variant="body" color="rgba(71,85,105,0.94)">
                Grant camera access to capture equipment or ingredients for AI-powered recommendations.
              </Text>
            </Card>
          </Container>
          <PermissionRequestModal
            visible={permissionModal.visible}
            permissionType={permissionModal.type}
            onAllow={handlePermissionAllowed}
            onCancel={() => {
              setPermissionModal((p) => ({ ...p, visible: false }));
              navigation.navigate('Main', { screen: 'Dashboard' });
            }}
          />
        </SafeAreaWrapper>
      );
    }

    // On web, show gallery prompt with pre-permission modal
    if (Platform.OS === 'web') {
      return (
        <SafeAreaWrapper>
          <Container style={styles.permissionFallback}>
            <Card style={styles.permissionFallbackCard}>
              <Text variant="heading2" weight="bold">
                Choose a photo
              </Text>
              <Text variant="body" color="rgba(71,85,105,0.94)">
                Select a photo of equipment or ingredients from your device to get started.
              </Text>
              <View style={styles.permissionFallbackActions}>
                <Button title="Choose from Library" onPress={pickImageFromGallery} />
              </View>
            </Card>
          </Container>
          <PermissionRequestModal
            visible={permissionModal.visible}
            permissionType={permissionModal.type}
            onAllow={handlePermissionAllowed}
            onCancel={() => setPermissionModal((p) => ({ ...p, visible: false }))}
          />
        </SafeAreaWrapper>
      );
    }

    return (
      <SafeAreaWrapper>
        <Container style={styles.permissionFallback}>
          <Card style={styles.permissionFallbackCard}>
            <Text variant="heading2" weight="bold">
              Camera access is off
            </Text>
            <Text variant="body" color="rgba(71,85,105,0.94)">
              Enable camera access in Settings to capture equipment or ingredients, or choose a photo from your library.
            </Text>
            <View style={styles.permissionFallbackActions}>
              <Button title="Open Settings" onPress={openSettings} />
              <Button title="Choose from Library" variant="secondary" onPress={pickImageFromGallery} />
            </View>
          </Card>
        </Container>
        <PermissionRequestModal
          visible={permissionModal.visible}
          permissionType={permissionModal.type}
          onAllow={handlePermissionAllowed}
          onCancel={() => setPermissionModal((p) => ({ ...p, visible: false }))}
        />
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
      {/* Apple HIG pre-permission modal — gallery access from camera view */}
      <PermissionRequestModal
        visible={permissionModal.visible}
        permissionType={permissionModal.type}
        onAllow={handlePermissionAllowed}
        onCancel={() => setPermissionModal((p) => ({ ...p, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionFallback: {
    flex: 1,
    justifyContent: 'center',
  },
  permissionFallbackCard: {
    gap: 16,
  },
  permissionFallbackActions: {
    gap: 12,
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
});
