import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider } from 'react-native-paper';

import { WeightLogModal } from '../WeightLogModal';
import * as weightApi from '@/services/weightApi';

// Mock dependencies
jest.mock('@/services/weightApi');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

const mockLogWeight = weightApi.logWeight as jest.MockedFunction<typeof weightApi.logWeight>;

// Test wrapper with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>{children}</PaperProvider>
    </QueryClientProvider>
  );
};

describe('WeightLogModal', () => {
  const mockOnDismiss = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Rendering Tests
  // =========================================================================

  describe('Rendering', () => {
    it('should render modal when visible', () => {
      const { getByText } = render(
        <WeightLogModal visible={true} onDismiss={mockOnDismiss} />,
        { wrapper: createWrapper() }
      );

      expect(getByText('Log Weight')).toBeTruthy();
    });

    it('should not render modal content when not visible', () => {
      const { queryByText } = render(
        <WeightLogModal visible={false} onDismiss={mockOnDismiss} />,
        { wrapper: createWrapper() }
      );

      // Modal title should not be visible
      expect(queryByText('Log Weight')).toBeNull();
    });

    it('should show initial weight when provided', () => {
      const { getByDisplayValue } = render(
        <WeightLogModal
          visible={true}
          onDismiss={mockOnDismiss}
          initialWeight={75.5}
        />,
        { wrapper: createWrapper() }
      );

      expect(getByDisplayValue('75.5')).toBeTruthy();
    });

    it('should show Cancel and Save buttons', () => {
      const { getByText } = render(
        <WeightLogModal visible={true} onDismiss={mockOnDismiss} />,
        { wrapper: createWrapper() }
      );

      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Save')).toBeTruthy();
    });
  });

  // =========================================================================
  // User Interaction Tests
  // =========================================================================

  describe('User Interactions', () => {
    it('should call onDismiss when Cancel is pressed', () => {
      const { getByText } = render(
        <WeightLogModal visible={true} onDismiss={mockOnDismiss} />,
        { wrapper: createWrapper() }
      );

      fireEvent.press(getByText('Cancel'));

      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('should update weight input when user types', () => {
      const { getByLabelText, getByDisplayValue } = render(
        <WeightLogModal visible={true} onDismiss={mockOnDismiss} />,
        { wrapper: createWrapper() }
      );

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '72.5');

      expect(getByDisplayValue('72.5')).toBeTruthy();
    });

    it('should update optional fields when user fills them', () => {
      const { getByLabelText, getByDisplayValue } = render(
        <WeightLogModal visible={true} onDismiss={mockOnDismiss} />,
        { wrapper: createWrapper() }
      );

      const bodyFatInput = getByLabelText('Body Fat');
      fireEvent.changeText(bodyFatInput, '18.5');

      const noteInput = getByLabelText('Note');
      fireEvent.changeText(noteInput, 'Morning weigh-in');

      expect(getByDisplayValue('18.5')).toBeTruthy();
      expect(getByDisplayValue('Morning weigh-in')).toBeTruthy();
    });
  });

  // =========================================================================
  // Validation Tests
  // =========================================================================

  describe('Validation', () => {
    it('should disable Save button when weight is empty', () => {
      const { getByText } = render(
        <WeightLogModal visible={true} onDismiss={mockOnDismiss} />,
        { wrapper: createWrapper() }
      );

      const saveButton = getByText('Save');
      // Button should be disabled (not clickable for submission)
      expect(saveButton.props.accessibilityState?.disabled).toBeTruthy();
    });

    it('should show error when weight is invalid', async () => {
      const { getByLabelText, getByText } = render(
        <WeightLogModal visible={true} onDismiss={mockOnDismiss} />,
        { wrapper: createWrapper() }
      );

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '10'); // Below minimum (20)

      // Try to save
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText(/Enter a valid weight/i)).toBeTruthy();
      });
    });

    it('should show error for invalid body fat percentage', async () => {
      const { getByLabelText, getByText } = render(
        <WeightLogModal visible={true} onDismiss={mockOnDismiss} />,
        { wrapper: createWrapper() }
      );

      // Enter valid weight first
      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '75');

      // Enter invalid body fat
      const bodyFatInput = getByLabelText('Body Fat');
      fireEvent.changeText(bodyFatInput, '90'); // Above max (70)

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText(/Enter a valid body fat/i)).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // API Integration Tests
  // =========================================================================

  describe('API Integration', () => {
    it('should call logWeight API with correct data on save', async () => {
      mockLogWeight.mockResolvedValueOnce({
        id: 1,
        weightKg: 75,
        logDate: '2024-01-15',
        createdAt: '2024-01-15T08:00:00Z',
      });

      const { getByLabelText, getByText } = render(
        <WeightLogModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      // Fill form
      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '75');

      // Save
      await act(async () => {
        fireEvent.press(getByText('Save'));
      });

      await waitFor(() => {
        expect(mockLogWeight).toHaveBeenCalledWith(
          expect.objectContaining({
            weightKg: 75,
          })
        );
      });
    });

    it('should call onSuccess and onDismiss after successful save', async () => {
      mockLogWeight.mockResolvedValueOnce({
        id: 1,
        weightKg: 75,
        logDate: '2024-01-15',
        createdAt: '2024-01-15T08:00:00Z',
      });

      const { getByLabelText, getByText } = render(
        <WeightLogModal
          visible={true}
          onDismiss={mockOnDismiss}
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '75');

      await act(async () => {
        fireEvent.press(getByText('Save'));
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });

    it('should show error message when API call fails', async () => {
      mockLogWeight.mockRejectedValueOnce(new Error('Network error'));

      const { getByLabelText, getByText } = render(
        <WeightLogModal visible={true} onDismiss={mockOnDismiss} />,
        { wrapper: createWrapper() }
      );

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '75');

      await act(async () => {
        fireEvent.press(getByText('Save'));
      });

      await waitFor(() => {
        expect(getByText(/Failed to save/i)).toBeTruthy();
      });
    });

    it('should show loading state while saving', async () => {
      // Delay the API response
      mockLogWeight.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const { getByLabelText, getByText, queryByTestId } = render(
        <WeightLogModal visible={true} onDismiss={mockOnDismiss} />,
        { wrapper: createWrapper() }
      );

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '75');

      await act(async () => {
        fireEvent.press(getByText('Save'));
      });

      // Save button should be disabled during loading
      const saveButton = getByText('Save');
      expect(saveButton.props.accessibilityState?.disabled).toBeTruthy();
    });
  });

  // =========================================================================
  // Date Picker Tests
  // =========================================================================

  describe('Date Selection', () => {
    it('should show "Today" for current date', () => {
      const { getByText } = render(
        <WeightLogModal visible={true} onDismiss={mockOnDismiss} />,
        { wrapper: createWrapper() }
      );

      expect(getByText('Today')).toBeTruthy();
    });
  });

  // =========================================================================
  // Form Reset Tests
  // =========================================================================

  describe('Form Reset', () => {
    it('should reset form when modal reopens', async () => {
      const { getByLabelText, getByDisplayValue, rerender } = render(
        <WeightLogModal visible={true} onDismiss={mockOnDismiss} />,
        { wrapper: createWrapper() }
      );

      // Fill form
      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '80');
      expect(getByDisplayValue('80')).toBeTruthy();

      // Close modal
      rerender(
        <WeightLogModal visible={false} onDismiss={mockOnDismiss} />
      );

      // Reopen modal
      rerender(
        <WeightLogModal visible={true} onDismiss={mockOnDismiss} />
      );

      // Weight should be reset
      expect(() => getByDisplayValue('80')).toThrow();
    });
  });
});
