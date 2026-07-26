export type OrderDateFilterKey =
  | "ALL"
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7"
  | "LAST_30"
  | "THIS_MONTH"
  | "CUSTOM";

export const ORDER_DATE_FILTER_KEYS: OrderDateFilterKey[] = [
  "ALL",
  "TODAY",
  "YESTERDAY",
  "LAST_7",
  "LAST_30",
  "THIS_MONTH",
  "CUSTOM",
];

export type OrderDateRange = {
  start: Date | null;
  end: Date | null;
};

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function parseDateInput(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getOrderDateRange(
  key: OrderDateFilterKey,
  customFrom = "",
  customTo = "",
): OrderDateRange {
  const now = new Date();

  switch (key) {
    case "ALL":
      return { start: null, end: null };
    case "TODAY":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "YESTERDAY": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case "LAST_7": {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case "LAST_30": {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case "THIS_MONTH": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case "CUSTOM": {
      const from = parseDateInput(customFrom);
      const to = parseDateInput(customTo);
      return {
        start: from ? startOfDay(from) : null,
        end: to ? endOfDay(to) : null,
      };
    }
    default:
      return { start: null, end: null };
  }
}

export function matchesOrderDateFilter(
  createdAt: string | Date,
  range: OrderDateRange,
): boolean {
  if (!range.start && !range.end) return true;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return false;
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
}

export function hasActiveOrderDateFilter(
  key: OrderDateFilterKey,
  customFrom: string,
  customTo: string,
): boolean {
  if (key === "ALL") return false;
  if (key !== "CUSTOM") return true;
  return Boolean(customFrom.trim() || customTo.trim());
}
