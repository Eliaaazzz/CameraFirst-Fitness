import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

import { spacing } from '@/utils';
import { Card } from './Card';

type ListSkeletonProps = {
  rows?: number;
  showAvatar?: boolean;
  primaryWidth?: number | string;
  secondaryWidth?: number | string;
};

const SHIMMER_DURATION = 1200;

const ListSkeletonRow: React.FC<{
  showAvatar: boolean;
  primaryWidth: number | string;
  secondaryWidth: number | string;
}> = ({ showAvatar, primaryWidth, secondaryWidth }) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  
  // Convert percentage strings to pixel values
  const getWidth = (width: number | string): number => {
    if (typeof width === 'number') return width;
    if (typeof width === 'string' && width.includes('%')) {
      const percent = parseInt(width) / 100;
      return (Dimensions.get('window').width - 40) * percent; // Account for margins
    }
    return 200; // Default width
  };
  
  const pWidth = getWidth(primaryWidth);
  const sWidth = getWidth(secondaryWidth);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: SHIMMER_DURATION,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-160, 160],
  });

  return (
    <Card style={[styles.card, styles.skeletonCard]}>
      <View style={styles.row}>
        {showAvatar && <View style={styles.avatar} />}
        <View style={styles.textGroup}>
          <View style={[styles.line, { width: pWidth }]} />
          <View style={[styles.line, styles.secondaryLine, { width: sWidth }]} />
        </View>
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmerOverlay,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Card>
  );
};

const ListSkeleton: React.FC<ListSkeletonProps> = ({
  rows = 4,
  showAvatar = false,
  primaryWidth = '70%',
  secondaryWidth = '50%',
}) => (
  <View style={styles.container}>
    {Array.from({ length: rows }).map((_, index) => (
      <ListSkeletonRow
        key={index}
        showAvatar={showAvatar}
        primaryWidth={primaryWidth}
        secondaryWidth={secondaryWidth}
      />
    ))}
  </View>
);

export default ListSkeleton;

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  card: {
    overflow: 'hidden',
  },
  skeletonCard: {
    backgroundColor: 'rgba(15,23,42,0.04)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(148, 163, 184, 0.24)',
  },
  textGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  line: {
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.28)',
  },
  secondaryLine: {
    height: 12,
    width: '45%',
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
