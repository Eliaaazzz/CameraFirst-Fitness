import * as ImagePicker from 'expo-image-picker';
import React, { useCallback } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Camera, CheckCircle, Target } from 'phosphor-react-native';

import { EmptyStateCard, MetricCard, SafeAreaWrapper, Text } from '@/components';
import { AddFoodButton } from '@/components/nutrition/AddFoodButton';
import { MealListItem } from '@/components/nutrition/MealListItem';
import { SummaryCard } from '@/components/nutrition/SummaryCard';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { BRAND_COLORS, spacing } from '@/utils';

export function NutritionScreen({ navigation }: any) {
  const { data, refresh } = useDailyNutrition();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleTakePhoto = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Camera not supported', 'Please choose a photo from your device on web.');
        return;
      }

      navigation.navigate('ReviewMeal', { openCamera: true });
    } catch (err) {
      Alert.alert('Error', 'Could not take photo: ' + (err as Error)?.message);
    }
  };

  const handleChooseFromGallery = async () => {
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
        allowsEditing: Platform.OS === 'web',
        aspect: [4, 3],
        quality: Platform.OS === 'web' ? 0.8 : 0.65,
      });

      if (!result.canceled && result.assets?.[0]) {
        navigation.navigate('ReviewMeal', {
          imageUri: result.assets[0].uri,
          imageMimeType: result.assets[0].mimeType,
          imageFileName: result.assets[0].fileName,
        });
      } else {
        Alert.alert('No image selected', 'Please pick a photo to continue.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open gallery: ' + (err as Error)?.message);
    }
  };

  const handleAddPress = async () => {
    if (Platform.OS === 'web') {
      await handleChooseFromGallery();
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await handleTakePhoto();
          } else if (buttonIndex === 2) {
            await handleChooseFromGallery();
          }
        }
      );
      return;
    }

    Alert.alert('Log meal', 'Choose an option', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Gallery', onPress: handleChooseFromGallery },
    ]);
  };

  const caloriesRemaining = Math.max(data.goal - data.calories, 0);

  return (
    <SafeAreaWrapper style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="heading1" weight="bold">
            Nutrition
          </Text>
          <Text variant="body" color={BRAND_COLORS.textSecondary} style={styles.subtitle}>
            Log faster, then focus on the signals that matter today.
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label="Meals logged"
            value={String(data.meals.length)}
            hint="Captured today"
            icon={<CheckCircle size={16} color={BRAND_COLORS.secondary} />}
          />
          <MetricCard
            label="Remaining"
            value={`${Math.round(caloriesRemaining)} kcal`}
            hint={caloriesRemaining === 0 ? 'Goal reached' : 'Until today’s target'}
            icon={<Target size={16} color={BRAND_COLORS.primaryDark} />}
          />
        </View>

        <SummaryCard
          calories={data.calories}
          goal={data.goal}
          protein={data.protein}
          carbs={data.carbs}
          fat={data.fat}
          netCarbs={data.netCarbs}
          sugar={data.sugar}
        />

        <AddFoodButton onPress={handleAddPress} />

        <View style={styles.mealsSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text variant="heading3" weight="semibold">
                Today’s log
              </Text>
              <Text variant="caption" color={BRAND_COLORS.textSecondary}>
                Review what you’ve logged so far.
              </Text>
            </View>
          </View>

          {data.meals.length === 0 ? (
            <EmptyStateCard
              icon={<Camera size={28} color={BRAND_COLORS.primary} />}
              title="Your first meal log starts here"
              subtitle="Use a photo when you want speed, then review the details before saving."
              ctaLabel="Log first meal"
              onCtaPress={handleAddPress}
            />
          ) : (
            <View style={styles.mealList}>
              {data.meals.map((meal) => (
                <MealListItem key={meal.id} meal={meal} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  subtitle: {
    maxWidth: 420,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  mealsSection: {
    gap: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  mealList: {
    gap: spacing.sm,
  },
});

