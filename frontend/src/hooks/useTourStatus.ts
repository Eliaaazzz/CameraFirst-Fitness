/**
 * useTourStatus Hook
 * Manages the tour completion status using AsyncStorage
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
      await AsyncStorage.setItem(TOUR_STATUS_KEY, 'true');
      setHasSeenTour(true);
    } catch (error) {
      console.error('Failed to save tour status:', error);
    }
  }, []);

  // Mark tour as skipped (same as complete for persistence)
  const markTourSkipped = useCallback(async () => {
    try {
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
