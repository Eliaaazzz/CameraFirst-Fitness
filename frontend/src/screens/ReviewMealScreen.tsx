import { DetectedItemRow } from '@/components/nutrition/DetectedItemRow';
import { NutritionSummaryCard } from '@/components/nutrition/NutritionSummaryCard';
import { CameraView } from '@/components/CameraView';
import useImageCompressor from '@/hooks/useImageCompressor';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import nutritionApi, {
  DetectedFood,
  TotalNutrition,
} from '@/services/nutritionApi';
import { DEFAULT_MEAL_IMAGE_WIDTH_CM } from '@/utils';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Merge duplicate food items by name, combining their nutritional values.
 * Example: 8 "Fried Chicken" items become 1 item with amount=8 and summed nutrition.
 */
function mergeDuplicateFoods(foods: DetectedFood[]): DetectedFood[] {
  const merged = new Map<string, DetectedFood>();

  for (const food of foods) {
    const key = food.name.toLowerCase().trim();
    const existing = merged.get(key);

    if (existing) {
      // Merge: sum nutrition values and increment amount
      merged.set(key, {
        ...existing,
        amount: existing.amount + (food.amount || 1),
        calories: existing.calories + food.calories,
        protein: existing.protein + food.protein,
        carbs: existing.carbs + food.carbs,
        fat: existing.fat + food.fat,
      });
    } else {
      // First occurrence: clone with amount defaulting to 1
      merged.set(key, {
        ...food,
        amount: food.amount || 1,
        unit: food.unit || 'piece',
      });
    }
  }

  return Array.from(merged.values());
}
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const SUCCESS_GRADIENT = ['#A78BFA', '#F472B6'] as const;

