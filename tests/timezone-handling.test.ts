import { describe, it, expect } from 'vitest';
import {
  toUserTimezone,
  formatTimeInTz,
  formatFriendlyDateTime,
  categorizeTask,
  localToUtcIso,
} from '@/lib/time';
import { addMinutes, subMinutes } from 'date-fns';

describe('Timezone & Time Handling Tests', () => {
  it('converts local date components to UTC ISO string', () => {
    // 5:00 PM IST (Asia/Kolkata is UTC+5:30)
    // 17:00 IST = 11:30 UTC
    const utcIso = localToUtcIso(2026, 9, 4, 17, 0, 'Asia/Kolkata');
    expect(utcIso).toContain('2026-09-04T11:30:00');
  });

  it('formats UTC ISO timestamp in user timezone correctly', () => {
    const utcIso = '2026-09-04T11:30:00.000Z';
    const formatted = formatTimeInTz(utcIso, 'Asia/Kolkata');
    expect(formatted).toBe('5:00 PM');
  });

  it('categorizes task as OVERDUE when due in the past', () => {
    const now = new Date('2026-09-04T15:00:00.000Z');
    const pastDue = subMinutes(now, 45).toISOString();

    const category = categorizeTask(pastDue, 'Asia/Kolkata', now);
    expect(category).toBe('OVERDUE');
  });

  it('categorizes task as NOW when due within 30 minutes', () => {
    const now = new Date('2026-09-04T15:00:00.000Z');
    const dueSoon = addMinutes(now, 20).toISOString();

    const category = categorizeTask(dueSoon, 'Asia/Kolkata', now);
    expect(category).toBe('NOW');
  });

  it('categorizes task as NEXT when due later in the day', () => {
    // 10:00 AM IST (04:30 UTC)
    const now = new Date('2026-09-04T04:30:00.000Z');
    // 5:00 PM IST (11:30 UTC) -> 7 hours later
    const dueLater = '2026-09-04T11:30:00.000Z';

    const category = categorizeTask(dueLater, 'Asia/Kolkata', now);
    expect(category).toBe('NEXT');
  });
});
