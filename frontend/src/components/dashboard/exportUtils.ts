import type { WeightLogResponse } from '@/services/weightApi';

export const csvEscape = (value: unknown): string => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

export const buildWeightCsv = (rows: WeightLogResponse[]): string => {
  const header = ['Date', 'WeightKg', 'BodyFatPercentage', 'MuscleMassKg', 'Note'];
  const sorted = [...rows].sort((a, b) => a.logDate.localeCompare(b.logDate));

  const lines = [header.join(',')];
  for (const row of sorted) {
    lines.push(
      [row.logDate, row.weightKg, row.bodyFatPercentage ?? '', row.muscleMassKg ?? '', row.note ?? '']
        .map(csvEscape)
        .join(',')
    );
  }

  return lines.join('\n');
};

export const formatShortDate = (dateLike: string): string => {
  const date = new Date(dateLike);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const weekKeyForDate = (dateLike: string): string => {
  const date = new Date(dateLike);
  const day = date.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - diffToMonday);
  return monday.toISOString().slice(0, 10);
};
