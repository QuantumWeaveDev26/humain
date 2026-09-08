import { describe, it, expect } from 'vitest';
import { calculateReminderAt, formatTimeInTz } from '@/lib/time';

describe('Reminder Calculation Tests', () => {
  it('calculates reminder timestamp exactly 5 minutes before due time', () => {
    // 5:00 PM UTC = 17:00:00.000Z
    const dueAtIso = '2026-09-04T17:00:00.000Z';
    const reminderAt = calculateReminderAt(dueAtIso, 5);

    expect(reminderAt).toBe('2026-09-04T16:55:00.000Z');
  });

  it('calculates reminder timestamp with custom offset (e.g. 15 minutes before)', () => {
    const dueAtIso = '2026-09-04T11:30:00.000Z';
    const reminderAt = calculateReminderAt(dueAtIso, 15);

    expect(reminderAt).toBe('2026-09-04T11:15:00.000Z');
  });

  it('formats reminder time correctly in Asia/Kolkata timezone', () => {
    // 17:00 UTC is 22:30 IST. 5 minutes before is 22:25 IST.
    const reminderUtc = '2026-09-04T16:55:00.000Z';
    const formatted = formatTimeInTz(reminderUtc, 'Asia/Kolkata');

    expect(formatted).toBe('10:25 PM');
  });
});
