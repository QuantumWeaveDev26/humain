import { format, parseISO, isBefore, isAfter, addMinutes, subMinutes, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { toZonedTime, fromZonedTime, format as formatZoned } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || 'Asia/Kolkata';

/**
 * Converts a date or UTC ISO string to a specific timezone representation
 */
export function toUserTimezone(dateOrUtcIso: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  const date = typeof dateOrUtcIso === 'string' ? parseISO(dateOrUtcIso) : dateOrUtcIso;
  return toZonedTime(date, timezone);
}

/**
 * Formats a UTC ISO string into a localized time string (e.g. "5:00 PM")
 */
export function formatTimeInTz(utcIso: string, timezone: string = DEFAULT_TIMEZONE): string {
  try {
    const zoned = toUserTimezone(utcIso, timezone);
    return formatZoned(zoned, 'h:mm a', { timeZone: timezone });
  } catch (err) {
    return utcIso;
  }
}

/**
 * Formats a UTC ISO string into a human friendly date + time (e.g. "Today at 5:00 PM" or "Tomorrow at 10:00 AM")
 */
export function formatFriendlyDateTime(utcIso: string, timezone: string = DEFAULT_TIMEZONE, referenceDate: Date = new Date()): string {
  try {
    const targetZoned = toUserTimezone(utcIso, timezone);
    const refZoned = toUserTimezone(referenceDate, timezone);

    const timeStr = formatZoned(targetZoned, 'h:mm a', { timeZone: timezone });

    if (isSameDay(targetZoned, refZoned)) {
      return `Today at ${timeStr}`;
    }

    const tomorrow = addMinutes(startOfDay(refZoned), 24 * 60);
    if (isSameDay(targetZoned, tomorrow)) {
      return `Tomorrow at ${timeStr}`;
    }

    return `${formatZoned(targetZoned, 'MMM d, yyyy', { timeZone: timezone })} at ${timeStr}`;
  } catch (err) {
    return utcIso;
  }
}

/**
 * Calculates reminder time given a due date ISO string and minutes before.
 * Returns UTC ISO string.
 */
export function calculateReminderAt(dueAtIso: string, minutesBefore: number = 5): string {
  const due = parseISO(dueAtIso);
  const reminder = subMinutes(due, minutesBefore);
  return reminder.toISOString();
}

/**
 * Categorizes a task based on due_at timestamp into NOW, NEXT, OVERDUE, or TODAY
 */
export function categorizeTask(
  dueAtIso: string,
  timezone: string = DEFAULT_TIMEZONE,
  referenceNow: Date = new Date()
): 'NOW' | 'NEXT' | 'OVERDUE' | 'TODAY' {
  const due = parseISO(dueAtIso);
  const now = referenceNow;

  // If due is in the past
  if (isBefore(due, now)) {
    return 'OVERDUE';
  }

  // If due within the next 30 minutes
  const thirtyMinsFromNow = addMinutes(now, 30);
  if (isBefore(due, thirtyMinsFromNow)) {
    return 'NOW';
  }

  // If due later today (within same calendar day in timezone)
  const dueZoned = toUserTimezone(due, timezone);
  const nowZoned = toUserTimezone(now, timezone);

  if (isSameDay(dueZoned, nowZoned)) {
    return 'NEXT';
  }

  return 'TODAY';
}

/**
 * Checks if a task is due today in the user's timezone
 */
export function isTaskDueToday(
  dueAtIso: string,
  timezone: string = DEFAULT_TIMEZONE,
  referenceNow: Date = new Date()
): boolean {
  const dueZoned = toUserTimezone(dueAtIso, timezone);
  const nowZoned = toUserTimezone(referenceNow, timezone);
  return isSameDay(dueZoned, nowZoned);
}

/**
 * Converts a local date-time string or components into a UTC ISO string
 */
export function localToUtcIso(
  year: number,
  month: number, // 1-indexed (1 = Jan)
  day: number,
  hours: number,
  minutes: number,
  timezone: string = DEFAULT_TIMEZONE
): string {
  // Format as ISO-like local string
  const pad = (n: number) => n.toString().padStart(2, '0');
  const localStr = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00`;
  const utcDate = fromZonedTime(localStr, timezone);
  return utcDate.toISOString();
}
