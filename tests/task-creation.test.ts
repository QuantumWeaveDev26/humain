import { describe, it, expect, beforeEach } from 'vitest';
import { createFollowUp, completeFollowUp, rescheduleFollowUp, getFocusGroupedTasks } from '@/services/task-service';
import { executeAssistantCommand } from '@/ai/orchestrator';
import { undoAiAction } from '@/services/ai-action-service';
import { memoryStore } from '@/services/store';

describe('Task Creation and Follow-up Flow Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    memoryStore.reset();
  });

  it('creates follow-up with lead resolution and reminder', async () => {
    const dueAt = '2026-09-04T11:30:00.000Z'; // 5:00 PM IST
    const reminderAt = '2026-09-04T11:25:00.000Z'; // 4:55 PM IST

    const result = await createFollowUp(
      {
        leadName: 'Arjun Mehta',
        title: 'Call Arjun',
        description: 'Arjun said he will be free at 5 PM',
        dueAt,
        reminderAt,
      },
      'user-default'
    );

    expect(result.task).toBeDefined();
    expect(result.task.title).toBe('Call Arjun');
    expect(result.task.lead?.name).toBe('Arjun Mehta');
    expect(result.reminder).toBeDefined();
    expect(result.reminder?.remind_at).toBe(reminderAt);

    // Verify lead activity was recorded
    const activities = memoryStore.leadActivities.filter(a => a.lead_id === result.task.lead_id);
    expect(activities.length).toBeGreaterThan(0);
    expect(activities[0].activity_type).toBe('follow_up_scheduled');
  });

  it('completes follow-up and logs completion activity', async () => {
    // Create initial task
    const { task } = await createFollowUp({
      leadName: 'Arjun Mehta',
      title: 'Call Arjun',
      dueAt: '2026-09-04T11:30:00.000Z',
    });

    const completed = await completeFollowUp(task.id, 'Spoke with Arjun, agreed to move forward.');
    expect(completed.status).toBe('completed');

    const activities = memoryStore.leadActivities.filter(a => a.lead_id === task.lead_id);
    const completionAct = activities.find(a => a.activity_type === 'follow_up_completed');
    expect(completionAct).toBeDefined();
    expect(completionAct?.content).toContain('Spoke with Arjun');
  });

  it('reschedules follow-up to new time', async () => {
    const { task } = await createFollowUp({
      leadName: 'Arjun Mehta',
      title: 'Call Arjun',
      dueAt: '2026-09-04T11:30:00.000Z',
    });

    const newDue = '2026-09-05T04:30:00.000Z'; // Tomorrow 10 AM IST
    const rescheduled = await rescheduleFollowUp(task.id, newDue);

    expect(rescheduled.task.due_at).toBe(newDue);
    expect(rescheduled.task.status).toBe('pending');
  });

  it('executes full assistant command end-to-end and supports Undo', async () => {
    const commandText = 'Remind me to call Arjun today at 5 PM, five minutes before.';
    const execResult = await executeAssistantCommand({
      commandText,
      userTimezone: 'Asia/Kolkata',
      referenceTime: '2026-09-04T10:00:00.000Z',
      userId: 'user-default',
    });

    expect(execResult.success).toBe(true);
    expect(execResult.intent).toBe('create_follow_up');
    expect(execResult.confirmationMessage).toContain('Arjun');
    expect(execResult.undoable).toBe(true);
    expect(execResult.aiActionId).toBeDefined();

    // Verify task exists in store
    const createdTaskId = execResult.data?.task?.id;
    expect(memoryStore.tasks.some(t => t.id === createdTaskId)).toBe(true);

    // Perform Undo
    const undoResult = await undoAiAction(execResult.aiActionId!, 'user-default');
    expect(undoResult.success).toBe(true);

    // Verify task was deleted by Undo
    expect(memoryStore.tasks.some(t => t.id === createdTaskId)).toBe(false);
  });

  it('executes "Remember Arjun said to contact him tomorrow at 4 pm" -> note on Arjun + follow-up created tomorrow ~4pm', async () => {
    const commandText = 'Remember Arjun said to contact him tomorrow at 4 pm';
    const execResult = await executeAssistantCommand({
      commandText,
      userTimezone: 'Asia/Kolkata',
      referenceTime: '2026-09-04T10:00:00.000Z', // 3:30 PM IST
      userId: 'user-default',
    });

    expect(execResult.success).toBe(true);
    expect(execResult.intent).toBe('remember');
    expect(execResult.confirmationMessage).toContain('Arjun');
    expect(execResult.undoable).toBe(true);

    // Note added to Arjun's timeline
    const arjunActivities = memoryStore.leadActivities.filter(a => a.lead_id === 'lead-1');
    expect(arjunActivities.some(a => a.content.includes('Remember Arjun said'))).toBe(true);

    // Follow-up task created in memoryStore.tasks
    const followUpTask = memoryStore.tasks.find(t => t.lead_id === 'lead-1' && t.due_at === '2026-09-05T10:30:00.000Z');
    expect(followUpTask).toBeDefined();
    expect(followUpTask?.title).toContain('Arjun');
  });

  it('executes "Remember to review the pricing deck" -> general note, NO task', async () => {
    const initialTaskCount = memoryStore.tasks.length;
    const commandText = 'Remember to review the pricing deck';
    const execResult = await executeAssistantCommand({
      commandText,
      userTimezone: 'Asia/Kolkata',
      referenceTime: '2026-09-04T10:00:00.000Z',
      userId: 'user-default',
    });

    expect(execResult.success).toBe(true);
    expect(execResult.intent).toBe('remember');
    expect(execResult.confirmationMessage).toBe("I'll remember that for you.");
    expect(execResult.undoable).toBe(false);

    // General note added
    expect(memoryStore.notes.some(n => n.content.includes('Remember to review the pricing deck'))).toBe(true);

    // NO new task created
    expect(memoryStore.tasks.length).toBe(initialTaskCount);
  });

  it('executes non-actionable command (e.g. "what\'s the weather") -> unknown, NOT create_follow_up, NO task', async () => {
    const initialTaskCount = memoryStore.tasks.length;
    const commandText = "what's the weather";
    const execResult = await executeAssistantCommand({
      commandText,
      userTimezone: 'Asia/Kolkata',
      referenceTime: '2026-09-04T10:00:00.000Z',
      userId: 'user-default',
    });

    expect(execResult.intent).toBe('unknown');
    expect(execResult.success).toBe(false);
    expect(memoryStore.tasks.length).toBe(initialTaskCount);
  });
});
