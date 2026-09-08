import { Lead, LeadActivity } from '@/types/models';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, memoryStore } from './store';
import { logAuditEvent } from './audit-service';

/**
 * Searches leads by name or company
 */
export async function searchLead(query: string, userId: string = 'user-default'): Promise<Lead[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  if (!isSupabaseConfigured()) {
    return memoryStore.leads.filter(lead => 
      lead.name.toLowerCase().includes(cleanQuery) ||
      (lead.company && lead.company.toLowerCase().includes(cleanQuery)) ||
      (lead.phone && lead.phone.includes(cleanQuery))
    );
  }

  const supabase: any = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .ilike('name', `%${cleanQuery}%`)
    .limit(10);

  if (error) {
    console.error('searchLead error:', error);
    return [];
  }
  return (data as Lead[]) || [];
}

/**
 * Retrieves lead by exact ID
 */
export async function getLeadById(leadId: string): Promise<Lead | null> {
  if (!isSupabaseConfigured()) {
    return memoryStore.leads.find(l => l.id === leadId) || null;
  }

  const supabase: any = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (error || !data) return null;
  return data as Lead;
}

/**
 * Creates a new lead in the system
 */
export async function createLead(
  leadData: { name: string; phone?: string; email?: string; company?: string; notes?: string },
  userId: string = 'user-default'
): Promise<Lead> {
  if (!isSupabaseConfigured()) {
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name: leadData.name.trim(),
      phone: leadData.phone?.trim() || null,
      email: leadData.email?.trim() || null,
      company: leadData.company?.trim() || null,
      status: 'new',
      owner_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.leads.unshift(newLead);

    // Add initial activity
    const activity: LeadActivity = {
      id: `act-${Date.now()}`,
      lead_id: newLead.id,
      user_id: userId,
      activity_type: 'lead_created',
      content: leadData.notes ? `Lead created. Note: ${leadData.notes}` : 'Lead created.',
      created_at: new Date().toISOString(),
    };
    memoryStore.leadActivities.unshift(activity);

    await logAuditEvent({
      userId,
      action: 'LEAD_CREATED',
      entityType: 'lead',
      entityId: newLead.id,
      metadata: { name: newLead.name },
    });

    return newLead;
  }

  const supabase: any = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('leads')
    .insert({
      name: leadData.name.trim(),
      phone: leadData.phone?.trim() || null,
      email: leadData.email?.trim() || null,
      company: leadData.company?.trim() || null,
      status: 'new',
      owner_id: userId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create lead: ${error?.message}`);
  }

  const createdLead = data as Lead;

  // Add lead activity
  await supabase.from('lead_activities').insert({
    lead_id: createdLead.id,
    user_id: userId,
    activity_type: 'lead_created',
    content: leadData.notes ? `Lead created. Note: ${leadData.notes}` : 'Lead created.',
  });

  await logAuditEvent({
    userId,
    action: 'LEAD_CREATED',
    entityType: 'lead',
    entityId: createdLead.id,
    metadata: { name: createdLead.name },
  });

  return createdLead;
}

/**
 * Finds lead by name or creates a new lead if no match exists
 */
export async function findOrCreateLead(name: string, userId: string = 'user-default'): Promise<Lead> {
  const matches = await searchLead(name, userId);
  if (matches.length > 0) {
    // Return best match (exact or first match)
    const exact = matches.find(m => m.name.toLowerCase() === name.toLowerCase());
    return exact || matches[0];
  }

  return await createLead({ name }, userId);
}

/**
 * Retrieves lead activity timeline
 */
export async function getLeadHistory(leadId: string, userId: string = 'user-default'): Promise<LeadActivity[]> {
  if (!isSupabaseConfigured()) {
    return memoryStore.leadActivities
      .filter(a => a.lead_id === leadId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const supabase: any = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getLeadHistory error:', error);
    return [];
  }
  return (data as LeadActivity[]) || [];
}

/**
 * Appends a note/activity to a lead
 */
export async function addLeadNote(
  leadId: string,
  content: string,
  userId: string = 'user-default',
  activityType: LeadActivity['activity_type'] = 'note'
): Promise<LeadActivity> {
  if (!isSupabaseConfigured()) {
    const activity: LeadActivity = {
      id: `act-${Date.now()}`,
      lead_id: leadId,
      user_id: userId,
      activity_type: activityType,
      content,
      created_at: new Date().toISOString(),
    };
    memoryStore.leadActivities.unshift(activity);

    await logAuditEvent({
      userId,
      action: 'LEAD_NOTE_ADDED',
      entityType: 'lead_activity',
      entityId: activity.id,
      metadata: { leadId, content },
    });

    return activity;
  }

  const supabase: any = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('lead_activities')
    .insert({
      lead_id: leadId,
      user_id: userId,
      activity_type: activityType,
      content,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to add note: ${error?.message}`);
  }

  await logAuditEvent({
    userId,
    action: 'LEAD_NOTE_ADDED',
    entityType: 'lead_activity',
    entityId: data.id,
    metadata: { leadId, content },
  });

  return data as LeadActivity;
}
