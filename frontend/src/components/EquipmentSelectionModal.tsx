import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gear } from 'phosphor-react-native';
import { Dialog, Portal } from 'react-native-paper';

import { Button, Text } from '@/components';
import { spacing } from '@/utils';

export type EquipmentChoice = 'bodyweight' | 'dumbbells' | 'mat';

type Props = {
  visible: boolean;
  lastChoice?: EquipmentChoice | null;
  onSelect: (choice: EquipmentChoice) => void;
  onSkip: () => void;
  onRequestClose?: () => void;
};

export const EquipmentSelectionModal = ({ visible, lastChoice, onSelect, onSkip, onRequestClose }: Props) => (
  <Portal>
    <Dialog visible={visible} onDismiss={onRequestClose}>
      <Dialog.Icon icon={() => <Gear size={24} />} />
      <Dialog.Title style={{ textAlign: 'center' }}>What equipment do you see?</Dialog.Title>
      <Dialog.Content>
        {lastChoice ? (
          <Text variant="caption" style={{ textAlign: 'center', opacity: 0.8 }}>
            Last time you chose: {lastChoice.charAt(0).toUpperCase() + lastChoice.slice(1)}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button title="💪 Bodyweight" variant="outline" onPress={() => onSelect('bodyweight')} />
          <Button title="🏋️ Dumbbells" variant="outline" onPress={() => onSelect('dumbbells')} />
          <Button title="🧘 Mat" variant="outline" onPress={() => onSelect('mat')} />
        </View>
      </Dialog.Content>
      <Dialog.Actions>
        <Button title="Skip" variant="text" onPress={onSkip} />
      </Dialog.Actions>
    </Dialog>
  </Portal>
);

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
  },
});
