import React, { useState } from 'react';
import { MagnifyingGlass, XCircle } from 'phosphor-react-native';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { BRAND_COLORS, radii, spacing } from '@/utils';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  onFocusChange?: (isFocused: boolean) => void;
  isLoading?: boolean;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search',
  value,
  onChangeText,
  onSubmit,
  onClear,
  onFocusChange,
  isLoading = false,
  autoFocus = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocusChange?.(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onFocusChange?.(false);
  };

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View style={[styles.container, isFocused && styles.containerFocused]}>
      <MagnifyingGlass
        size={18}
        color={isFocused ? BRAND_COLORS.primary : BRAND_COLORS.textMuted}
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={BRAND_COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
      />
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={BRAND_COLORS.primary}
          style={styles.clearIcon}
        />
      ) : null}
      {!isLoading && value.length > 0 ? (
        <Pressable onPress={handleClear} style={styles.clearButton}>
          <XCircle size={18} color={BRAND_COLORS.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  containerFocused: {
    borderColor: BRAND_COLORS.primary,
    shadowColor: '#C96A34',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 1,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: BRAND_COLORS.textPrimary,
    paddingVertical: spacing.sm,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
      outlineWidth: 0,
    }),
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearIcon: {
    marginLeft: spacing.sm,
  },
});

