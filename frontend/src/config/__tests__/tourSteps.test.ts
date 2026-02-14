import { Platform } from 'react-native';

import {
  ALL_TOUR_STEPS,
  QUICK_ACTIONS_STEP,
  RECIPES_TOUR_STEP,
  SNAP_MEAL_STEP,
  TODAYS_NUTRITION_STEP,
  WORKOUTS_TOUR_STEP,
} from '@/config/tourSteps';

describe('tour steps config', () => {
  it('keeps mobile dashboard tour usable without quick actions', () => {
    if (Platform.OS === 'web') {
      expect(ALL_TOUR_STEPS.map((step) => step.zone)).toContain(QUICK_ACTIONS_STEP.zone);
      return;
    }

    const zones = ALL_TOUR_STEPS.map((step) => step.zone);
    expect(zones).toContain(SNAP_MEAL_STEP.zone);
    expect(zones).toContain(TODAYS_NUTRITION_STEP.zone);
    expect(zones).toContain(WORKOUTS_TOUR_STEP.zone);
    expect(zones).toContain(RECIPES_TOUR_STEP.zone);
    expect(zones).not.toContain(QUICK_ACTIONS_STEP.zone);
  });
});