export function ReviewMealScreen({ route, navigation }: any) {
  // Support both new image analysis and viewing/editing saved meals
  const { imageUri, meal, openCamera, imgWcm } = route.params ?? {};
  const isViewingExisting = !!meal;
  const shouldShowCamera = !!openCamera && !imageUri && !isViewingExisting;

  const cameraPerm = useCameraPermission();
  const scaleHintCm = typeof imgWcm === 'number' ? imgWcm : DEFAULT_MEAL_IMAGE_WIDTH_CM;

  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(!isViewingExisting); // Don't show loading for existing meals
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [items, setItems] = useState<DetectedFood[]>(() => {
    // Initialize with existing meal data if viewing
    if (meal?.foodItems) {
      const rawItems = meal.foodItems.map((food: any, index: number) => ({
        id: food.foodKey || `item-${index}`,
        name: food.displayName,
        amount: 1, // Each record represents 1 item
        unit: 'piece',
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        confidence: food.confidence,
      }));
      // Merge duplicate items (e.g., 8 "Fried Chicken" -> 1 item with amount=8)
      return mergeDuplicateFoods(rawItems);
    }
    return [];
  });
  const [total, setTotal] = useState<TotalNutrition | null>(() => {
    // Initialize with existing meal totals if viewing
    if (meal) {
      return {
        calories: meal.totalCalories || 0,
        protein: meal.totalProtein || 0,
        carbs: meal.totalCarbs || 0,
        fat: meal.totalFat || 0,
      };
    }
    return null;
  });
  const [processedImageUri, setProcessedImageUri] = useState<string>(imageUri || meal?.imageUrl || '');
  const [serverImageUrl, setServerImageUrl] = useState<string | undefined>(meal?.imageUrl || undefined);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successAnim] = useState(new Animated.Value(0));
  const [retryCount, setRetryCount] = useState(0);
  const [mealId] = useState<number | undefined>(meal?.id);
  const MAX_RETRIES = 3;
  const contentMaxWidth = Platform.OS === 'web' ? 760 : viewportWidth;
  const previewWidth = Math.max(0, Math.min(viewportWidth - 32, contentMaxWidth - 32));
  const imagePreviewHeight = Math.max(
    220,
    Math.min(
      Math.round(previewWidth * 0.75),
      Platform.OS === 'web' ? Math.round(viewportHeight * 0.38) : Math.round(viewportHeight * 0.42)
    )
  );

  // High-performance image compression (Web Worker on web, expo-image-manipulator on native)
  // Keep uploads close to the backend's 1024px optimization target.
  // Portion/scale reasoning still uses img_w_cm metadata, so smaller images do not remove the
  // 3D volume estimate path.
  const { compress: compressImage } = useImageCompressor({
    defaultOptions: {
      maxDimension: 1024,
      quality: 0.76,
      targetSize: 900_000,
    },
  });

  useEffect(() => {
    // Skip analysis if viewing existing meal
    if (isViewingExisting) {
      return;
    }

    // Wait until we have an image URI (camera capture / gallery pick)
    if (!imageUri) {
      return;
    }

    // Reset all state when imageUri changes (new photo taken)
    setLoading(true);
    setPhase(1);
    setItems([]);
    setTotal(null);
    setSaving(false);
    setProcessedImageUri(imageUri);
    setServerImageUrl(undefined);

    setShowSuccess(false);
    successAnim.setValue(0);

    // Animation phases: 1 → 2 → 3, then stays on 3 until analysis completes
    // Each phase lasts 1.5 seconds, completing one full cycle in 4.5 seconds
    let isCancelled = false;
    const PHASE_DURATION = 1500; // 1.5 seconds per phase

    const timer1 = setTimeout(() => {
      if (!isCancelled) setPhase(2);
    }, PHASE_DURATION);

    const timer2 = setTimeout(() => {
      if (!isCancelled) setPhase(3);
    }, PHASE_DURATION * 2);

    const analyze = async () => {
      try {
        let uploadUri = imageUri;

        // Compress the image using off-main-thread processing
        // This keeps the analyzing animation smooth at 60fps even for 4K photos
        try {
          console.log('[ReviewMealScreen] Starting off-thread compression...');
          const compressed = await compressImage(imageUri);
          console.log('[ReviewMealScreen] Compression complete:', {
            originalSize: compressed.originalSize,
            compressedSize: compressed.size,
            ratio: (compressed.ratio * 100).toFixed(1) + '%',
            duration: compressed.duration.toFixed(0) + 'ms',
          });

          // Use the compressed URI for upload
          if (compressed.uri) {
            uploadUri = compressed.uri;
            setProcessedImageUri(compressed.uri);
          }
        } catch (compressionError) {
          console.warn('Image compression failed, using original image', compressionError);
        }

        const response = await nutritionApi.analyzeFoodImage(uploadUri, { img_w_cm: scaleHintCm });

        // Only update state if not cancelled (component still mounted)
        if (!isCancelled) {
          setItems(response.items);
          setTotal(response.totalNutrition);
          setServerImageUrl(response.imageUrl);
          setLoading(false);
        }
      } catch (error: any) {
        // Don't show error if cancelled
        if (isCancelled) return;

        console.error('Food analysis failed:', error);

        // Parse error message for user-friendly display
        let errorTitle = 'Analysis Failed';
        let errorMessage = 'Failed to analyze the image. Please try again.';

        const errorString = error?.message || error?.data?.message || String(error);

        if (errorString.includes('too large') || errorString.includes('10MB')) {
          errorTitle = 'Image Too Large';
          errorMessage = 'The image is too large. Please take a photo with lower resolution or try a different image.';
        } else if (errorString.includes('providers failed') || errorString.includes('recognize foods')) {
          errorTitle = 'Recognition Failed';
          errorMessage = 'Could not recognize food in this image. Please try:\n\n• Taking a clearer photo\n• Ensuring good lighting\n• Capturing the food from above\n• Making sure food is visible';
        } else if (errorString.includes('Network') || errorString.includes('fetch') || errorString.includes('CONNECTION')) {
          errorTitle = 'Connection Error';
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        } else if (errorString.includes('timeout') || errorString.includes('408')) {
          errorTitle = 'Request Timeout';
          errorMessage = 'The analysis is taking too long. Please try again with a smaller image.';
        }

        setLoading(false);

        const canRetry = retryCount < MAX_RETRIES;

        Alert.alert(errorTitle, errorMessage, [
          ...(canRetry ? [{
            text: `Try Again (${MAX_RETRIES - retryCount} left)`,
            onPress: () => {
              // Reset and retry
              setRetryCount(prev => prev + 1);
            },
          }] : []),
          {
            text: 'Go Back',
            style: 'cancel',
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Main', { screen: 'Dashboard' });
              }
            },
          },
        ]);
      }
    };

    analyze();

    return () => {
      // Cleanup: cancel animation timers if component unmounts
      isCancelled = true;
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [imageUri, retryCount, isViewingExisting]);

  const openGallery = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Gallery permission is required');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      navigation.setParams({ imageUri: result.assets[0].uri, openCamera: false, imgWcm: scaleHintCm });
    } catch (err) {
      console.error('Gallery pick failed', err);
      Alert.alert('Error', 'Could not open gallery: ' + (err as Error)?.message);
    }
  };

  if (shouldShowCamera) {
    const permissionDenied = cameraPerm.state === 'denied';
    const permissionGranted = cameraPerm.state === 'granted';

    if (!permissionGranted) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionSubtitle}>
              Enable camera to scan your meal with the Magic Ring.
            </Text>

            <Pressable
              onPress={permissionDenied ? cameraPerm.openSettings : () => cameraPerm.request()}
              style={styles.permissionPrimaryBtn}
            >
              <Text style={styles.permissionPrimaryBtnText}>
                {permissionDenied ? 'Open Settings' : 'Allow Camera'}
              </Text>
            </Pressable>

            <Pressable onPress={openGallery} style={styles.permissionSecondaryBtn}>
              <Text style={styles.permissionSecondaryBtnText}>Choose from Gallery</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (navigation.canGoBack()) navigation.goBack();
                else navigation.navigate('Main', { screen: 'Dashboard' });
              }}
              style={styles.permissionTertiaryBtn}
            >
              <Text style={styles.permissionTertiaryBtnText}>Not now</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          onCapture={(uri) => navigation.setParams({ imageUri: uri, openCamera: false, imgWcm: scaleHintCm })}
          onCancel={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('Main', { screen: 'Dashboard' });
          }}
          onGalleryPress={openGallery}
          guideText="Align food here"
          processing={false}
          showReticle
          captureButtonVariant="glass"
          autoUsePhoto
        />
      </View>
    );
  }

  const handleAmountChange = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newAmount = Math.max(0, item.amount + delta);
          const ratio = newAmount / item.amount;

          return {
            ...item,
            amount: newAmount,
            calories: item.calories * ratio,
            protein: item.protein * ratio,
            carbs: item.carbs * ratio,
            fat: item.fat * ratio,
            fiber: item.fiber ? item.fiber * ratio : undefined,
            sugar: item.sugar ? item.sugar * ratio : undefined,
          };
        }
        return item;
      })
    );

    // Recalculate total
    const newTotal = items.reduce(
      (acc, item) => {
        if (item.id === id) {
          const newAmount = Math.max(0, item.amount + delta);
          const ratio = newAmount / item.amount;
          const deltaSugar = item.sugar ? item.sugar * (ratio - 1) : 0;
          const deltaFiber = item.fiber ? item.fiber * (ratio - 1) : 0;
          const newSugar = (acc.sugar || 0) + deltaSugar;
          const newFiber = (acc.fiber || 0) + deltaFiber;
          return {
            calories: acc.calories + item.calories * (ratio - 1),
            protein: acc.protein + item.protein * (ratio - 1),
            carbs: acc.carbs + item.carbs * (ratio - 1),
            fat: acc.fat + item.fat * (ratio - 1),
            fiber: newFiber > 0 ? newFiber : undefined,
            sugar: newSugar > 0 ? newSugar : undefined,
            sugarCubes: newSugar > 0 ? newSugar / 4 : undefined,
            netCarbs: acc.carbs + item.carbs * (ratio - 1) - newFiber,
          };
        }
        return acc;
      },
      total || { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    setTotal(newTotal);
  };

  const handleSave = async () => {
    if (!total) return;

    setSaving(true);
    try {
      if (isViewingExisting && mealId) {
        // Update existing meal
        await nutritionApi.updateMeal(mealId, {
          imageUri: processedImageUri,
          items: items,
          totalNutrition: total,
          imageUrl: serverImageUrl || processedImageUri,
          mealType: meal?.mealType,
        });

        // Invalidate caches so data refreshes
        queryClient.invalidateQueries({ queryKey: ['dailyNutrition'] });
        queryClient.invalidateQueries({ queryKey: ['meal-history'] });
        queryClient.invalidateQueries({ queryKey: ['weekly-insights'] });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Navigate back immediately for updates (no success animation needed)
        setSaving(false);
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Main', { screen: 'Dashboard' });
        }
        return;
      }

      await nutritionApi.saveMealFromImage({
        imageUri: processedImageUri,
        items: items,
        totalNutrition: total,
        // Prefer server URL if upload succeeded; otherwise fall back to local processed image
        imageUrl: serverImageUrl || processedImageUri,
      });

      // Invalidate caches so dashboard, meal log, and insights refresh immediately
      queryClient.invalidateQueries({ queryKey: ['dailyNutrition'] });
      queryClient.invalidateQueries({ queryKey: ['meal-history'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-insights'] });
      // Note: Streak is now updated on login (via /me endpoint), not on meal logging

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show success animation
      setShowSuccess(true);
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(800),
      ]).start(() => {
        // Navigate to Dashboard after animation
        navigation.navigate('Main', { screen: 'Dashboard' });
      });
    } catch (error) {
      console.error('Save failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const status = typeof (error as any)?.status === 'number' ? (error as any).status : undefined;

      let title = 'Save failed';
      let message = 'Failed to save meal. Please try again.';

      if (status === 401 || status === 403 || errorMessage.includes('session has expired')) {
        title = 'Sign in required';
        message = 'Your session is no longer valid. Please sign in again, then retry saving this meal.';
      } else if (status === 408 || errorMessage.toLowerCase().includes('timeout')) {
        title = 'Save timed out';
        message = 'The server took too long to save this meal. This usually points to a backend issue rather than the photo itself. Please retry in a moment.';
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        title = 'Connection error';
        message = 'Could not reach the server while saving. Check your connection and try again.';
      }

      Alert.alert(title, message);
      setSaving(false);
    }
  };

  const loadingText =
    phase === 1
      ? 'Detecting food…'
      : phase === 2
      ? 'Estimating 3D portion volume…'
      : 'Calculating nutrition…';
  const loadingSubtitle =
    phase === 1
      ? 'Reading the visible ingredients and dish boundaries.'
      : phase === 2
      ? 'Using plate scale to estimate depth and portion size.'
      : 'Turning the portion estimate into calories and macros.';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Main', { screen: 'Dashboard' });
            }
          }} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>{isViewingExisting ? 'Meal Details' : 'Review your meal'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={[styles.scrollView, Platform.OS === 'web' && styles.scrollViewWeb]}
        contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        <View style={[styles.reviewBody, { maxWidth: contentMaxWidth }]}>
          <View style={[styles.imageContainer, { height: imagePreviewHeight }]}>
            <Image source={{ uri: processedImageUri }} style={styles.image} resizeMode="cover" />
            {loading && (
              <View style={styles.imageLoadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.imageLoadingTitle}>{loadingText}</Text>
                <Text style={styles.imageLoadingSubtitle}>{loadingSubtitle}</Text>
              </View>
            )}
            <View style={styles.photoTag}>
              <Text style={styles.photoTagText}>Photo</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#9C27B0" />
              <View style={styles.loadingCopy}>
                <Text style={styles.loadingTitle}>{loadingText}</Text>
                <Text style={styles.loadingSubtitle}>{loadingSubtitle}</Text>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Detected items</Text>
              {items.map((item) => (
                <DetectedItemRow
                  key={item.id}
                  item={item}
                  onIncrease={() => handleAmountChange(item.id, 1)}
                  onDecrease={() => handleAmountChange(item.id, -1)}
                />
              ))}

              {total && <NutritionSummaryCard total={total} />}
            </>
          )}
        </View>
      </ScrollView>

      {/* Hide save button when viewing existing meal details */}
      {!loading && !showSuccess && !isViewingExisting && (
        <View style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save to today</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Success Animation Overlay - 淡粉色弹窗 */}
      {showSuccess && total && (
        <Pressable
          style={[
            styles.successOverlay,
            {
              opacity: successAnim,
            },
          ]}
          onPress={() => {
            // Allow tap to dismiss and navigate
            setShowSuccess(false);
            navigation.navigate('Main', { screen: 'Dashboard' });
          }}
        >
          <Animated.View
            style={[
              styles.successCard,
              {
                transform: [
                  {
                    scale: successAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={SUCCESS_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.successHeader}
            />

            <View style={styles.successBody}>
              <View style={styles.successIconCircle}>
                <MaterialCommunityIcons name="check" size={44} color="#7C3AED" />
              </View>
              <Text style={styles.successTitle}>Meal Saved!</Text>
              <View style={styles.successStats}>
                <View style={styles.successStatItem}>
                  <Text style={styles.successStatValue}>+{Math.round(total.calories)}</Text>
                  <Text style={styles.successStatLabel}>kcal</Text>
                </View>
                <View style={styles.successStatDivider} />
                <View style={styles.successStatItem}>
                  <Text style={styles.successStatValue}>+{Math.round(total.protein)}g</Text>
                  <Text style={styles.successStatLabel}>protein</Text>
                </View>
                <View style={styles.successStatDivider} />
                <View style={styles.successStatItem}>
                  <Text style={styles.successStatValue}>+{Math.round(total.carbs)}g</Text>
                  <Text style={styles.successStatLabel}>carbs</Text>
                </View>
              </View>
              <Text style={styles.successSubtitle}>Added to today's nutrition</Text>
              <Text style={styles.successTapHint}>Tap anywhere to continue</Text>
            </View>
          </Animated.View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionPrimaryBtn: {
    width: '100%',
    maxWidth: 360,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  permissionPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  permissionSecondaryBtn: {
    width: '100%',
    maxWidth: 360,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionSecondaryBtnText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionTertiaryBtn: {
    paddingVertical: 10,
  },
  permissionTertiaryBtnText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flexGrow: 1,
    paddingBottom: 120, // Extra space for absolute positioned bottom bar
  },
  reviewBody: {
    width: '100%',
    alignSelf: 'center',
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  scrollViewWeb: {
    height: 0,
    minHeight: 0,
    overflow: 'auto',
    overflowX: 'hidden',
    overflowY: 'auto',
    touchAction: 'pan-y',
    WebkitOverflowScrolling: 'touch',
  } as any,
  imageContainer: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#111827',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(17,24,39,0.42)',
  },
  imageLoadingTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  imageLoadingSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
  },
  photoTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  photoTagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  // Loading styles - purple spinner
  loadingContainer: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5D5FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  loadingCopy: {
    flex: 1,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
  },
  loadingSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  saveButton: {
    backgroundColor: '#9C27B0',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  // Success overlay styles - 淡粉色弹窗
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  successCard: {
    width: '85%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  successHeader: {
    height: 72,
    width: '100%',
  },
  successBody: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#7C3AED',
    marginTop: 4,
  },
  successStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderRadius: 16,
    padding: 12,
  },
  successStatItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  successStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#7C3AED',
  },
  successStatLabel: {
    fontSize: 12,
    color: '#6C6A7E',
    marginTop: 2,
  },
  successStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(124,58,237,0.2)',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6C6A7E',
    marginTop: 8,
  },
  successTapHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 16,
  },
});
