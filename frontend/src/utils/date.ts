export const formatLocalDateKey = (date: Date = new Date()): string => {
  // Use a stable YYYY-MM-DD local date key.
  // `sv-SE` reliably yields `YYYY-MM-DD` in modern JS engines.
  try {
    const s = date.toLocaleDateString('sv-SE');
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  } catch {
    // ignore and fall back
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const toLocalDateKey = (input: string | Date): string => {
  if (input instanceof Date) return formatLocalDateKey(input);

  // Already a date key
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return formatLocalDateKey(new Date());
  return formatLocalDateKey(parsed);
};

