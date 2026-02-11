import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export const HYDRATION_STORAGE_KEY = 'aura_hydration';
const DEFAULT_DAILY_GOAL_CUPS = 8;

type PersistedHydration = {
  cups: number;
  dailyGoalCups: number;
  dateKey: string;
};

const clampNonNegativeInt = (value: unknown, fallback = 0): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.floor(value));
};

export const getLocalDateKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parsePersistedHydration = (raw: string | null): PersistedHydration | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedHydration>;
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      cups: clampNonNegativeInt(parsed.cups, 0),
      dailyGoalCups: clampNonNegativeInt(parsed.dailyGoalCups, DEFAULT_DAILY_GOAL_CUPS),
      dateKey: typeof parsed.dateKey === 'string' ? parsed.dateKey : getLocalDateKey(),
    };
  } catch {
    return null;
  }
};

const persistHydration = async (payload: PersistedHydration): Promise<void> => {
  try {
    await AsyncStorage.setItem(HYDRATION_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[HydrationStore] Failed to persist hydration:', error);
  }
};

interface HydrationState {
  cups: number;
  dailyGoalCups: number;
  dateKey: string;
  isLoaded: boolean;
  loadHydration: () => Promise<void>;
  ensureToday: () => Promise<void>;
  addCup: (amount?: number) => Promise<void>;
  resetForToday: () => Promise<void>;
}

export const useHydrationStore = create<HydrationState>((set, get) => ({
  cups: 0,
  dailyGoalCups: DEFAULT_DAILY_GOAL_CUPS,
  dateKey: getLocalDateKey(),
  isLoaded: false,

  loadHydration: async () => {
    const today = getLocalDateKey();

    try {
      const raw = await AsyncStorage.getItem(HYDRATION_STORAGE_KEY);
      const persisted = parsePersistedHydration(raw);

      if (!persisted) {
        const initial: PersistedHydration = {
          cups: 0,
          dailyGoalCups: DEFAULT_DAILY_GOAL_CUPS,
          dateKey: today,
        };
        set({ ...initial, isLoaded: true });
        await persistHydration(initial);
        return;
      }

      const normalized: PersistedHydration = {
        cups: persisted.dateKey === today ? persisted.cups : 0,
        dailyGoalCups: clampNonNegativeInt(persisted.dailyGoalCups, DEFAULT_DAILY_GOAL_CUPS),
        dateKey: today,
      };

      set({ ...normalized, isLoaded: true });
      await persistHydration(normalized);
    } catch (error) {
      console.warn('[HydrationStore] Failed to load hydration:', error);
      set({
        cups: 0,
        dailyGoalCups: DEFAULT_DAILY_GOAL_CUPS,
        dateKey: today,
        isLoaded: true,
      });
    }
  },

  ensureToday: async () => {
    const today = getLocalDateKey();
    const state = get();
    if (state.dateKey === today) return;

    const next: PersistedHydration = {
      cups: 0,
      dailyGoalCups: state.dailyGoalCups,
      dateKey: today,
    };
    set(next);
    await persistHydration(next);
  },

  addCup: async (amount = 1) => {
    const increment = clampNonNegativeInt(amount, 1);
    if (increment <= 0) return;

    const today = getLocalDateKey();
    const state = get();
    const baseCups = state.dateKey === today ? state.cups : 0;
    const next: PersistedHydration = {
      cups: baseCups + increment,
      dailyGoalCups: state.dailyGoalCups,
      dateKey: today,
    };

    set(next);
    await persistHydration(next);
  },

  resetForToday: async () => {
    const today = getLocalDateKey();
    const state = get();
    const next: PersistedHydration = {
      cups: 0,
      dailyGoalCups: state.dailyGoalCups,
      dateKey: today,
    };
    set(next);
    await persistHydration(next);
  },
}));
