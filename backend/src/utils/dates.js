export function toDateKey(input) {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${input}`);
  }
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKeyStart(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export function parseDateKeyEnd(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

export function daysBetweenInclusive(startKey, endKey) {
  const start = parseDateKeyStart(startKey);
  const end = parseDateKeyStart(endKey);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / 86400000) + 1;
}

export function getMonthPeriod(year, month) {
  const y = Number(year);
  const m = Number(month);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);
  const periodKey = `${y}-${String(m).padStart(2, '0')}`;
  return {
    periodKey,
    periodStart: start,
    periodEnd: end,
    periodStartKey: startKey,
    periodEndKey: endKey,
    totalDays: end.getUTCDate(),
  };
}

export function getWeekPeriodFromStart(weekStartKey) {
  const cleanKey = toDateKey(weekStartKey);
  const start = parseDateKeyStart(cleanKey);
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  const endKey = toDateKey(end);
  return {
    periodKey: `${cleanKey}_TO_${endKey}`,
    periodStart: start,
    periodEnd: end,
    periodStartKey: cleanKey,
    periodEndKey: endKey,
    totalDays: 7,
  };
}

export function getMonthlyPeriodKeyFromDateKey(dateKey) {
  return dateKey.slice(0, 7);
}
