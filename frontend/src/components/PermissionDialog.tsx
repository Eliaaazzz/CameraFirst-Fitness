import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Dialog, Portal } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';

import { Button, Text } from '@/components';
import { spacing } from '@/utils';

type Props = {
  visible: boolean;
  permissionDenied?: boolean;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
  onChooseGallery: () => void;
  onDismiss?: () => void;
};

export const PermissionDialog = ({
  visible,
  permissionDenied = false,
  onRequestPermission,
  onOpenSettings,
  onChooseGallery,
}: Props) => {
  return (
    <Portal>
      <Dialog visible={visible} dismissable={false}>
        <Dialog.Icon icon={() => <Feather name="camera-off" size={28} />} />
        <Dialog.Title>Camera Access Needed</Dialog.Title>
        <Dialog.Content>
          <Text variant="body">
            We need camera access to help you find relevant workouts and recipes based on what you have at home.
          </Text>
          <View style={styles.bullets}>
            <Text>📸 Take photos of your equipment</Text>
            <Text>🍽️ Snap pictures of ingredients</Text>
            <Text>🔒 Photos are never stored without your permission</Text>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <View style={styles.actions}>
            <Button
              title={permissionDenied ? 'Open Settings' : 'Continue'}
              onPress={permissionDenied ? onOpenSettings : onRequestPermission}
            />
            <Button title="Use Photo Library Instead" variant="outline" onPress={onChooseGallery} />
          </View>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  bullets: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
});

