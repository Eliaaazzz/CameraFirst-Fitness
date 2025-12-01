import { COLORS, SPACING, TYPOGRAPHY } from '@/utils/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

interface FilterOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface FilterBarProps {
  options: FilterOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  style?: ViewStyle;
  showAll?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  options,
  selectedId,
  onSelect,
  style,
  showAll = true,
}) => {
  const allOption: FilterOption = { id: 'all', label: 'All' };
  const displayOptions = showAll ? [allOption, ...options] : options;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.container, style]}
      contentContainerStyle={styles.contentContainer}
    >
      {displayOptions.map((option) => {
        const isSelected = selectedId === option.id || (selectedId === null && option.id === 'all');
        
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(option.id === 'all' ? null : option.id)}
            activeOpacity={0.7}
          >
            {option.icon}
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 100, // Pill shape
    backgroundColor: COLORS.surface.secondary,
    marginRight: SPACING.xs,
    gap: SPACING.xs,
  },
  chipSelected: {
    backgroundColor: COLORS.primary.main,
  },
  chipText: {
    fontSize: TYPOGRAPHY.sizes.bodyS,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.text.secondary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});
