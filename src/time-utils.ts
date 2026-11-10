const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toUtcIso(date: Date): string {
  return new Date(date).toISOString();
}

export function getStartOfUtcWeek(date: Date): Date {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(utcDate.getTime() - diffToMonday * MS_PER_DAY);
  return new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 0, 0, 0, 0));
}

export function getSettlementWindow(referenceDate: Date): { start: Date; end: Date; key: string } {
  const currentWeekMonday = getStartOfUtcWeek(referenceDate);
  const start = new Date(currentWeekMonday.getTime() - 7 * MS_PER_DAY);
  const end = new Date(currentWeekMonday.getTime());
  return { start, end, key: `${start.toISOString()}__${end.toISOString()}` };
}

export function isTaskEligible(taskCompletedAt: string | Date, start: Date, end: Date): boolean {
  const completedAt = new Date(taskCompletedAt);
  return completedAt >= start && completedAt < end;
}

export function parseNigerianLocalTime(value: string): Date {
  return new Date(value);
}
