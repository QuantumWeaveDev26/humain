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

  // Pattern 3: NEW remember branch
  const rememberTriggerRegex = /\b(remember|note that|make a note|keep in mind|don't forget|dont forget|note down|for the record|fyi|jot down)\b/i;
  if (rememberTriggerRegex.test(lower)) {
    // Extract leadName from a capitalized name OR after "about"/"regarding"
    let leadName: string | undefined;

    const aboutMatch = text.match(/(?:about|regarding)\s+([A-Z][a-z]+)/i);
    if (aboutMatch) {
      leadName = aboutMatch[1];
    } else {
      const excludedWords = new Set([
        'remember', 'note', 'make', 'keep', 'dont', 'jot', 'for', 'fyi',
        'the', 'this', 'that', 'with', 'from', 'and', 'but', 'or', 'to', 'in', 'on', 'at',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
        'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
        'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
        'today', 'tomorrow', 'tonight', 'morning', 'afternoon', 'evening', 'night',
        'review', 'call', 'meeting', 'demo', 'task', 'follow', 'am', 'pm'
      ]);

      const capMatches = text.match(/\b[A-Z][a-z]+\b/g);
      if (capMatches) {
        for (const word of capMatches) {
          if (!excludedWords.has(word.toLowerCase())) {
            leadName = word;
            break;
          }
        }
      }
    }

    // Only set dueAt when a time/date token is present (reuse calculateDateFromNaturalLanguage); NEVER default notes to 5 PM.
    const timeDateRegex = /\b(tomorrow|today|tonight|morning|evening|afternoon|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|\d{1,2}(?::\d{2})?\s*(?:am|pm)|o'clock|at\s+\d{1,2})\b/i;
    let dueAt: string | undefined;
    let reminderAt: string | undefined;

    if (timeDateRegex.test(text)) {
      const targetDate = calculateDateFromNaturalLanguage(text, referenceDate, timezone);
      dueAt = targetDate.toISOString();
      reminderAt = calculateReminderAt(dueAt, 5);
    }

    const args: any = {
      note: text,
    };
    if (leadName) args.leadName = leadName;
    if (dueAt) args.dueAt = dueAt;
    if (reminderAt) args.reminderAt = reminderAt;

    return {
      toolName: 'remember',
      args,
      confidence: 0.95,
    };
  }

  // Pattern 4: SCHEDULE branch (create_follow_up) — GATE it:
  // only emit create_follow_up when there is a real scheduling signal:
  // a time/date token (tomorrow|today|tonight|morning|evening|next week|mon..sun|\d(:\d\d)?\s*(am|pm)|o'clock|at \d)
  // OR an explicit verb (remind|schedule|follow up|call|meet|meeting|demo) together with an extractable lead name.
  const timeDateTokenRegex = /\b(tomorrow|today|tonight|morning|evening|afternoon|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|\d{1,2}(?::\d{2})?\s*(?:am|pm)|o'clock|at\s+\d{1,2})\b/i;
  const hasTimeToken = timeDateTokenRegex.test(lower);

  const explicitVerbRegex = /\b(remind|schedule|follow up|follow-up|call|meet|meeting|demo)\b/i;
  const hasExplicitVerb = explicitVerbRegex.test(lower);

  const leadMatch = 
    text.match(/(?:call|to|with|about)\s+([A-Z][a-z]+)/) ||
    text.match(/^([A-Z][a-z]+)\s+(?:told me|said|is free)/i) ||
    text.match(/lead\s+([A-Z][a-z]+)/i);

  const hasExtractableLead = Boolean(leadMatch && leadMatch[1] && leadMatch[1].toLowerCase() !== 'me');

  const hasSchedulingSignal = hasTimeToken || (hasExplicitVerb && hasExtractableLead);

  if (hasSchedulingSignal) {
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

  // Pattern 5: ELSE -> return toolName 'unknown' (do NOT fabricate a follow-up)
  return {
    toolName: 'unknown',
    args: {},
    confidence: 0.1,
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
