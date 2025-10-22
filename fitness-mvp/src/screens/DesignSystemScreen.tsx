import React from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Card, Container, LoadingSpinner, SafeAreaWrapper, Text } from '@/components';
import { spacing } from '@/utils';

export const DesignSystemScreen = () => (
  <SafeAreaWrapper>
    <Container>
      <Text variant="heading1" weight="bold">
        Components
      </Text>
      <ScrollView
        contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing['3xl'] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: spacing.md }}>
          <Text variant="heading2" weight="bold">
            Buttons
          </Text>
          <Button title="Primary" />
          <Button title="Secondary" variant="secondary" />
          <Button title="Outline" variant="outline" />
          <Button title="Ghost" variant="ghost" />
          <Button title="Loading" loading />
          <Button title="Disabled" disabled />
        </View>
        <View style={{ gap: spacing.md }}>
          <Text variant="heading2" weight="bold">
            Cards
          </Text>
          <Card>
            <Text variant="body">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore
              et dolore magna aliqua.
            </Text>
          </Card>
        </View>
        <View style={{ gap: spacing.md }}>
          <Text variant="heading2" weight="bold">
            Loading
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            <LoadingSpinner size="small" />
            <LoadingSpinner size="medium" />
            <LoadingSpinner size="large" />
          </View>
        </View>
      </ScrollView>
    </Container>
  </SafeAreaWrapper>
);
