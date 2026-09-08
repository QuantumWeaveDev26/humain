import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiFunctionDeclarations } from './tools';
import { calculateReminderAt } from '@/lib/time';
import { addDays, setHours, setMinutes, setSeconds, parseISO } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

export interface AIModelCallResult {
  toolName: string;
  args: any;
  confidence: number;
  rawTextResponse?: string;
}

/**
 * Initializes Gemini client if GEMINI_API_KEY is present
 */
export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    tools: [{ functionDeclarations: aiFunctionDeclarations }],
  });
}

/**
 * Deterministic rule-based NLP parser fallback for test environments
 * and when running without an active Gemini API Key.
 */
export function parseCommandOfflineFallback(
  commandText: string,
  referenceDate: Date = new Date(),
  timezone: string = 'Asia/Kolkata'
): AIModelCallResult {
  const text = commandText.trim();
  const lower = text.toLowerCase();

  // Pattern 1: Complete task / "didn't answer" / "completed"
  if (
    lower.includes("didn't answer") ||
    lower.includes("didnt answer") ||
    lower.includes("did not answer") ||
    lower.includes("no answer") ||
    lower.includes("busy") ||
    lower.includes("completed") ||
    lower.includes("mark complete")
  ) {
    // Extract lead name
    const leadMatch = text.match(/(?:call\s+|with\s+|to\s+)?([A-Z][a-z]+)/);
    const leadName = leadMatch ? leadMatch[1] : undefined;

    // Check if chaining into another follow-up: e.g. "Arjun didnt answer. Remind me tomorrow at 10 AM."
    const rescheduleMatch = lower.match(/(?:remind me|call him|follow up)\s+(tomorrow|today|at\s+\d+)/i);
    if (rescheduleMatch && leadName) {
      // Calculate new time
      const targetDate = calculateDateFromNaturalLanguage(text, referenceDate, timezone);
      return {
        toolName: 'reschedule_follow_up',
        args: {
          leadName,
          newDueAt: targetDate.toISOString(),
          newReminderAt: calculateReminderAt(targetDate.toISOString(), 5),
          notes: text,
        },
        confidence: 0.95,
      };
    }

    return {
      toolName: 'complete_follow_up',
      args: {
        leadName,
        notes: text,
      },
      confidence: 0.9,
    };
  }

  // Pattern 2: Get today's or overdue tasks
  if (lower.includes('today') && (lower.includes('what are') || lower.includes('show') || lower.includes('my tasks') || lower.includes('focus'))) {
    return {
      toolName: 'get_todays_tasks',
      args: {},
      confidence: 0.95,
    };
  }
  if (lower.includes('overdue')) {
    return {
      toolName: 'get_overdue_tasks',
      args: {},
      confidence: 0.95,
    };
  }

  // Pattern 3: Create follow-up / Remind me to call...
  // Matches: "Remind me to call Arjun today at 5 PM, five minutes before."
  // or "Arjun told me he will be free at 5 PM. Remind me 5 minutes before to call him."
  const leadMatch = 
    text.match(/(?:call|to|with|about)\s+([A-Z][a-z]+)/) ||
    text.match(/^([A-Z][a-z]+)\s+(?:told me|said|is free)/i) ||
    text.match(/lead\s+([A-Z][a-z]+)/i);

  const leadName = leadMatch ? leadMatch[1] : 'Unknown';

  // Extract reminder minutes offset: "5 minutes before", "10 min before", "15 minutes before"
  const reminderOffsetMatch = lower.match(/(\d+)\s*(?:minutes?|mins?)\s+before/);
  const minutesBefore = reminderOffsetMatch ? parseInt(reminderOffsetMatch[1], 10) : 5;

  const targetDate = calculateDateFromNaturalLanguage(text, referenceDate, timezone);
  const dueAtIso = targetDate.toISOString();
  const reminderAtIso = calculateReminderAt(dueAtIso, minutesBefore);

  // Extract action: Call, Meeting, Demo, Follow-up
  let action = 'Call';
  if (lower.includes('meet') || lower.includes('meeting')) action = 'Meeting';
  else if (lower.includes('demo')) action = 'Demo';
  else if (lower.includes('email')) action = 'Email';

  return {
    toolName: 'create_follow_up',
    args: {
      leadName,
      action,
      dueAt: dueAtIso,
      reminderAt: reminderAtIso,
      notes: text,
      priority: lower.includes('urgent') ? 'urgent' : lower.includes('high') ? 'high' : 'medium',
    },
    confidence: 0.95,
  };
}

/**
 * Computes a target date in UTC given natural language time components
 */
export function calculateDateFromNaturalLanguage(
  text: string,
  referenceDate: Date = new Date(),
  timezone: string = 'Asia/Kolkata'
): Date {
  const lower = text.toLowerCase();

  let targetYear = referenceDate.getFullYear();
  let targetMonth = referenceDate.getMonth();
  let targetDay = referenceDate.getDate();

  if (lower.includes('tomorrow')) {
    const tomorrow = addDays(referenceDate, 1);
    targetYear = tomorrow.getFullYear();
    targetMonth = tomorrow.getMonth();
    targetDay = tomorrow.getDate();
  }

  // Parse hour and am/pm: e.g. "at 5 PM", "5:30 PM", "10 AM", "5pm"
  const timeMatch = lower.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  let hours = 17; // Default 5 PM
  let minutes = 0;

  if (timeMatch) {
    let rawHours = parseInt(timeMatch[1], 10);
    const rawMinutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const modifier = timeMatch[3];

    if (modifier === 'pm' && rawHours < 12) {
      rawHours += 12;
    } else if (modifier === 'am' && rawHours === 12) {
      rawHours = 0;
    } else if (!modifier && rawHours >= 1 && rawHours <= 7) {
      // Common business heuristic: "at 5" in afternoon implies 5 PM (17:00)
      rawHours += 12;
    }

    hours = rawHours;
    minutes = rawMinutes;
  }

  if (lower.includes('morning') && !timeMatch?.[3]) {
    hours = 10;
    minutes = 0;
  }

  // Build ISO string in user timezone then convert to UTC
  const pad = (n: number) => n.toString().padStart(2, '0');
  const localStr = `${targetYear}-${pad(targetMonth + 1)}-${pad(targetDay)}T${pad(hours)}:${pad(minutes)}:00`;
  return fromZonedTime(localStr, timezone);
}
