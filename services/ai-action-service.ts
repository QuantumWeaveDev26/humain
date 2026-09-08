import { AiAction } from '@/types/models';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, memoryStore } from './store';
import { logAuditEvent } from './audit-service';
import { deleteTask, updateFollowUp } from './task-service';
import { cancelReminder } from './reminder-service';

export interface RecordAiActionParams {
  userId?: string;
  commandText: string;
  intent: string;
  toolName: string;
  inputJson: any;
  outputJson: any;
  undoState?: any;
  status?: 'executed' | 'failed' | 'pending_confirmation' | 'undone';
}

/**
 * Records an AI action for audit trail and undo capability
 */
export async function recordAiAction(params: RecordAiActionParams): Promise<AiAction> {
  const {
    userId = 'user-default',
    commandText,
    intent,
    toolName,
    inputJson,
    outputJson,
    undoState = null,
    status = 'executed',
  } = params;

  if (!isSupabaseConfigured()) {
    const aiAction: AiAction = {
      id: `ai-action-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      command_text: commandText,
      intent,
      tool_name: toolName,
      input_json: inputJson,
      output_json: outputJson,
      undo_state: undoState,
      status,
      created_at: new Date().toISOString(),
    };
    memoryStore.aiActions.unshift(aiAction);

    await logAuditEvent({
      userId,
      action: 'AI_ACTION_RECORDED',
      entityType: 'ai_action',
      entityId: aiAction.id,
      metadata: { intent, toolName },
    });

    return aiAction;
  }

  const supabase: any = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('ai_actions')
    .insert({
      user_id: userId,
      command_text: commandText,
      intent,
      tool_name: toolName,
      input_json: inputJson,
      output_json: outputJson,
      undo_state: undoState,
      status,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('recordAiAction error:', error);
    // Return an in-memory representation so callers don't crash
    return {
      id: `ai-action-${Date.now()}`,
      user_id: userId,
      command_text: commandText,
      intent,
      tool_name: toolName,
      input_json: inputJson,
      output_json: outputJson,
      undo_state: undoState,
      status,
      created_at: new Date().toISOString(),
    };
  }

  await logAuditEvent({
    userId,
    action: 'AI_ACTION_RECORDED',
    entityType: 'ai_action',
    entityId: data.id,
    metadata: { intent, toolName },
  });

  return data as AiAction;
}

/**
 * Undoes a recent AI action using stored undo_state
 */
export async function undoAiAction(
  aiActionId: string,
  userId: string = 'user-default'
): Promise<{ success: boolean; message: string }> {
  let action: AiAction | null = null;

  if (!isSupabaseConfigured()) {
    action = memoryStore.aiActions.find(a => a.id === aiActionId) || null;
  } else {
    const supabase: any = await createServerSupabaseClient();
    const { data } = await supabase
      .from('ai_actions')
      .select('*')
      .eq('id', aiActionId)
      .single();
    action = (data as unknown as AiAction) || null;
  }

  if (!action) {
    return { success: false, message: 'Action not found.' };
  }

  if (action.status === 'undone') {
    return { success: false, message: 'Action has already been undone.' };
  }

  const undoState = action.undo_state as any;
  if (!undoState) {
    return { success: false, message: 'No undo data available for this action.' };
  }

  try {
    if (undoState.type === 'create_follow_up' && undoState.taskId) {
      // Revert task creation
      await deleteTask(undoState.taskId, userId);
      if (undoState.reminderId) {
        await cancelReminder(undoState.reminderId, userId);
      }
    } else if (undoState.type === 'reschedule_follow_up' && undoState.taskId) {
      // Revert task due time
      await updateFollowUp(
        undoState.taskId,
        { due_at: undoState.previousDueAt, status: undoState.previousStatus || 'pending' },
        userId
      );
    } else if (undoState.type === 'complete_follow_up' && undoState.taskId) {
      // Revert completion back to pending
      await updateFollowUp(undoState.taskId, { status: 'pending' }, userId);
    }

    // Mark AI action as undone
    if (!isSupabaseConfigured()) {
      action.status = 'undone';
    } else {
      const supabase: any = await createServerSupabaseClient();
      await supabase
        .from('ai_actions')
        .update({ status: 'undone' })
        .eq('id', aiActionId);
    }

    await logAuditEvent({
      userId,
      action: 'ACTION_UNDONE',
      entityType: 'ai_action',
      entityId: aiActionId,
      metadata: { originalIntent: action.intent },
    });

    return { success: true, message: `Successfully undone: ${action.command_text}` };
  } catch (err: any) {
    console.error('Error undoing action:', err);
    return { success: false, message: `Failed to undo action: ${err.message}` };
  }
}

/**
 * Fetches recent AI actions
 */
export async function getRecentAiActions(
  userId: string = 'user-default',
  limit: number = 10
): Promise<AiAction[]> {
  if (!isSupabaseConfigured()) {
    return memoryStore.aiActions
      .filter(a => a.user_id === userId)
      .slice(0, limit);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('ai_actions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getRecentAiActions error:', error);
    return [];
  }

  return (data as AiAction[]) || [];
}
