import React, { useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  StyleSheet,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { SummaryCard } from '@/components/nutrition/SummaryCard';
import { AddFoodButton } from '@/components/nutrition/AddFoodButton';
import { MealListItem } from '@/components/nutrition/MealListItem';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';

export function NutritionScreen({ navigation }: any) {
  const { data, refresh } = useDailyNutrition();

  useFocusEffect(
    useCallback(() => {
      // Refresh when returning from ReviewMeal screen
      refresh();
    }, [refresh])
  );

  const handleAddPress = async () => {
    // On web, directly open the gallery (better UX than ActionSheet/Alert)
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
    } else {
      Alert.alert('Add Food', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handleChooseFromGallery },
      ]);
    }
  };


  const handleTakePhoto = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Camera not supported', 'Please choose a photo from your device on web.');
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        navigation.navigate('ReviewMeal', { imageUri: result.assets[0].uri });
      } else {
        Alert.alert('No image captured', 'Please retake a photo to continue.');
      }
    } catch (err) {
      console.error('Camera capture failed', err);
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
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        navigation.navigate('ReviewMeal', { imageUri: result.assets[0].uri });
      } else {
        Alert.alert('No image selected', 'Please pick a photo to continue.');
      }
    } catch (err) {
      console.error('Gallery pick failed', err);
      Alert.alert('Error', 'Could not open gallery: ' + (err as Error)?.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nutrition</Text>
      </View>

      <ScrollView>
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
          <Text style={styles.sectionTitle}>Today's meals</Text>
          {data.meals.length === 0 ? (
            <Text style={styles.emptyText}>No meals logged yet</Text>
          ) : (
            data.meals.map((meal) => <MealListItem key={meal.id} meal={meal} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  mealsSection: {
    marginTop: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 16,
  },
});
