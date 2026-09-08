export type AIIntent =
  | 'create_follow_up'
  | 'search_lead'
  | 'create_lead'
  | 'complete_follow_up'
  | 'reschedule_follow_up'
  | 'add_lead_note'
  | 'schedule_reminder'
  | 'get_todays_tasks'
  | 'get_overdue_tasks'
  | 'get_lead_history'
  | 'unknown';

export interface CommandRequest {
  commandText: string;
  userTimezone?: string;
  referenceTime?: string; // ISO string from client
  userId?: string;
}

export interface CommandExecutionResult {
  success: boolean;
  intent: AIIntent;
  toolName: string;
  summary: string;
  confirmationMessage: string;
  data?: any;
  aiActionId?: string;
  undoable: boolean;
  requiresConfirmation?: boolean;
  rawToolCall?: {
    name: string;
    args: any;
  };
  error?: string;
}

export interface UndoRequest {
  aiActionId: string;
}

export interface UndoResult {
  success: boolean;
  message: string;
  reversedActionId: string;
}
