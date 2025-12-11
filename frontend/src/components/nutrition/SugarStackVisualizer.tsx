import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

export type SugarDisplayMode = 'DIABETES' | 'PREVENTION';

interface SugarStackVisualizerProps {
  /** Sugar cubes count (e.g., 8.5) for PREVENTION mode, or net carbs grams for DIABETES mode */
  count: number;
  /** Display mode: PREVENTION shows sugar cubes, DIABETES shows net carbs */
  mode: SugarDisplayMode;
  /** Optional: show animation on mount */
  animated?: boolean;
}

const MAX_VISIBLE_CUBES = 12;

function SugarCube({ index, animated }: { index: number; animated: boolean }) {
  const scale = useSharedValue(animated ? 0 : 1);
  const opacity = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (animated) {
      const delay = index * 80;
      scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 200 }));
      opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    }
  }, [animated, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.sugarCube, animatedStyle]}>
      <View style={styles.cubeHighlight} />
    </Animated.View>
  );
}

export function SugarStackVisualizer({
  count,
  mode,
  animated = true,
}: SugarStackVisualizerProps) {
  const containerOpacity = useSharedValue(animated ? 0 : 1);
  const translateY = useSharedValue(animated ? 12 : 0);

  useEffect(() => {
    if (animated) {
      containerOpacity.value = withTiming(1, { duration: 400 });
      translateY.value = withTiming(0, { duration: 400 });
    }
  }, [animated]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (mode === 'DIABETES') {
    return (
      <Animated.View style={[styles.container, styles.diabetesContainer, containerAnimatedStyle]}>
        <View style={styles.netCarbsCircle}>
          <Text style={styles.netCarbsValue}>{Math.round(count)}</Text>
          <Text style={styles.netCarbsUnit}>g</Text>
        </View>
        <Text style={styles.netCarbsLabel}>Net Carbs</Text>
        <Text style={styles.diabetesHint}>Total carbs minus fiber</Text>
      </Animated.View>
    );
  }

  // PREVENTION mode - sugar cubes visualization
  const fullCubes = Math.min(Math.floor(count), MAX_VISIBLE_CUBES);
  const hasPartial = count % 1 > 0 && fullCubes < MAX_VISIBLE_CUBES;
  const partialWidth = (count % 1) * 100;
  const hasOverflow = count > MAX_VISIBLE_CUBES;

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <View style={styles.cubesContainer}>
        {Array.from({ length: fullCubes }).map((_, i) => (
          <SugarCube key={i} index={i} animated={animated} />
        ))}
        {hasPartial && (
          <View style={styles.partialCubeContainer}>
            <SugarCube index={fullCubes} animated={animated} />
            <View style={[styles.partialOverlay, { width: `${100 - partialWidth}%` }]} />
          </View>
        )}
      </View>
      <Text style={styles.sugarLabel}>
        {count.toFixed(1)} sugar cubes
        {hasOverflow && ' (showing first 12)'}
      </Text>
      <Text style={styles.sugarHint}>1 cube = 4g sugar</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  diabetesContainer: {
    backgroundColor: '#E8F5E9',
  },
  cubesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    maxWidth: 200,
  },
  sugarCube: {
    width: 28,
    height: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  cubeHighlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 2,
  },
  partialCubeContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  partialOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#F5F5F5',
  },
  sugarLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  sugarHint: {
    fontSize: 12,
    color: '#999',
  },
  netCarbsCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  netCarbsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
  },
  netCarbsUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFF',
    marginLeft: 2,
    marginTop: 8,
  },
  netCarbsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  diabetesHint: {
    fontSize: 12,
    color: '#666',
  },
});
