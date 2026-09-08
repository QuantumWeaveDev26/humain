import { GeneralNote } from '@/types/models';
import { memoryStore } from './store';
import { logAuditEvent } from './audit-service';

/**
 * Creates a general memory note not associated with a specific lead
 */
export async function addGeneralNote(
  content: string,
  userId: string = 'user-default'
): Promise<GeneralNote> {
  const note: GeneralNote = {
    id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: userId,
    content: content.trim(),
    created_at: new Date().toISOString(),
  };

  if (!Array.isArray(memoryStore.notes)) {
    memoryStore.notes = [];
  }

  memoryStore.notes.unshift(note);

  await logAuditEvent({
    userId,
    action: 'GENERAL_NOTE_ADDED',
    entityType: 'general_note',
    entityId: note.id,
    metadata: { content: note.content },
  });

  return note;
}

/**
 * Retrieves all general notes for a given user
 */
export async function getGeneralNotes(
  userId: string = 'user-default'
): Promise<GeneralNote[]> {
  if (!Array.isArray(memoryStore.notes)) {
    memoryStore.notes = [];
  }
  return memoryStore.notes.filter(n => n.user_id === userId);
}
