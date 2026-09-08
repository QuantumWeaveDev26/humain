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
});
