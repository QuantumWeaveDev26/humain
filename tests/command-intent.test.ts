import { describe, it, expect } from 'vitest';
import { parseCommandOfflineFallback } from '@/ai/gemini-client';
import { CreateFollowUpSchema } from '@/ai/schemas';

describe('Command Intent Parsing Tests', () => {
  const referenceDate = new Date('2026-09-04T10:00:00.000Z'); // 3:30 PM IST

  it('parses primary test command: "Remind me to call Arjun today at 5 PM, five minutes before."', () => {
    const command = 'Remind me to call Arjun today at 5 PM, five minutes before.';
    const result = parseCommandOfflineFallback(command, referenceDate, 'Asia/Kolkata');

    expect(result.toolName).toBe('create_follow_up');
    expect(result.args.leadName).toBe('Arjun');
    expect(result.args.action).toBe('Call');

    // Validate using Zod schema
    const validated = CreateFollowUpSchema.parse(result.args);
    expect(validated.leadName).toBe('Arjun');
    expect(validated.dueAt).toBeDefined();
    expect(validated.reminderAt).toBeDefined();

    // Verify reminder is before due time
    const dueTime = new Date(validated.dueAt).getTime();
    const reminderTime = new Date(validated.reminderAt!).getTime();
    expect(reminderTime).toBeLessThan(dueTime);
    // Diff should be 5 minutes = 300,000 ms
    expect(dueTime - reminderTime).toBe(5 * 60 * 1000);
  });

  it('parses conversation follow-up: "Arjun didnt answer. Remind me tomorrow at 10 AM."', () => {
    const command = 'Arjun didnt answer. Remind me tomorrow at 10 AM.';
    const result = parseCommandOfflineFallback(command, referenceDate, 'Asia/Kolkata');

    expect(result.toolName).toBe('reschedule_follow_up');
    expect(result.args.leadName).toBe('Arjun');
    expect(result.args.newDueAt).toBeDefined();
  });

  it('parses task query: "What are my tasks today?"', () => {
    const command = 'What are my tasks today?';
    const result = parseCommandOfflineFallback(command, referenceDate, 'Asia/Kolkata');

    expect(result.toolName).toBe('get_todays_tasks');
  });

  it('parses overdue query: "Show overdue tasks"', () => {
    const command = 'Show overdue tasks';
    const result = parseCommandOfflineFallback(command, referenceDate, 'Asia/Kolkata');

    expect(result.toolName).toBe('get_overdue_tasks');
  });

  it('parses "Remember Arjun said to contact him tomorrow at 4 pm" -> remember with lead and time', () => {
    const command = 'Remember Arjun said to contact him tomorrow at 4 pm';
    const result = parseCommandOfflineFallback(command, referenceDate, 'Asia/Kolkata');

    expect(result.toolName).toBe('remember');
    expect(result.args.leadName).toBe('Arjun');
    expect(result.args.dueAt).toBeDefined();
    expect(result.args.reminderAt).toBeDefined();
    // 4 PM IST = 16:00 IST on 2026-09-05 (referenceDate is 2026-09-04)
    // 16:00 IST = 10:30 UTC
    expect(result.args.dueAt).toBe('2026-09-05T10:30:00.000Z');
  });

  it('parses "Remember to review the pricing deck" -> remember without lead or time', () => {
    const command = 'Remember to review the pricing deck';
    const result = parseCommandOfflineFallback(command, referenceDate, 'Asia/Kolkata');

    expect(result.toolName).toBe('remember');
    expect(result.args.leadName).toBeUndefined();
    expect(result.args.dueAt).toBeUndefined();
    expect(result.args.reminderAt).toBeUndefined();
  });

  it('parses non-actionable non-remember text (e.g. "what\'s the weather") -> unknown, NOT create_follow_up', () => {
    const command = "what's the weather";
    const result = parseCommandOfflineFallback(command, referenceDate, 'Asia/Kolkata');

    expect(result.toolName).toBe('unknown');
    expect(result.toolName).not.toBe('create_follow_up');
  });

  it('parses "Remind me to call Arjun today at 5 PM" -> still create_follow_up', () => {
    const command = 'Remind me to call Arjun today at 5 PM';
    const result = parseCommandOfflineFallback(command, referenceDate, 'Asia/Kolkata');

    expect(result.toolName).toBe('create_follow_up');
    expect(result.args.leadName).toBe('Arjun');
    expect(result.args.dueAt).toBeDefined();
  });
});
