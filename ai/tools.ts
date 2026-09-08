import { FunctionDeclaration, SchemaType } from '@google/generative-ai';

export const aiFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: 'create_follow_up',
    description: 'Creates a follow-up task/reminder for a lead or client. Automatically finds or creates the lead if not already present. Handles relative due times and reminder offsets.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        leadName: {
          type: SchemaType.STRING,
          description: 'The name of the lead or contact person (e.g. "Arjun", "Rahul Sharma").',
        },
        action: {
          type: SchemaType.STRING,
          description: 'The action to perform, e.g. "Call", "Follow-up", "Meeting", "Email", "Send Proposal". Default is "Call".',
        },
        dueAt: {
          type: SchemaType.STRING,
          description: 'Exact ISO 8601 UTC timestamp when the task is due (e.g. "2026-09-04T11:30:00.000Z").',
        },
        reminderAt: {
          type: SchemaType.STRING,
          description: 'Exact ISO 8601 UTC timestamp when the user should be reminded (e.g. 5 minutes before dueAt).',
        },
        notes: {
          type: SchemaType.STRING,
          description: 'Context notes from the conversation, reason for call, or lead statement (e.g. "Arjun told me he will be free at 5 PM").',
        },
        priority: {
          type: SchemaType.STRING,
          description: 'Priority level: "low", "medium", "high", or "urgent". Default is "medium".',
        },
      },
      required: ['leadName', 'dueAt'],
    },
  },
  {
    name: 'reschedule_follow_up',
    description: 'Reschedules an existing task or follow-up for a lead to a new date and time.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        leadName: {
          type: SchemaType.STRING,
          description: 'The name of the lead whose task is being rescheduled.',
        },
        taskId: {
          type: SchemaType.STRING,
          description: 'The optional ID of the task to reschedule if known.',
        },
        newDueAt: {
          type: SchemaType.STRING,
          description: 'The new due date/time in ISO 8601 UTC string.',
        },
        newReminderAt: {
          type: SchemaType.STRING,
          description: 'The new reminder date/time in ISO 8601 UTC string.',
        },
        notes: {
          type: SchemaType.STRING,
          description: 'Reason for rescheduling or additional context.',
        },
      },
      required: ['newDueAt'],
    },
  },
  {
    name: 'complete_follow_up',
    description: 'Marks a follow-up task as completed, optionally logs outcome notes, and can chain into a subsequent follow-up.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        leadName: {
          type: SchemaType.STRING,
          description: 'The name of the lead whose task was completed.',
        },
        taskId: {
          type: SchemaType.STRING,
          description: 'The optional ID of the task to complete.',
        },
        notes: {
          type: SchemaType.STRING,
          description: 'Outcome of the interaction, e.g. "Arjun did not answer", "Agreed to sign contract tomorrow".',
        },
      },
    },
  },
  {
    name: 'add_lead_note',
    description: 'Adds an activity note or call log to a lead profile without necessarily creating a task.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        leadName: {
          type: SchemaType.STRING,
          description: 'The name of the lead.',
        },
        note: {
          type: SchemaType.STRING,
          description: 'The note or call summary to record.',
        },
      },
      required: ['leadName', 'note'],
    },
  },
  {
    name: 'search_lead',
    description: 'Searches for existing leads by name, phone, or company.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: 'The search query (e.g. name "Arjun").',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_lead',
    description: 'Explicitly creates a new lead with contact information.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: 'The full name of the lead.',
        },
        phone: {
          type: SchemaType.STRING,
          description: 'Phone number.',
        },
        email: {
          type: SchemaType.STRING,
          description: 'Email address.',
        },
        company: {
          type: SchemaType.STRING,
          description: 'Company name.',
        },
        notes: {
          type: SchemaType.STRING,
          description: 'Initial notes.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_todays_tasks',
    description: 'Retrieves all tasks scheduled for today for the user.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_overdue_tasks',
    description: 'Retrieves all overdue tasks that need immediate attention.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];
