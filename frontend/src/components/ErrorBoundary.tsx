import { Card, Text } from '@/components';
import { spacing } from '@/utils';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch JavaScript errors in child components.
 * Prevents the entire app from crashing and shows a fallback UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Card style={styles.card}>
            <Text variant="heading2" weight="bold" style={styles.title}>
              Something went wrong
            </Text>
            <Text variant="body" style={styles.message}>
              An error occurred while loading. Please try refreshing or go back.
            </Text>
            {__DEV__ && this.state.error && (
              <Text variant="caption" style={styles.errorText}>
                {this.state.error.message}
              </Text>
            )}
            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text variant="body" weight="bold" style={styles.buttonText}>
                Retry
              </Text>
            </TouchableOpacity>
          </Card>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: '#1A1F2E',
  },
  card: {
    padding: spacing.xl,
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  errorText: {
    color: '#F87171',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4ECDC4',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  buttonText: {
    color: '#1A1F2E',
  },
});

export default ErrorBoundary;
