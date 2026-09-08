import type { Database, LeadStatus, TaskPriority, TaskStatus, ReminderStatus, ActivityType } from './database';

export type { Database, LeadStatus, TaskPriority, TaskStatus, ReminderStatus, ActivityType };

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Lead = Database['public']['Tables']['leads']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Reminder = Database['public']['Tables']['reminders']['Row'];
export type LeadActivity = Database['public']['Tables']['lead_activities']['Row'];
export type AiAction = Database['public']['Tables']['ai_actions']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

export interface TaskWithLead extends Task {
  lead?: Lead | null;
  reminders?: Reminder[];
}

export type FocusCategory = 'NOW' | 'NEXT' | 'OVERDUE' | 'TODAY';

export interface FocusGroupedTasks {
  now: TaskWithLead[];
  next: TaskWithLead[];
  overdue: TaskWithLead[];
  today: TaskWithLead[];
}
