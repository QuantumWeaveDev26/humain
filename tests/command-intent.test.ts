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
});
