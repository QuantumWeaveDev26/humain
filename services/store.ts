import { Lead, Task, Reminder, LeadActivity, AiAction, AuditLog, TaskWithLead } from '@/types/models';
import { addMinutes, subMinutes } from 'date-fns';

/**
 * In-memory fallback store for development, automated testing, and preview
 * when Supabase connection parameters are not yet provided.
 */
class MemoryStore {
  public leads: Lead[] = [
    {
      id: 'lead-1',
      name: 'Arjun Mehta',
      phone: '+91 98765 43210',
      email: 'arjun.mehta@example.com',
      company: 'Apex Solutions',
      status: 'in_progress',
      owner_id: 'user-default',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'lead-2',
      name: 'Rahul Sharma',
      phone: '+91 98111 22334',
      email: 'rahul.s@techcorp.in',
      company: 'TechCorp India',
      status: 'contacted',
      owner_id: 'user-default',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'lead-3',
      name: 'Priya Nair',
      phone: '+91 97222 33445',
      email: 'priya.nair@innovate.co',
      company: 'Innovate Labs',
      status: 'new',
      owner_id: 'user-default',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ];

  public tasks: Task[] = [
    {
      id: 'task-1',
      title: 'Call Priya — callback',
      description: 'Discuss pricing proposal',
      lead_id: 'lead-3',
      assigned_to: 'user-default',
      due_at: subMinutes(new Date(), 90).toISOString(), // 90 min ago (OVERDUE)
      priority: 'high',
      status: 'pending',
      created_by: 'user-default',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'task-2',
      title: 'Call Arjun',
      description: 'Follow-up regarding annual contract renewal',
      lead_id: 'lead-1',
      assigned_to: 'user-default',
      due_at: addMinutes(new Date(), 15).toISOString(), // 15 min from now (NOW)
      priority: 'high',
      status: 'pending',
      created_by: 'user-default',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'task-3',
      title: 'Rahul follow-up',
      description: 'Demo product capabilities to engineering team',
      lead_id: 'lead-2',
      assigned_to: 'user-default',
      due_at: addMinutes(new Date(), 120).toISOString(), // 2 hours from now (NEXT)
      priority: 'medium',
      status: 'pending',
      created_by: 'user-default',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  public reminders: Reminder[] = [
    {
      id: 'rem-2',
      task_id: 'task-2',
      remind_at: addMinutes(new Date(), 10).toISOString(),
      status: 'scheduled',
      created_at: new Date().toISOString(),
    },
    {
      id: 'rem-3',
      task_id: 'task-3',
      remind_at: addMinutes(new Date(), 115).toISOString(),
      status: 'scheduled',
      created_at: new Date().toISOString(),
    },
  ];

  public leadActivities: LeadActivity[] = [
    {
      id: 'act-1',
      lead_id: 'lead-1',
      user_id: 'user-default',
      activity_type: 'call',
      content: 'Discussed initial requirements. Arjun mentioned he is interested in enterprise tier.',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'act-2',
      lead_id: 'lead-3',
      user_id: 'user-default',
      activity_type: 'status_changed',
      content: 'Lead created and marked as New.',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ];

  public aiActions: AiAction[] = [];
  public auditLogs: AuditLog[] = [];

  public reset() {
    this.aiActions = [];
    this.auditLogs = [];
  }
}

// Global singleton across hot-reloads
const globalStore = (global as any).__humainMemoryStore || new MemoryStore();
if (process.env.NODE_ENV !== 'production') {
  (global as any).__humainMemoryStore = globalStore;
}

export const memoryStore: MemoryStore = globalStore;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('your-project-id') && !url.includes('placeholder'));
}
