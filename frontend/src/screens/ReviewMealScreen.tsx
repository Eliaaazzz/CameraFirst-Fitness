import { DetectedItemRow } from '@/components/nutrition/DetectedItemRow';
import { NutritionSummaryCard } from '@/components/nutrition/NutritionSummaryCard';
import nutritionApi, {
  DetectedFood,
  TotalNutrition,
} from '@/services/nutritionApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImageManipulator from 'expo-image-manipulator';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const SUCCESS_GRADIENT = ['#A78BFA', '#F472B6'] as const;

export function ReviewMealScreen({ route, navigation }: any) {
  const { imageUri } = route.params;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [items, setItems] = useState<DetectedFood[]>([]);
  const [total, setTotal] = useState<TotalNutrition | null>(null);
  const [processedImageUri, setProcessedImageUri] = useState<string>(imageUri);
  const [serverImageUrl, setServerImageUrl] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successAnim] = useState(new Animated.Value(0));

  useEffect(() => {
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

    const timer1 = setTimeout(() => setPhase(2), 1200);
    const timer2 = setTimeout(() => setPhase(3), 2400);

    const analyze = async () => {
      try {
        let uploadUri = imageUri;

        // Compress the image before upload/analysis to reduce payload size
        try {
          const manipulateResult = await ImageManipulator.manipulateAsync(
            imageUri,
            [
              // Limit width to 800px while keeping aspect ratio for faster upload/render
              { resize: { width: 800 } },
            ],
            {
              compress: 0.7, // 70% quality
              format: ImageManipulator.SaveFormat.JPEG,
            },
          );
          uploadUri = manipulateResult.uri;
          setProcessedImageUri(manipulateResult.uri);
        } catch (compressionError) {
          console.warn('Image compression failed, using original image', compressionError);
        }

        const response = await nutritionApi.analyzeFoodImage(uploadUri);
        setItems(response.items);
        setTotal(response.totalNutrition);
        setServerImageUrl(response.imageUrl);
      } catch (error) {
        console.error('Food analysis failed:', error);
        Alert.alert('Error', 'Failed to analyze the image. Please try again.');
        // Navigate back if possible, otherwise go to Dashboard
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Dashboard');
        }
      } finally {
        setLoading(false);
        clearTimeout(timer1);
        clearTimeout(timer2);
      }
    };

    analyze();

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [imageUri]);

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
        navigation.navigate('Dashboard');
      });
    } catch (error) {
      console.error('Save failed:', error);
      Alert.alert('Error', 'Failed to save meal. Please try again.');
      setSaving(false);
    }
  };

  const loadingText =
    phase === 1
      ? 'Detecting food…'
      : phase === 2
      ? 'Estimating portion size…'
      : 'Calculating nutrition…';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Dashboard');
            }
          }} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Review your meal</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: processedImageUri }} style={styles.image} />
          <View style={styles.photoTag}>
            <Text style={styles.photoTagText}>Photo</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9C27B0" />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Detected items</Text>
            {items.map((item) => (
              <DetectedItemRow
                key={item.id}
                item={item}
                onIncrease={() => handleAmountChange(item.id, 10)}
                onDecrease={() => handleAmountChange(item.id, -10)}
              />
            ))}

            {total && <NutritionSummaryCard total={total} />}
          </>
        )}
      </ScrollView>

      {!loading && !showSuccess && (
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
        <Animated.View
          style={[
            styles.successOverlay,
            {
              opacity: successAnim,
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
          <View style={styles.successCard}>
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
            </View>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
    paddingBottom: 120, // Extra space for absolute positioned bottom bar
  },
  imageContainer: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
});
