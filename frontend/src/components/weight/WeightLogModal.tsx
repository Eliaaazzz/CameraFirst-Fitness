import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import {
  Portal,
  Dialog,
  Button as PaperButton,
  TextInput,
  IconButton,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { Text, Card } from '@/components';
import { spacing, radii } from '@/utils';
import { logWeight, weightQueryKeys, type WeightLogRequest } from '@/services/weightApi';
import { getFriendlyErrorMessage } from '@/utils/errors';

// ============================================================================
// Types
// ============================================================================

interface WeightLogModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess?: () => void;
  initialWeight?: number;
  initialDate?: Date;
}

// ============================================================================
// Component
// ============================================================================

export const WeightLogModal: React.FC<WeightLogModalProps> = ({
  visible,
  onDismiss,
  onSuccess,
  initialWeight,
  initialDate,
}) => {
  // Form state
  const [weight, setWeight] = useState(initialWeight?.toString() || '');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [note, setNote] = useState('');
  const [logDate, setLogDate] = useState(initialDate || new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setWeight(initialWeight?.toString() || '');
      setBodyFat('');
      setMuscleMass('');
      setNote('');
      setLogDate(initialDate || new Date());
      setErrors({});
    }
  }, [visible, initialWeight, initialDate]);

  // Mutation for logging weight
  const logWeightMutation = useMutation({
    mutationFn: logWeight,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Invalidate weight queries to refresh data
      queryClient.invalidateQueries({ queryKey: weightQueryKeys.all });
      onSuccess?.();
      handleDismiss();
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Failed to log weight:', error);
      setErrors({ submit: getFriendlyErrorMessage(error) });
    },
  });

  // Validation - Weight is required, body fat and muscle mass are optional
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Weight is required
    const weightNum = parseFloat(weight);
    if (!weight.trim()) {
      newErrors.weight = 'Weight is required';
    } else if (isNaN(weightNum) || weightNum < 20 || weightNum > 500) {
      newErrors.weight = 'Enter a valid weight (20-500 kg)';
    }

    // Validate body fat if provided (optional)
    if (bodyFat) {
      const bodyFatNum = parseFloat(bodyFat);
      if (isNaN(bodyFatNum) || bodyFatNum < 1 || bodyFatNum > 70) {
        newErrors.bodyFat = 'Enter a valid body fat % (1-70)';
      }
    }

    // Validate muscle mass if provided (optional)
    if (muscleMass) {
      const muscleMassNum = parseFloat(muscleMass);
      if (isNaN(muscleMassNum) || muscleMassNum < 10 || muscleMassNum > 200) {
        newErrors.muscleMass = 'Enter a valid muscle mass (10-200 kg)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [weight, bodyFat, muscleMass]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const request: WeightLogRequest = {
      weightKg: parseFloat(weight), // Required
      logDate: logDate.toISOString().split('T')[0], // "2024-01-15" format
      bodyFatPercentage: bodyFat ? parseFloat(bodyFat) : undefined,
      muscleMassKg: muscleMass ? parseFloat(muscleMass) : undefined,
      note: note.trim() || undefined,
    };

    logWeightMutation.mutate(request);
  }, [weight, bodyFat, muscleMass, note, logDate, validateForm, logWeightMutation]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  }, [onDismiss]);

  // Handle date change
  const handleDateChange = useCallback((_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setLogDate(selectedDate);
    }
  }, []);

  // Format date for display
  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>Log Weight</Dialog.Title>

        <Dialog.Content style={styles.content}>
          {/* Main Weight Input - Required */}
          <View style={styles.mainInputContainer}>
            <TextInput
              label="Weight"
              value={weight}
              onChangeText={setWeight}
              mode="outlined"
              keyboardType="decimal-pad"
              placeholder="70.5"
              error={!!errors.weight}
              style={styles.weightInput}
              right={<TextInput.Affix text="kg" />}
              outlineColor="#D1D5DB"
              activeOutlineColor="#F97316"
              autoFocus
            />
          </View>
          {errors.weight && (
            <Text variant="caption" style={styles.errorText}>
              {errors.weight}
            </Text>
          )}

          {/* Date Selector */}
          <Pressable
            style={styles.dateSelector}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowDatePicker(true);
            }}
          >
            <IconButton icon="calendar" size={20} style={styles.dateIcon} />
            <Text variant="body" style={styles.dateText}>
              {formatDate(logDate)}
            </Text>
            <IconButton icon="chevron-down" size={20} />
          </Pressable>

          {/* Optional Fields */}
          <View style={styles.optionalSection}>
            <Text variant="caption" style={styles.sectionLabel}>
              Optional Details
            </Text>

            <View style={styles.optionalRow}>
              <View style={styles.optionalField}>
                <TextInput
                  label="Body Fat"
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  placeholder="15"
                  error={!!errors.bodyFat}
                  dense
                  right={<TextInput.Affix text="%" />}
                />
              </View>
              <View style={styles.optionalField}>
                <TextInput
                  label="Muscle Mass"
                  value={muscleMass}
                  onChangeText={setMuscleMass}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  placeholder="35"
                  error={!!errors.muscleMass}
                  dense
                  right={<TextInput.Affix text="kg" />}
                />
              </View>
            </View>

            <TextInput
              label="Note"
              value={note}
              onChangeText={setNote}
              mode="outlined"
              placeholder="e.g., After morning workout"
              maxLength={500}
              dense
              style={styles.noteInput}
            />
          </View>

          {/* Error message */}
          {errors.submit && (
            <Text variant="caption" style={[styles.errorText, styles.submitError]}>
              {errors.submit}
            </Text>
          )}
        </Dialog.Content>

        <Dialog.Actions style={styles.actions}>
          <PaperButton onPress={handleDismiss} disabled={logWeightMutation.isPending}>
            Cancel
          </PaperButton>
          <PaperButton
            onPress={handleSave}
            mode="contained"
            loading={logWeightMutation.isPending}
            disabled={logWeightMutation.isPending || !weight.trim()}
            style={styles.saveButton}
          >
            Save
          </PaperButton>
        </Dialog.Actions>
      </Dialog>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={logDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()} // Can't log future dates
        />
      )}
    </Portal>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  dialog: {
    borderRadius: radii.lg,
  },
  title: {
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  mainInputContainer: {
    marginBottom: spacing.sm,
  },
  weightInput: {
    fontSize: 24,
    backgroundColor: '#FFFFFF',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  dateIcon: {
    margin: 0,
  },
  dateText: {
    flex: 1,
  },
  optionalSection: {
    marginTop: spacing.sm,
  },
  sectionLabel: {
    color: '#666',
    marginBottom: spacing.sm,
  },
  optionalRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  optionalField: {
    flex: 1,
  },
  noteInput: {
    backgroundColor: '#FFFFFF',
  },
  actions: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  saveButton: {
    paddingHorizontal: spacing.md,
  },
  errorText: {
    color: '#F44336',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  submitError: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

export default WeightLogModal;
