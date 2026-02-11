import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getLocalDateKey,
  HYDRATION_STORAGE_KEY,
  useHydrationStore,
} from '../useHydrationStore';

const resetStore = () => {
  useHydrationStore.setState({
    cups: 0,
    dailyGoalCups: 8,
    dateKey: getLocalDateKey(),
    isLoaded: false,
  });
};

describe('useHydrationStore', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    resetStore();
  });

  it('loads empty state as 0 cups for today', async () => {
    await useHydrationStore.getState().loadHydration();

    const state = useHydrationStore.getState();
    expect(state.cups).toBe(0);
    expect(state.dateKey).toBe(getLocalDateKey());
    expect(state.isLoaded).toBe(true);
  });

  it('increments by 1 when pressing add', async () => {
    await useHydrationStore.getState().loadHydration();
    await useHydrationStore.getState().addCup();

    const state = useHydrationStore.getState();
    expect(state.cups).toBe(1);
  });

  it('resets stale saved day to 0 on load', async () => {
    await AsyncStorage.setItem(
      HYDRATION_STORAGE_KEY,
      JSON.stringify({
        cups: 6,
        dailyGoalCups: 8,
        dateKey: '2000-01-01',
      }),
    );

    await useHydrationStore.getState().loadHydration();

    const state = useHydrationStore.getState();
    expect(state.cups).toBe(0);
    expect(state.dateKey).toBe(getLocalDateKey());
  });

  it('auto-resets stale in-memory day before adding', async () => {
    useHydrationStore.setState({
      cups: 5,
      dailyGoalCups: 8,
      dateKey: '2000-01-01',
      isLoaded: true,
    });

    await useHydrationStore.getState().addCup();

    const state = useHydrationStore.getState();
    expect(state.cups).toBe(1);
    expect(state.dateKey).toBe(getLocalDateKey());
  });
});
