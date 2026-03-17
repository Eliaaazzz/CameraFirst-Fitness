import type { WeightLogResponse } from '@/services/weightApi';
import { csvEscape, buildWeightCsv, formatShortDate, weekKeyForDate } from '../exportUtils';

// ============================================================================
// csvEscape
// ============================================================================

describe('csvEscape()', () => {
  it('should return plain strings unchanged', () => {
    expect(csvEscape('hello')).toBe('hello');
  });

  it('should return empty string for null', () => {
    expect(csvEscape(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(csvEscape(undefined)).toBe('');
  });

  it('should return empty string for empty input', () => {
    expect(csvEscape('')).toBe('');
  });

  it('should convert numbers to strings', () => {
    expect(csvEscape(75.5)).toBe('75.5');
  });

  it('should wrap strings containing commas in quotes', () => {
    expect(csvEscape('hello, world')).toBe('"hello, world"');
  });

  it('should wrap strings containing double quotes and double them', () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it('should wrap strings containing newlines', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });

  it('should wrap strings containing carriage returns', () => {
    expect(csvEscape('line1\rline2')).toBe('"line1\rline2"');
  });

  it('should handle combo of comma and quotes', () => {
    expect(csvEscape('"a", "b"')).toBe('"""a"", ""b"""');
  });
});

// ============================================================================
// buildWeightCsv
// ============================================================================

describe('buildWeightCsv()', () => {
  it('should return header only for empty array', () => {
    const csv = buildWeightCsv([]);
    expect(csv).toBe('Date,WeightKg,BodyFatPercentage,MuscleMassKg,Note');
  });

  it('should produce a correct single-row CSV', () => {
    const rows: WeightLogResponse[] = [
      { id: 1, weightKg: 72.5, logDate: '2024-03-10', createdAt: '2024-03-10T08:00:00Z' },
    ];

    const csv = buildWeightCsv(rows);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('Date,WeightKg,BodyFatPercentage,MuscleMassKg,Note');
    expect(lines[1]).toBe('2024-03-10,72.5,,,');
  });

  it('should sort rows by logDate ascending', () => {
    const rows: WeightLogResponse[] = [
      { id: 2, weightKg: 74, logDate: '2024-03-12', createdAt: '2024-03-12T08:00:00Z' },
      { id: 1, weightKg: 75, logDate: '2024-03-10', createdAt: '2024-03-10T08:00:00Z' },
      { id: 3, weightKg: 73, logDate: '2024-03-14', createdAt: '2024-03-14T08:00:00Z' },
    ];

    const csv = buildWeightCsv(rows);
    const lines = csv.split('\n');

    expect(lines[1]).toContain('2024-03-10');
    expect(lines[2]).toContain('2024-03-12');
    expect(lines[3]).toContain('2024-03-14');
  });

  it('should include optional fields when present', () => {
    const rows: WeightLogResponse[] = [
      {
        id: 1,
        weightKg: 72.5,
        logDate: '2024-03-10',
        bodyFatPercentage: 18.2,
        muscleMassKg: 35,
        note: 'Morning weigh-in',
        createdAt: '2024-03-10T08:00:00Z',
      },
    ];

    const csv = buildWeightCsv(rows);
    const lines = csv.split('\n');

    expect(lines[1]).toBe('2024-03-10,72.5,18.2,35,Morning weigh-in');
  });

  it('should escape notes containing special characters', () => {
    const rows: WeightLogResponse[] = [
      {
        id: 1,
        weightKg: 72,
        logDate: '2024-03-10',
        note: 'After "big" meal, felt heavy',
        createdAt: '2024-03-10T08:00:00Z',
      },
    ];

    const csv = buildWeightCsv(rows);
    const lines = csv.split('\n');

    // Note should be escaped with double quotes
    expect(lines[1]).toContain('"After ""big"" meal, felt heavy"');
  });

  it('should not mutate the input array', () => {
    const rows: WeightLogResponse[] = [
      { id: 2, weightKg: 74, logDate: '2024-03-12', createdAt: '2024-03-12T08:00:00Z' },
      { id: 1, weightKg: 75, logDate: '2024-03-10', createdAt: '2024-03-10T08:00:00Z' },
    ];

    buildWeightCsv(rows);

    // Original array should remain in original order
    expect(rows[0].id).toBe(2);
    expect(rows[1].id).toBe(1);
  });
});

// ============================================================================
// formatShortDate
// ============================================================================

describe('formatShortDate()', () => {
  it('should format ISO date to short format', () => {
    // Date constructor with YYYY-MM-DD parses as UTC
    const result = formatShortDate('2024-01-15');
    expect(result).toMatch(/Jan\s+1[45]/);
  });

  it('should format another month correctly', () => {
    const result = formatShortDate('2024-08-03');
    expect(result).toMatch(/Aug\s+[23]/);
  });

  it('should handle ISO datetime strings', () => {
    const result = formatShortDate('2024-12-25T10:00:00Z');
    expect(result).toMatch(/Dec\s+25/);
  });
});

// ============================================================================
// weekKeyForDate
// ============================================================================

describe('weekKeyForDate()', () => {
  it('should return Monday for a Monday date', () => {
    // 2024-03-11 is a Monday
    const result = weekKeyForDate('2024-03-11');
    expect(result).toBe('2024-03-11');
  });

  it('should return previous Monday for a Wednesday', () => {
    // 2024-03-13 is a Wednesday, Monday is 2024-03-11
    const result = weekKeyForDate('2024-03-13');
    expect(result).toBe('2024-03-11');
  });

  it('should return previous Monday for a Sunday', () => {
    // 2024-03-17 is a Sunday, Monday is 2024-03-11
    const result = weekKeyForDate('2024-03-17');
    expect(result).toBe('2024-03-11');
  });

  it('should handle cross-month boundary', () => {
    // 2024-04-01 is a Monday
    const result = weekKeyForDate('2024-04-03'); // Wednesday Apr 3
    expect(result).toBe('2024-04-01');
  });

  it('should handle month boundary going backward', () => {
    // 2024-03-01 is a Friday, Monday is 2024-02-26
    const result = weekKeyForDate('2024-03-01');
    expect(result).toBe('2024-02-26');
  });
});
