import { z } from 'zod';

export const CreateFollowUpSchema = z.object({
  leadName: z.string().min(1, 'Lead name is required').trim(),
  action: z.string().default('Call').describe('Action type like Call, Meeting, Email, Demo'),
  dueAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)).describe('UTC or ISO 8601 due timestamp'),
  reminderAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)).optional().describe('UTC or ISO 8601 reminder timestamp'),
  notes: z.string().optional().describe('Context, notes, or reason for follow-up'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export const RescheduleFollowUpSchema = z.object({
  leadName: z.string().min(1).optional(),
  taskId: z.string().optional(),
  newDueAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
  newReminderAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)).optional(),
  notes: z.string().optional(),
});

export const CompleteFollowUpSchema = z.object({
  leadName: z.string().min(1).optional(),
  taskId: z.string().optional(),
  notes: z.string().optional().describe('Outcome of the call/meeting, e.g. "Arjun didn\'t answer" or "Contract signed"'),
  scheduleNext: z.boolean().optional(),
});

export const AddLeadNoteSchema = z.object({
  leadName: z.string().min(1, 'Lead name is required'),
  note: z.string().min(1, 'Note text is required'),
});

export const SearchLeadSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
});

export const CreateLeadSchema = z.object({
  name: z.string().min(1, 'Lead name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

export const ScheduleReminderSchema = z.object({
  taskId: z.string().min(1),
  remindAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
});

export const HighRiskActionSchema = z.object({
  action: z.enum(['delete_lead', 'bulk_update', 'bulk_delete']),
  targetId: z.string(),
  reason: z.string().optional(),
});

export type CreateFollowUpInput = z.infer<typeof CreateFollowUpSchema>;
export type RescheduleFollowUpInput = z.infer<typeof RescheduleFollowUpSchema>;
export type CompleteFollowUpInput = z.infer<typeof CompleteFollowUpSchema>;
export type AddLeadNoteInput = z.infer<typeof AddLeadNoteSchema>;
export type SearchLeadInput = z.infer<typeof SearchLeadSchema>;
export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
