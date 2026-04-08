import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Dialog, Portal } from 'react-native-paper';
import { CameraSlash } from 'phosphor-react-native';

import { Button, Text } from '@/components';
import { spacing } from '@/utils';

type Props = {
  visible: boolean;
  permissionDenied?: boolean;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
};

export const PermissionDialog = ({
  visible,
  permissionDenied = false,
  onRequestPermission: _onRequestPermission,
  onOpenSettings,
}: Props) => {
  return (
    <Portal>
      <Dialog visible={visible} dismissable={false}>
        <Dialog.Icon icon={() => <CameraSlash size={28} />} />
        <Dialog.Title>{permissionDenied ? 'Camera Access Is Off' : 'Waiting for System Permission'}</Dialog.Title>
        <Dialog.Content>
          <Text variant="body">
            {permissionDenied
              ? 'Enable camera access in Settings if you want to capture a new photo in the app.'
              : 'Use the system permission prompt to continue. This screen should not be used as a custom pre-permission gate.'}
          </Text>
        </Dialog.Content>
        {permissionDenied && (
          <Dialog.Actions>
            <View style={styles.actions}>
              <Button title="Open Settings" onPress={onOpenSettings} />
            </View>
          </Dialog.Actions>
        )}
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
});
