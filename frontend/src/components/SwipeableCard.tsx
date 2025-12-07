/**
 * SwipeableCard - Material Design 3 Swipeable Component
 *
 * Features:
 * - Swipe-to-delete with Material Motion
 * - Confirmation before delete
 * - Haptic feedback on reveal/delete
 * - Smooth spring animations
 * - Accessibility support
 */

import { spacing } from '@/utils';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { IconButton } from 'react-native-paper';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';

type Props = {
  children: React.ReactNode;
  onDelete: () => void | Promise<void>;
  deleteLabel?: string;
  deleteTitle?: string;
  deleteMessage?: string;
  disabled?: boolean;
};

export const SwipeableCard = ({
  children,
  onDelete,
  deleteLabel = 'Remove',
  deleteTitle = 'Remove Item',
  deleteMessage = 'Are you sure you want to remove this item?',
  disabled = false,
}: Props) => {
  const swipeableRef = useRef<Swipeable>(null);
  const progress = useSharedValue(0);

  const handleDelete = async () => {
    // Close swipeable first
    swipeableRef.current?.close();

    // Show confirmation dialog
    Alert.alert(
      deleteTitle,
      deleteMessage,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            // Light haptic on cancel
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          },
        },
        {
          text: deleteLabel,
          style: 'destructive',
          onPress: async () => {
            // Success haptic on confirm
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            await onDelete();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderRightActions = (progressAnimatedValue: any) => {
    progress.value = progressAnimatedValue.value;

    const animatedStyle = useAnimatedStyle(() => {
      const translateX = interpolate(
        progressAnimatedValue.value,
        [0, 1],
        [80, 0]
      );

      const opacity = interpolate(
        progressAnimatedValue.value,
        [0, 0.5, 1],
        [0, 0.5, 1]
      );

      return {
        transform: [{ translateX }],
        opacity,
      };
    });

    return (
      <Animated.View style={[styles.deleteAction, animatedStyle]}>
        <IconButton
          icon="delete"
          iconColor="white"
          size={24}
          onPress={handleDelete}
          accessibilityLabel={deleteLabel}
          accessibilityRole="button"
        />
      </Animated.View>
    );
  };

  const handleSwipeableOpen = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      // Medium haptic feedback when delete action revealed
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  };

  if (disabled) {
    return <View>{children}</View>;
  }

  return (
    <GestureHandlerRootView>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
        rightThreshold={40}
        onSwipeableOpen={handleSwipeableOpen}
        enableTrackpadTwoFingerGesture
        containerStyle={styles.container}
      >
        {children}
      </Swipeable>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
  },
  deleteAction: {
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: spacing.md,
    marginLeft: spacing.xs,
  },
});
