/**
 * SwipeableCard - Material Design 3 Swipeable Component
 *
 * Features:
 * - Swipe-to-delete with Material Motion
 * - Confirmation before delete
 * - Haptic feedback on reveal/delete
 * - Smooth spring animations
 * - Accessibility support
 *
 * Note: Swipe gestures are disabled on Web to prevent freeze issues
 */

import { spacing } from '@/utils';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { IconButton } from 'react-native-paper';
import Animated from 'react-native-reanimated';

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

  const handleDelete = useCallback(async () => {
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
  }, [deleteTitle, deleteMessage, deleteLabel, onDelete]);

  // Render delete action - uses standard Animated.View which works on Web
  const renderRightActions = useCallback(() => {
    return (
      <Animated.View style={styles.deleteAction}>
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
  }, [handleDelete, deleteLabel]);

  const handleSwipeableOpen = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      // Medium haptic feedback when delete action revealed
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  };

  // On Web or when disabled, just render children without swipe functionality
  // This prevents gesture handler issues that cause the UI to freeze
  if (disabled || Platform.OS === 'web') {
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
