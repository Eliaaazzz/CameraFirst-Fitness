import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, Dialog, Button as PaperButton, TextInput } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components';
import { spacing } from '@/utils';

interface EditNameModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (username: string) => void;
  currentName: string;
  isLoading?: boolean;
}

/**
 * EditNameModal - Simple modal for editing user display name
 * Features haptic feedback and validation
 */
export const EditNameModal: React.FC<EditNameModalProps> = ({
  visible,
  onDismiss,
  onSave,
  currentName,
  isLoading,
}) => {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setName(currentName);
      setError('');
    }
  }, [visible, currentName]);

  const handleSave = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Name cannot be empty');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (trimmedName.length > 100) {
      setError('Name is too long (max 100 characters)');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(trimmedName);
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss} style={styles.dialog}>
        <Dialog.Title>Edit Name</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Display Name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError('');
            }}
            mode="outlined"
            placeholder="Enter your name"
            error={!!error}
            style={styles.input}
            autoFocus
            maxLength={100}
          />
          {error ? (
            <Text variant="caption" style={styles.errorText}>
              {error}
            </Text>
          ) : null}
        </Dialog.Content>

        <Dialog.Actions>
          <PaperButton onPress={handleDismiss} disabled={isLoading}>
            Cancel
          </PaperButton>
          <PaperButton
            onPress={handleSave}
            mode="contained"
            loading={isLoading}
            disabled={isLoading || !name.trim()}
          >
            Save
          </PaperButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  input: {
    backgroundColor: 'transparent',
  },
  errorText: {
    color: '#EF4444',
    marginTop: spacing.xs,
  },
});

export default EditNameModal;
