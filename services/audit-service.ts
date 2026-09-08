import { AuditLog } from '@/types/models';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, memoryStore } from './store';

export async function logAuditEvent(params: {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: any;
}): Promise<AuditLog> {
  const { userId = 'user-default', action, entityType, entityId = null, metadata = {} } = params;

  if (!isSupabaseConfigured()) {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      created_at: new Date().toISOString(),
    };
    memoryStore.auditLogs.unshift(log);
    return log;
  }

  try {
    const supabase: any = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to write audit log to Supabase:', error);
      // Fallback
      return {
        id: `audit-${Date.now()}`,
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
        created_at: new Date().toISOString(),
      };
    }
    return data as AuditLog;
  } catch (err) {
    console.error('Audit log exception:', err);
    return {
      id: `audit-${Date.now()}`,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      created_at: new Date().toISOString(),
    };
  }
}

export async function getAuditLogs(userId: string = 'user-default', limit: number = 20): Promise<AuditLog[]> {
  if (!isSupabaseConfigured()) {
    return memoryStore.auditLogs
      .filter(l => !l.user_id || l.user_id === userId)
      .slice(0, limit);
  }

  const supabase: any = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getAuditLogs error:', error);
    return [];
  }
  return (data as AuditLog[]) || [];
}
