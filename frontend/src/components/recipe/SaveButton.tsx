import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';

// Design tokens
const BUTTON_BORDER_RADIUS = 20;
const BUTTON_PADDING_H = 20;
const BUTTON_PADDING_V = 14;
const ICON_SIZE = 20;
const SAVED_COLOR = '#7C3AED';
const UNSAVED_COLOR = '#6B6B7A';

interface SaveButtonProps {
  isSaved: boolean;
  isLoading: boolean;
  onPress: () => void;
}

/**
 * SaveButton - Save to Library button with consistent styling
 * 
 * Key behaviors:
 * - Background color is CONSTANT (never changes)
 * - Only icon color changes based on saved state
 * - Pressed state only uses opacity (no background color change)
 * - Android ripple is disabled to prevent color bleeding
 */
export const SaveButton: React.FC<SaveButtonProps> = ({
  isSaved,
  isLoading,
  onPress,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      android_ripple={{ color: 'transparent' }} // Disable Android ripple
      style={({ pressed }) => [
        styles.button,
        {
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={isSaved ? 'Remove from library' : 'Save to library'}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={SAVED_COLOR} />
      ) : (
        <>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={ICON_SIZE}
            color={isSaved ? SAVED_COLOR : UNSAVED_COLOR}
          />
          <View style={styles.textContainer}>
            <Text style={[styles.text, { color: isSaved ? SAVED_COLOR : '#1A1A2E' }]}>
              {isSaved ? 'Saved to Library' : 'Save to Library'}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.08)', // Constant light purple - NEVER changes
    paddingHorizontal: BUTTON_PADDING_H,
    paddingVertical: BUTTON_PADDING_V,
    borderRadius: BUTTON_BORDER_RADIUS,
    gap: 10,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'opacity 0.15s ease, transform 0.15s ease',
    }),
  },
  textContainer: {
    minWidth: 0, // Prevent text overflow in flex
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SaveButton;