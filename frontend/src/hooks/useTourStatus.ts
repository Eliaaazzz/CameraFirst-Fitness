/**
 * useTourStatus Hook
 * Manages the tour completion status using AsyncStorage
 * 
 * In development mode (__DEV__), the tour status is never persisted
 * so the Welcome Card always shows for testing purposes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { TOUR_STATUS_KEY } from '@/config/tourSteps';

interface TourStatus {
  hasSeenTour: boolean;
  isLoading: boolean;
  markTourComplete: () => Promise<void>;
  markTourSkipped: () => Promise<void>;
  resetTour: () => Promise<void>;
}

export const useTourStatus = (): TourStatus => {
  const [hasSeenTour, setHasSeenTour] = useState(true); // Default to true to prevent flash
  const [isLoading, setIsLoading] = useState(true);

  // Load tour status from AsyncStorage on mount
  useEffect(() => {
    const loadTourStatus = async () => {
      try {
        // In development, always show the welcome card for testing
        if (__DEV__) {
          setHasSeenTour(false);
          setIsLoading(false);
          return;
        }

        const value = await AsyncStorage.getItem(TOUR_STATUS_KEY);
        setHasSeenTour(value === 'true');
      } catch (error) {
        console.error('Failed to load tour status:', error);
        setHasSeenTour(false); // Show tour on error
      } finally {
        setIsLoading(false);
      }
    };

    loadTourStatus();
  }, []);

  // Mark tour as completed
  const markTourComplete = useCallback(async () => {
    try {
      // In development, don't persist - just update local state temporarily
      if (__DEV__) {
        console.log('[DEV] Tour completed - not persisting for dev testing');
        setHasSeenTour(true);
        return;
      }

      await AsyncStorage.setItem(TOUR_STATUS_KEY, 'true');
      setHasSeenTour(true);
    } catch (error) {
      console.error('Failed to save tour status:', error);
    }
  }, []);

  // Mark tour as skipped (same as complete for persistence)
  const markTourSkipped = useCallback(async () => {
    try {
      // In development, don't persist - just update local state temporarily
      if (__DEV__) {
        console.log('[DEV] Tour skipped - not persisting for dev testing');
        setHasSeenTour(true);
        return;
      }

      await AsyncStorage.setItem(TOUR_STATUS_KEY, 'true');
      setHasSeenTour(true);
    } catch (error) {
      console.error('Failed to save tour skip status:', error);
    }
  }, []);

  // Reset tour status (for testing or re-showing tour)
  const resetTour = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TOUR_STATUS_KEY);
      setHasSeenTour(false);
    } catch (error) {
      console.error('Failed to reset tour status:', error);
    }
  }, []);

  return {
    hasSeenTour,
    isLoading,
    markTourComplete,
    markTourSkipped,
    resetTour,
  };
};

export default useTourStatus;

