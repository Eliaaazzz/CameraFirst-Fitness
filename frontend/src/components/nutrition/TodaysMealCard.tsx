import { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { MealImage } from './MealImage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface TodaysMealCardProps {
  totalMeals: number;
  totalCalories: number;
  mealCount: number;
  onPress: () => void;
  imageUrl?: string;
}

export function TodaysMealCard({
  totalMeals,
  totalCalories,
  mealCount,
  onPress,
  imageUrl,
}: TodaysMealCardProps) {
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const cardScale = useSharedValue(1);

  const handlePressIn = () => {
    cardScale.value = withSpring(0.95, {
      damping: 10,
      mass: 1,
      overshootClamping: false,
    });
  };

  const handlePressOut = () => {
    cardScale.value = withSpring(1, {
      damping: 10,
      mass: 1,
      overshootClamping: false,
    });
  };

  const handlePress = () => {
    // Trigger ripple animation
    rippleScale.value = 0;
    rippleOpacity.value = 1;

    rippleScale.value = withTiming(4, {
      duration: 600,
      easing: Easing.out(Easing.quad),
    });

    rippleOpacity.value = withTiming(0, {
      duration: 600,
      easing: Easing.out(Easing.quad),
    });

    // Call the callback after animation
    setTimeout(() => {
      onPress();
    }, 100);
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const hasFood = mealCount > 0;
  const displayText = hasFood
    ? `${mealCount} meal${mealCount !== 1 ? 's' : ''} logged`
    : 'Tap to add meal';

  return (
    <Animated.View style={[styles.container, cardAnimatedStyle]}>
      <Pressable
        style={styles.pressable}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        android_ripple={
          Platform.OS === 'android'
            ? { color: 'rgba(255, 255, 255, 0.3)', borderless: true }
            : undefined
        }
      >
        {/* Background with glassmorphism effect */}
        <View style={styles.background}>
          {/* Blurred overlay effect simulation */}
          <View style={[styles.glassLayer, styles.glassLayer1]} />
          <View style={[styles.glassLayer, styles.glassLayer2]} />
        </View>

        {/* Ripple effect */}
        <Animated.View
          style={[styles.ripple, rippleAnimatedStyle]}
        />

        {/* Content wrapper */}
        <View style={styles.content}>
          {/* Image section */}
          <View style={styles.imageSection}>
            <MealImage
              imageUrl={imageUrl}
              size={110}
              borderRadius={16}
              fallbackIcon="silverware-fork-knife"
              fallbackIconSize={48}
            />
          </View>

          {/* Info section */}
          <View style={styles.infoSection}>
            <Text style={styles.label}>Today's Meals</Text>
            <Text style={styles.calorieCount}>
              {totalCalories}
              <Text style={styles.calorieUnit}> kcal</Text>
            </Text>
            <Text style={styles.mealStatus}>{displayText}</Text>
          </View>

          {/* Arrow indicator */}
          <View style={styles.arrowSection}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </View>

        {/* Border with gradient effect simulation */}
        <View style={styles.borderGlow} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 20,
  },
  pressable: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  background: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  glassLayer: {
    position: 'absolute',
    borderRadius: 20,
    opacity: 0.08,
  },
  glassLayer1: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  glassLayer2: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  borderGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    pointerEvents: 'none',
  },
  ripple: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    left: '50%',
    top: '50%',
    marginLeft: -40,
    marginTop: -40,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    height: 140,
    zIndex: 1,
  },
  imageSection: {
    marginRight: 16,
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  calorieCount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  calorieUnit: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  mealStatus: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  arrowSection: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  arrow: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
