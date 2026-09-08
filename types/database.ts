export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type LeadStatus = 'new' | 'contacted' | 'in_progress' | 'qualified' | 'lost' | 'won';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'completed' | 'cancelled' | 'rescheduled';
export type ReminderStatus = 'scheduled' | 'sent' | 'dismissed' | 'cancelled';
export type ActivityType = 
  | 'call' 
  | 'note' 
  | 'follow_up_scheduled' 
  | 'follow_up_completed' 
  | 'follow_up_rescheduled' 
  | 'status_changed' 
  | 'lead_created';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          company: string | null;
          status: LeadStatus;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          company?: string | null;
          status?: LeadStatus;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          company?: string | null;
          status?: LeadStatus;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          lead_id: string | null;
          assigned_to: string;
          due_at: string;
          priority: TaskPriority;
          status: TaskStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          lead_id?: string | null;
          assigned_to: string;
          due_at: string;
          priority?: TaskPriority;
          status?: TaskStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          lead_id?: string | null;
          assigned_to?: string;
          due_at?: string;
          priority?: TaskPriority;
          status?: TaskStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          task_id: string;
          remind_at: string;
          status: ReminderStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          remind_at: string;
          status?: ReminderStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          remind_at?: string;
          status?: ReminderStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      lead_activities: {
        Row: {
          id: string;
          lead_id: string;
          user_id: string | null;
          activity_type: ActivityType;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          user_id?: string | null;
          activity_type: ActivityType;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          user_id?: string | null;
          activity_type?: ActivityType;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_actions: {
        Row: {
          id: string;
          user_id: string;
          command_text: string;
          intent: string;
          tool_name: string;
          input_json: Json;
          output_json: Json;
          undo_state: Json | null;
          status: 'executed' | 'undone' | 'failed' | 'pending_confirmation';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          command_text: string;
          intent: string;
          tool_name: string;
          input_json?: Json;
          output_json?: Json;
          undo_state?: Json | null;
          status?: 'executed' | 'undone' | 'failed' | 'pending_confirmation';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          command_text?: string;
          intent?: string;
          tool_name?: string;
          input_json?: Json;
          output_json?: Json;
          undo_state?: Json | null;
          status?: 'executed' | 'undone' | 'failed' | 'pending_confirmation';
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
