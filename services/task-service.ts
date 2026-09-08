import { Task, TaskWithLead, Reminder, TaskPriority, FocusGroupedTasks } from '@/types/models';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, memoryStore } from './store';
import { findOrCreateLead, getLeadById } from './lead-service';
import { scheduleReminder } from './reminder-service';
import { logAuditEvent } from './audit-service';
import { categorizeTask, isTaskDueToday, DEFAULT_TIMEZONE, formatFriendlyDateTime } from '@/lib/time';

export interface CreateFollowUpParams {
  leadId?: string;
  leadName?: string;
  title: string;
  description?: string;
  dueAt: string; // UTC ISO string
  reminderAt?: string; // UTC ISO string
  priority?: TaskPriority;
}

/**
 * Creates a follow-up task, resolves lead, schedules reminder, and logs lead activity
 */
export async function createFollowUp(
  params: CreateFollowUpParams,
  userId: string = 'user-default'
): Promise<{ task: TaskWithLead; reminder?: Reminder }> {
  const { title, description, dueAt, reminderAt, priority = 'medium' } = params;

  // Validate due date
  const dueDate = new Date(dueAt);
  if (isNaN(dueDate.getTime())) {
    throw new Error(`Invalid due date timestamp: ${dueAt}`);
  }

  // Resolve Lead: either by ID or by name
  let leadId = params.leadId;
  let resolvedLead = null;

  if (leadId) {
    resolvedLead = await getLeadById(leadId);
  } else if (params.leadName) {
    resolvedLead = await findOrCreateLead(params.leadName, userId);
    leadId = resolvedLead.id;
  }

  let createdTask: Task;

  if (!isSupabaseConfigured()) {
    createdTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description?.trim() || null,
      lead_id: leadId || null,
      assigned_to: userId,
      due_at: dueDate.toISOString(),
      priority,
      status: 'pending',
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.tasks.unshift(createdTask);
  } else {
    const supabase: any = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        lead_id: leadId || null,
        assigned_to: userId,
        due_at: dueDate.toISOString(),
        priority,
        status: 'pending',
        created_by: userId,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create task: ${error?.message}`);
    }
    createdTask = data as Task;
  }

  // Schedule reminder if specified
  let createdReminder: Reminder | undefined;
  if (reminderAt) {
    createdReminder = await scheduleReminder(createdTask.id, reminderAt, userId);
  }

  // Add Lead Activity if lead is associated
  if (leadId) {
    const friendlyDue = formatFriendlyDateTime(createdTask.due_at);
    const content = `Scheduled follow-up: "${createdTask.title}" for ${friendlyDue}.${
      description ? ` Context: ${description}` : ''
    }`;

    if (!isSupabaseConfigured()) {
      memoryStore.leadActivities.unshift({
        id: `act-${Date.now()}`,
        lead_id: leadId,
        user_id: userId,
        activity_type: 'follow_up_scheduled',
        content,
        created_at: new Date().toISOString(),
      });
    } else {
      const supabase: any = await createServerSupabaseClient();
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        user_id: userId,
        activity_type: 'follow_up_scheduled',
        content,
      });
    }
  }

  await logAuditEvent({
    userId,
    action: 'TASK_CREATED',
    entityType: 'task',
    entityId: createdTask.id,
    metadata: {
      title: createdTask.title,
      leadId,
      dueAt: createdTask.due_at,
      reminderAt,
    },
  });

  const taskWithLead: TaskWithLead = {
    ...createdTask,
    lead: resolvedLead,
    reminders: createdReminder ? [createdReminder] : [],
  };

  return { task: taskWithLead, reminder: createdReminder };
}

/**
 * Updates an existing task
 */
export async function updateFollowUp(
  taskId: string,
  updates: Partial<Task>,
  userId: string = 'user-default'
): Promise<TaskWithLead> {
  if (!isSupabaseConfigured()) {
    const taskIndex = memoryStore.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found`);
    }
    memoryStore.tasks[taskIndex] = {
      ...memoryStore.tasks[taskIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    const updated = memoryStore.tasks[taskIndex];
    const lead = updated.lead_id ? await getLeadById(updated.lead_id) : null;
    return { ...updated, lead };
  }

  const supabase: any = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('*, lead:leads(*)')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update task: ${error?.message}`);
  }

  return data as TaskWithLead;
}

/**
 * Marks a follow-up task completed and logs activity
 */
export async function completeFollowUp(
  taskId: string,
  notes?: string,
  userId: string = 'user-default'
): Promise<TaskWithLead> {
  if (!isSupabaseConfigured()) {
    const task = memoryStore.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.status = 'completed';
    task.updated_at = new Date().toISOString();

    if (task.lead_id) {
      memoryStore.leadActivities.unshift({
        id: `act-${Date.now()}`,
        lead_id: task.lead_id,
        user_id: userId,
        activity_type: 'follow_up_completed',
        content: `Completed follow-up: "${task.title}".${notes ? ` Result/Note: ${notes}` : ''}`,
        created_at: new Date().toISOString(),
      });
    }

    await logAuditEvent({
      userId,
      action: 'TASK_COMPLETED',
      entityType: 'task',
      entityId: taskId,
      metadata: { notes },
    });

    const lead = task.lead_id ? await getLeadById(task.lead_id) : null;
    return { ...task, lead };
  }

  const supabase: any = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('*, lead:leads(*)')
    .single();

  if (error || !data) {
    throw new Error(`Failed to complete task: ${error?.message}`);
  }

  const completedTask = data as TaskWithLead;

  if (completedTask.lead_id) {
    await supabase.from('lead_activities').insert({
      lead_id: completedTask.lead_id,
      user_id: userId,
      activity_type: 'follow_up_completed',
      content: `Completed follow-up: "${completedTask.title}".${notes ? ` Result/Note: ${notes}` : ''}`,
    });
  }

  await logAuditEvent({
    userId,
    action: 'TASK_COMPLETED',
    entityType: 'task',
    entityId: taskId,
    metadata: { notes },
  });

  return completedTask;
}

/**
 * Reschedules a follow-up task to a new due time
 */
export async function rescheduleFollowUp(
  taskId: string,
  newDueAt: string,
  newReminderAt?: string,
  userId: string = 'user-default'
): Promise<{ task: TaskWithLead; reminder?: Reminder }> {
  const newDueDate = new Date(newDueAt);
  if (isNaN(newDueDate.getTime())) {
    throw new Error(`Invalid rescheduled date: ${newDueAt}`);
  }

  let updatedTask: Task;
  let lead: any = null;

  if (!isSupabaseConfigured()) {
    const task = memoryStore.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.due_at = newDueDate.toISOString();
    task.status = 'pending';
    task.updated_at = new Date().toISOString();
    updatedTask = task;
    lead = task.lead_id ? await getLeadById(task.lead_id) : null;
  } else {
    const supabase: any = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('tasks')
      .update({
        due_at: newDueDate.toISOString(),
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select('*, lead:leads(*)')
      .single();

    if (error || !data) {
      throw new Error(`Failed to reschedule task: ${error?.message}`);
    }
    updatedTask = data as Task;
    lead = (data as any).lead;
  }

  let reminder: Reminder | undefined;
  if (newReminderAt) {
    reminder = await scheduleReminder(taskId, newReminderAt, userId);
  }

  if (updatedTask.lead_id) {
    const friendlyDue = formatFriendlyDateTime(updatedTask.due_at);
    const content = `Rescheduled follow-up "${updatedTask.title}" to ${friendlyDue}.`;

    if (!isSupabaseConfigured()) {
      memoryStore.leadActivities.unshift({
        id: `act-${Date.now()}`,
        lead_id: updatedTask.lead_id,
        user_id: userId,
        activity_type: 'follow_up_rescheduled',
        content,
        created_at: new Date().toISOString(),
      });
    } else {
      const supabase: any = await createServerSupabaseClient();
      await supabase.from('lead_activities').insert({
        lead_id: updatedTask.lead_id,
        user_id: userId,
        activity_type: 'follow_up_rescheduled',
        content,
      });
    }
  }

  await logAuditEvent({
    userId,
    action: 'TASK_RESCHEDULED',
    entityType: 'task',
    entityId: taskId,
    metadata: { newDueAt, newReminderAt },
  });

  return {
    task: { ...updatedTask, lead },
    reminder,
  };
}

/**
 * Hard deletes a task (used by Undo action)
 */
export async function deleteTask(taskId: string, userId: string = 'user-default'): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const idx = memoryStore.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      memoryStore.tasks.splice(idx, 1);
      // Remove associated reminders
      memoryStore.reminders = memoryStore.reminders.filter(r => r.task_id !== taskId);
      await logAuditEvent({
        userId,
        action: 'TASK_DELETED',
        entityType: 'task',
        entityId: taskId,
      });
      return true;
    }
    return false;
  }

  const supabase: any = await createServerSupabaseClient();
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);

  if (error) {
    console.error('deleteTask error:', error);
    return false;
  }

  await logAuditEvent({
    userId,
    action: 'TASK_DELETED',
    entityType: 'task',
    entityId: taskId,
  });

  return true;
}

/**
 * Retrieves today's tasks
 */
export async function getTodaysTasks(
  userId: string = 'user-default',
  timezone: string = DEFAULT_TIMEZONE
): Promise<TaskWithLead[]> {
  const allTasks = await getAllActiveTasks(userId);
  return allTasks.filter(task => isTaskDueToday(task.due_at, timezone));
}

/**
 * Retrieves overdue tasks
 */
export async function getOverdueTasks(
  userId: string = 'user-default',
  timezone: string = DEFAULT_TIMEZONE
): Promise<TaskWithLead[]> {
  const allTasks = await getAllActiveTasks(userId);
  const now = new Date();
  return allTasks.filter(task => new Date(task.due_at) < now && task.status === 'pending');
}

/**
 * Helper to fetch all active tasks with hydrated leads and reminders
 */
async function getAllActiveTasks(userId: string = 'user-default'): Promise<TaskWithLead[]> {
  if (!isSupabaseConfigured()) {
    const tasks = memoryStore.tasks.filter(
      t => t.status === 'pending' && (!t.assigned_to || t.assigned_to === userId)
    );
    return tasks.map(t => {
      const lead = t.lead_id ? memoryStore.leads.find(l => l.id === t.lead_id) || null : null;
      const reminders = memoryStore.reminders.filter(r => r.task_id === t.id);
      return { ...t, lead, reminders };
    });
  }

  const supabase: any = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('*, lead:leads(*), reminders(*)')
    .eq('assigned_to', userId)
    .eq('status', 'pending')
    .order('due_at', { ascending: true });

  if (error) {
    console.error('getAllActiveTasks error:', error);
    return [];
  }

  return (data as any[]) || [];
}

/**
 * Groups tasks into NOW, NEXT, OVERDUE, and TODAY for the "My Focus" dashboard
 */
export async function getFocusGroupedTasks(
  userId: string = 'user-default',
  timezone: string = DEFAULT_TIMEZONE,
  referenceNow: Date = new Date()
): Promise<FocusGroupedTasks> {
  const tasks = await getAllActiveTasks(userId);

  const grouped: FocusGroupedTasks = {
    now: [],
    next: [],
    overdue: [],
    today: [],
  };

  for (const task of tasks) {
    const category = categorizeTask(task.due_at, timezone, referenceNow);
    if (category === 'OVERDUE') {
      grouped.overdue.push(task);
    } else if (category === 'NOW') {
      grouped.now.push(task);
    } else if (category === 'NEXT') {
      grouped.next.push(task);
    }

    if (isTaskDueToday(task.due_at, timezone, referenceNow)) {
      grouped.today.push(task);
    }
  }

  // Sort by due_at
  const sortByDue = (a: TaskWithLead, b: TaskWithLead) =>
    new Date(a.due_at).getTime() - new Date(b.due_at).getTime();

  grouped.now.sort(sortByDue);
  grouped.next.sort(sortByDue);
  grouped.overdue.sort(sortByDue);
  grouped.today.sort(sortByDue);

  return grouped;
}
