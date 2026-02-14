import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

import { TOUR_STATUS_KEY } from '@/config/tourSteps';
import { useTourStatus } from '@/hooks/useTourStatus';

const waitFor = async (check: () => boolean, timeoutMs = 1000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

describe('useTourStatus', () => {
  const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
  const originalDevFlag = (global as typeof globalThis & { __DEV__?: boolean }).__DEV__;

  let latest: ReturnType<typeof useTourStatus> | null = null;
  let renderer: ReactTestRenderer | null = null;

  const HookProbe = () => {
    latest = useTourStatus();
    return null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
    latest = null;
    renderer = null;
  });

  afterEach(async () => {
    if (!renderer) return;
    await act(async () => {
      renderer?.unmount();
    });
  });

  afterAll(() => {
    (global as typeof globalThis & { __DEV__?: boolean }).__DEV__ = originalDevFlag;
  });

  it('shows Take Tour for a new account when no tour flag exists', async () => {
    storage.getItem.mockResolvedValueOnce(null);

    await act(async () => {
      renderer = create(<HookProbe />);
    });

    await waitFor(() => latest?.isLoading === false);

    expect(storage.getItem).toHaveBeenCalledWith(TOUR_STATUS_KEY);
    expect(latest?.hasSeenTour).toBe(false);
  });

  it('hides Take Tour when tour flag is already persisted', async () => {
    storage.getItem.mockResolvedValueOnce('true');

    await act(async () => {
      renderer = create(<HookProbe />);
    });

    await waitFor(() => latest?.isLoading === false);

    expect(latest?.hasSeenTour).toBe(true);
  });

  it('persists completion when tour is finished', async () => {
    storage.getItem.mockResolvedValueOnce(null);

    await act(async () => {
      renderer = create(<HookProbe />);
    });

    await waitFor(() => latest?.isLoading === false);

    await act(async () => {
      await latest?.markTourComplete();
    });

    expect(storage.setItem).toHaveBeenCalledWith(TOUR_STATUS_KEY, 'true');
    expect(latest?.hasSeenTour).toBe(true);
  });
});
