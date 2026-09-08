import { Reminder } from '@/types/models';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, memoryStore } from './store';
import { logAuditEvent } from './audit-service';

/**
 * Schedules an in-app reminder for a task
 */
export async function scheduleReminder(
  taskId: string,
  remindAt: string,
  userId: string = 'user-default'
): Promise<Reminder> {
  // Validate reminder date
  const remindDate = new Date(remindAt);
  if (isNaN(remindDate.getTime())) {
    throw new Error('Invalid reminder timestamp provided');
  }

  if (!isSupabaseConfigured()) {
    const reminder: Reminder = {
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      task_id: taskId,
      remind_at: remindDate.toISOString(),
      status: 'scheduled',
      created_at: new Date().toISOString(),
    };
    memoryStore.reminders.push(reminder);

    await logAuditEvent({
      userId,
      action: 'REMINDER_SCHEDULED',
      entityType: 'reminder',
      entityId: reminder.id,
      metadata: { taskId, remindAt: reminder.remind_at },
    });

    return reminder;
  }

  const supabase: any = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      task_id: taskId,
      remind_at: remindDate.toISOString(),
      status: 'scheduled',
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to schedule reminder: ${error?.message}`);
  }

  const reminder = data as Reminder;

  await logAuditEvent({
    userId,
    action: 'REMINDER_SCHEDULED',
    entityType: 'reminder',
    entityId: reminder.id,
    metadata: { taskId, remindAt: reminder.remind_at },
  });

  return reminder;
}

/**
 * Cancels or deletes a scheduled reminder
 */
export async function cancelReminder(reminderId: string, userId: string = 'user-default'): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const rem = memoryStore.reminders.find(r => r.id === reminderId);
    if (rem) {
      rem.status = 'cancelled';
      await logAuditEvent({
        userId,
        action: 'REMINDER_CANCELLED',
        entityType: 'reminder',
        entityId: reminderId,
      });
      return true;
    }
    return false;
  }

  const supabase: any = await createServerSupabaseClient();
  const { error } = await supabase
    .from('reminders')
    .update({ status: 'cancelled' })
    .eq('id', reminderId);

  if (error) {
    console.error('cancelReminder error:', error);
    return false;
  }

  await logAuditEvent({
    userId,
    action: 'REMINDER_CANCELLED',
    entityType: 'reminder',
    entityId: reminderId,
  });

  return true;
}

export type PendingReminder = Reminder & { taskTitle?: string; leadName?: string };

/**
 * Retrieves pending reminders that are ready to fire
 */
export async function getPendingReminders(userId: string = 'user-default'): Promise<PendingReminder[]> {
  const nowIso = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    return memoryStore.reminders
      .filter(r => r.status === 'scheduled' && r.remind_at <= nowIso)
      .map(r => {
        const task = memoryStore.tasks.find(t => t.id === r.task_id);
        const taskTitle = task?.title;
        const lead = task?.lead_id ? memoryStore.leads.find(l => l.id === task.lead_id) : undefined;
        const leadName = lead?.name;
        return {
          ...r,
          taskTitle,
          leadName,
        };
      });
  }

  const supabase: any = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('reminders')
    .select('*, tasks!inner(title, assigned_to, lead_id, leads(name))')
    .eq('status', 'scheduled')
    .lte('remind_at', nowIso)
    .eq('tasks.assigned_to', userId);

  if (error) {
    console.error('getPendingReminders error:', error);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    task_id: r.task_id,
    remind_at: r.remind_at,
    status: r.status,
    created_at: r.created_at,
    taskTitle: r.tasks?.title,
    leadName: r.tasks?.leads?.name,
  }));
}

/**
 * Marks reminder as sent or dismissed
 */
export async function markReminderSent(reminderId: string): Promise<Reminder> {
  if (!isSupabaseConfigured()) {
    const rem = memoryStore.reminders.find(r => r.id === reminderId);
    if (rem) {
      rem.status = 'sent';
      return rem;
    }
    throw new Error('Reminder not found');
  }

  const supabase: any = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('reminders')
    .update({ status: 'sent' })
    .eq('id', reminderId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update reminder: ${error?.message}`);
  }

  return data as Reminder;
}
