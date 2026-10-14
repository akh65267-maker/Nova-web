// The dashboard's periods are whole UTC days, ending after today, so "last 7 days" includes
// today and the query key does not change every render.
export const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export function periodRange(days: number, now: Date = new Date()): { from: string; to: string } {
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const to = startOfToday + DAY_MS;
  return { from: new Date(to - days * DAY_MS).toISOString(), to: new Date(to).toISOString() };
}

// The change from the previous period to this one, as a fraction (0.25 = up 25%). Null when
// there is nothing to compare with, rather than a misleading 0% or infinity.
export function change(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / previous;
}

// The last whole day of a [from, to) range, as YYYY-MM-DD (UTC), for labels.
export function lastDay(toExclusiveIso: string): string {
  return new Date(new Date(toExclusiveIso).getTime() - 1).toISOString().slice(0, 10);
}

export function firstDay(fromIso: string): string {
  return new Date(fromIso).toISOString().slice(0, 10);
}
