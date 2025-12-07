import { __internals, DEFAULT_WORKOUT_SORT } from '../hooks';

describe('hooks cache helpers', () => {
  const sampleWorkout = {
    id: 'w-1',
    title: 'Morning Flow',
    durationMinutes: 20,
    level: 'beginner' as const,
    equipment: [],
    bodyPart: [],
    savedAt: new Date().toISOString(),
    alreadySaved: false,
  };

  it('merges saved item into empty snapshot', () => {
    const result = __internals.mergeWorkoutItems(undefined, sampleWorkout, 20, DEFAULT_WORKOUT_SORT);
    expect(result.pages[0].items).toHaveLength(1);
    expect(result.pages[0].items[0].id).toBe('w-1');
    expect(result.pages[0].total).toBeGreaterThanOrEqual(1);
  });

  it('skips merge when item already saved on server', () => {
    const existing = __internals.mergeWorkoutItems(undefined, sampleWorkout, 20, DEFAULT_WORKOUT_SORT);
    const result = __internals.mergeWorkoutItems(existing, { ...sampleWorkout, id: 'w-2', alreadySaved: true }, 20, DEFAULT_WORKOUT_SORT);
    expect(result.pages[0].items).toHaveLength(1);
  });

  it('removes saved item and adjusts total', () => {
    const populated = {
      pages: [{
        items: [sampleWorkout, { ...sampleWorkout, id: 'w-2' }],
        page: 0,
        size: 20,
        total: 2,
        hasNext: false,
      }],
      pageParams: [0],
    };
    const result = __internals.removeSavedItemFromPages(populated, 'w-2');
    expect(result?.pages[0].items).toHaveLength(1);
  });

  it('sorts workouts by duration when requested', () => {
    const existing = {
      pages: [
        {
          items: [
            { ...sampleWorkout, id: 'w-2', durationMinutes: 40 },
            { ...sampleWorkout, id: 'w-3', durationMinutes: 15 },
          ],
          page: 0,
          size: 20,
          total: 2,
          hasNext: false,
        },
      ],
      pageParams: [0],
    };
    const durationAsc = { field: 'duration' as const, direction: 'asc' as const };
    const merged = __internals.mergeWorkoutItems(existing, { ...sampleWorkout, id: 'w-4', durationMinutes: 20 }, 20, durationAsc);
    const durations = merged.pages[0].items.map((item) => item.durationMinutes);
    expect(durations).toEqual([15, 20, 40]);
  });
});
