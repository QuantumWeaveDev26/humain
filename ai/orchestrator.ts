import { CommandRequest, CommandExecutionResult, AIIntent } from '@/types/assistant';
import { getGeminiModel, parseCommandOfflineFallback } from './gemini-client';
import {
  CreateFollowUpSchema,
  RescheduleFollowUpSchema,
  CompleteFollowUpSchema,
  AddLeadNoteSchema,
  SearchLeadSchema,
  CreateLeadSchema,
} from './schemas';
import {
  createFollowUp,
  rescheduleFollowUp,
  completeFollowUp,
  getTodaysTasks,
  getOverdueTasks,
} from '@/services/task-service';
import { searchLead, createLead, addLeadNote, getLeadHistory } from '@/services/lead-service';
import { recordAiAction } from '@/services/ai-action-service';
import { formatTimeInTz, formatFriendlyDateTime, DEFAULT_TIMEZONE } from '@/lib/time';

/**
 * AI Command Orchestrator
 * Interprets natural language user commands, safely validates arguments,
 * routes execution through the controlled business service layer, and logs AI actions.
 */
export async function executeAssistantCommand(request: CommandRequest): Promise<CommandExecutionResult> {
  const {
    commandText,
    userTimezone = DEFAULT_TIMEZONE,
    referenceTime = new Date().toISOString(),
    userId = 'user-default',
  } = request;

  const referenceDate = new Date(referenceTime);

  // 1. Obtain tool call from Gemini or Smart Fallback
  let toolName = '';
  let toolArgs: any = {};

  const gemini = getGeminiModel();

  if (gemini) {
    try {
      const systemInstruction = `
You are an executive assistant for a sales and follow-up team.
Today is ${referenceDate.toISOString()} in timezone ${userTimezone}.
Current local time is ${formatFriendlyDateTime(referenceTime, userTimezone)}.
The user communicates by voice or text.
Analyze the user request, identify their intent, and call the appropriate function tool.
Always convert dates/times mentioned relative to today/now into UTC ISO 8601 strings.
If a reminder offset is mentioned (e.g. "5 minutes before"), compute reminderAt by subtracting that offset from dueAt.
      `.trim();

      const chat = gemini.startChat({
        systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
      });

      const response = await chat.sendMessage(commandText);
      const functionCalls = response.response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        toolName = call.name;
        toolArgs = call.args;
      }
    } catch (err) {
      console.warn('Gemini API call failed, using smart offline fallback:', err);
    }
  }

  // Fallback if no tool was called by Gemini
  if (!toolName) {
    const fallback = parseCommandOfflineFallback(commandText, referenceDate, userTimezone);
    toolName = fallback.toolName;
    toolArgs = fallback.args;
  }

  // 2. Controlled Execution Layer with Zod Validation
  try {
    switch (toolName) {
      case 'create_follow_up': {
        const validated = CreateFollowUpSchema.parse(toolArgs);

        const result = await createFollowUp(
          {
            leadName: validated.leadName,
            title: `${validated.action} ${validated.leadName}`,
            description: validated.notes,
            dueAt: validated.dueAt,
            reminderAt: validated.reminderAt,
            priority: validated.priority,
          },
          userId
        );

        const formattedDue = formatTimeInTz(result.task.due_at, userTimezone);
        const reminderText = result.reminder
          ? ` and I'll remind you at ${formatTimeInTz(result.reminder.remind_at, userTimezone)}`
          : '';

        const confirmation = `I scheduled your follow-up with ${validated.leadName} for ${formattedDue}${reminderText}.`;

        // Record AI Action for audit & undo
        const aiAction = await recordAiAction({
          userId,
          commandText,
          intent: 'create_follow_up',
          toolName: 'create_follow_up',
          inputJson: validated,
          outputJson: { taskId: result.task.id, reminderId: result.reminder?.id },
          undoState: {
            type: 'create_follow_up',
            taskId: result.task.id,
            reminderId: result.reminder?.id,
          },
          status: 'executed',
        });

        return {
          success: true,
          intent: 'create_follow_up',
          toolName: 'create_follow_up',
          summary: `Follow-up created for ${validated.leadName}`,
          confirmationMessage: confirmation,
          data: result,
          aiActionId: aiAction.id,
          undoable: true,
          rawToolCall: { name: toolName, args: validated },
        };
      }

      case 'reschedule_follow_up': {
        const validated = RescheduleFollowUpSchema.parse(toolArgs);

        let taskId = validated.taskId;
        if (!taskId && validated.leadName) {
          const leads = await searchLead(validated.leadName, userId);
          if (leads.length > 0) {
            // Find active task for this lead
            const todays = await getTodaysTasks(userId, userTimezone);
            const task = todays.find(t => t.lead_id === leads[0].id);
            if (task) taskId = task.id;
          }
        }

        if (!taskId) {
          // If no specific task was found, create a new one for that date/time
          const created = await createFollowUp(
            {
              leadName: validated.leadName || 'Lead',
              title: `Follow-up with ${validated.leadName || 'Lead'}`,
              description: validated.notes,
              dueAt: validated.newDueAt,
              reminderAt: validated.newReminderAt,
            },
            userId
          );

          const formattedDue = formatFriendlyDateTime(created.task.due_at, userTimezone);
          const confirmation = `I rescheduled your follow-up with ${validated.leadName || 'Lead'} to ${formattedDue}.`;

          const aiAction = await recordAiAction({
            userId,
            commandText,
            intent: 'reschedule_follow_up',
            toolName: 'reschedule_follow_up',
            inputJson: validated,
            outputJson: { taskId: created.task.id },
            undoState: { type: 'create_follow_up', taskId: created.task.id },
            status: 'executed',
          });

          return {
            success: true,
            intent: 'reschedule_follow_up',
            toolName: 'reschedule_follow_up',
            summary: `Rescheduled follow-up to ${formattedDue}`,
            confirmationMessage: confirmation,
            data: created,
            aiActionId: aiAction.id,
            undoable: true,
            rawToolCall: { name: toolName, args: validated },
          };
        }

        const result = await rescheduleFollowUp(
          taskId,
          validated.newDueAt,
          validated.newReminderAt,
          userId
        );

        const formattedDue = formatFriendlyDateTime(result.task.due_at, userTimezone);
        const confirmation = `I rescheduled your follow-up with ${result.task.lead?.name || 'the lead'} to ${formattedDue}.`;

        const aiAction = await recordAiAction({
          userId,
          commandText,
          intent: 'reschedule_follow_up',
          toolName: 'reschedule_follow_up',
          inputJson: validated,
          outputJson: { taskId: result.task.id },
          undoState: {
            type: 'reschedule_follow_up',
            taskId: result.task.id,
            previousDueAt: result.task.due_at,
          },
          status: 'executed',
        });

        return {
          success: true,
          intent: 'reschedule_follow_up',
          toolName: 'reschedule_follow_up',
          summary: `Rescheduled task to ${formattedDue}`,
          confirmationMessage: confirmation,
          data: result,
          aiActionId: aiAction.id,
          undoable: true,
          rawToolCall: { name: toolName, args: validated },
        };
      }

      case 'complete_follow_up': {
        const validated = CompleteFollowUpSchema.parse(toolArgs);

        let taskId = validated.taskId;
        if (!taskId && validated.leadName) {
          const leads = await searchLead(validated.leadName, userId);
          if (leads.length > 0) {
            const todays = await getTodaysTasks(userId, userTimezone);
            const task = todays.find(t => t.lead_id === leads[0].id);
            if (task) taskId = task.id;
          }
        }

        if (!taskId) {
          return {
            success: false,
            intent: 'complete_follow_up',
            toolName: 'complete_follow_up',
            summary: 'Task not found',
            confirmationMessage: `I couldn't find an open task for ${validated.leadName || 'this lead'}.`,
            undoable: false,
          };
        }

        const completed = await completeFollowUp(taskId, validated.notes, userId);
        const confirmation = `I marked the follow-up with ${completed.lead?.name || 'the lead'} as completed.`;

        const aiAction = await recordAiAction({
          userId,
          commandText,
          intent: 'complete_follow_up',
          toolName: 'complete_follow_up',
          inputJson: validated,
          outputJson: { taskId: completed.id },
          undoState: { type: 'complete_follow_up', taskId: completed.id },
          status: 'executed',
        });

        return {
          success: true,
          intent: 'complete_follow_up',
          toolName: 'complete_follow_up',
          summary: `Completed follow-up for ${completed.lead?.name || 'lead'}`,
          confirmationMessage: confirmation,
          data: completed,
          aiActionId: aiAction.id,
          undoable: true,
          rawToolCall: { name: toolName, args: validated },
        };
      }

      case 'add_lead_note': {
        const validated = AddLeadNoteSchema.parse(toolArgs);
        const leads = await searchLead(validated.leadName, userId);
        const lead = leads.length > 0 ? leads[0] : await createLead({ name: validated.leadName }, userId);

        const activity = await addLeadNote(lead.id, validated.note, userId);
        const confirmation = `I added the note to ${lead.name}'s history.`;

        const aiAction = await recordAiAction({
          userId,
          commandText,
          intent: 'add_lead_note',
          toolName: 'add_lead_note',
          inputJson: validated,
          outputJson: { activityId: activity.id },
          status: 'executed',
        });

        return {
          success: true,
          intent: 'add_lead_note',
          toolName: 'add_lead_note',
          summary: `Note added to ${lead.name}`,
          confirmationMessage: confirmation,
          data: activity,
          aiActionId: aiAction.id,
          undoable: false,
        };
      }

      case 'get_todays_tasks': {
        const tasks = await getTodaysTasks(userId, userTimezone);
        const count = tasks.length;
        const confirmation = count === 0
          ? `You have no tasks scheduled for today.`
          : `You have ${count} task${count === 1 ? '' : 's'} scheduled for today.`;

        return {
          success: true,
          intent: 'get_todays_tasks',
          toolName: 'get_todays_tasks',
          summary: `${count} tasks today`,
          confirmationMessage: confirmation,
          data: tasks,
          undoable: false,
        };
      }

      case 'get_overdue_tasks': {
        const overdue = await getOverdueTasks(userId, userTimezone);
        const count = overdue.length;
        const confirmation = count === 0
          ? `Great job! You have no overdue tasks.`
          : `You have ${count} overdue task${count === 1 ? '' : 's'} that need attention.`;

        return {
          success: true,
          intent: 'get_overdue_tasks',
          toolName: 'get_overdue_tasks',
          summary: `${count} overdue tasks`,
          confirmationMessage: confirmation,
          data: overdue,
          undoable: false,
        };
      }

      default: {
        return {
          success: false,
          intent: 'unknown',
          toolName: 'unknown',
          summary: 'Unrecognized command',
          confirmationMessage: "I didn't quite catch that. Try saying something like: 'Remind me to call Arjun today at 5 PM, five minutes before.'",
          undoable: false,
        };
      }
    }
  } catch (err: any) {
    console.error('Error executing assistant tool:', err);
    return {
      success: false,
      intent: (toolName as AIIntent) || 'unknown',
      toolName: toolName || 'unknown',
      summary: 'Execution error',
      confirmationMessage: `Sorry, I ran into an issue: ${err.message}`,
      error: err.message,
      undoable: false,
    };
  }
}
