import { formatDifficulty, formatMinutes, formatNumber } from '@/utils/helpers';

describe('formatMinutes', () => {
  it('returns minutes when under an hour', () => {
    expect(formatMinutes(15)).toBe('15 min');
  });

  it('formats hours with remaining minutes', () => {
    expect(formatMinutes(95)).toBe('1 hr 35 min');
  });

  it('pluralises hours correctly', () => {
    expect(formatMinutes(120)).toBe('2 hrs');
  });

  it('handles missing input', () => {
    expect(formatMinutes(undefined)).toBe('—');
  });
});

describe('formatDifficulty', () => {
  it('normalises known levels', () => {
    expect(formatDifficulty('medium')).toBe('Medium');
    expect(formatDifficulty('HARD')).toBe('Hard');
  });

  it('falls back to raw value when unknown', () => {
    expect(formatDifficulty('custom')).toBe('custom');
  });

  it('returns Unknown when missing', () => {
    expect(formatDifficulty(undefined)).toBe('Unknown');
  });
});

describe('formatNumber', () => {
  it('keeps small numbers unchanged', () => {
    expect(formatNumber(950)).toBe('950');
  });

  it('formats thousands and millions', () => {
    expect(formatNumber(15_400)).toBe('15.4K');
    expect(formatNumber(3_200_000)).toBe('3.2M');
  });

  it('handles undefined input', () => {
    expect(formatNumber(undefined)).toBe('0');
  });
});
