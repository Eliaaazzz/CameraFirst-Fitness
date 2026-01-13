import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '../Text';

// Design tokens
const CARD_BORDER_RADIUS = 20;
const CARD_PADDING = 16;
const TITLE_CONTENT_GAP = 10;

interface SectionCardProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * SectionCard - Consistent card wrapper for recipe detail sections
 * - borderRadius: 20
 * - padding: 16
 * - title + content gap: 10
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  children,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      {(title || icon) && (
        <View style={styles.header}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          {title && (
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>
          )}
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: CARD_BORDER_RADIUS,
    padding: CARD_PADDING,
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: TITLE_CONTENT_GAP,
  },
  iconWrapper: {
    marginRight: 10,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0, // Critical for text truncation in flex row
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  content: {
    // Content area
  },
});

export default SectionCard;