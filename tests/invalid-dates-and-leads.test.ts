import { describe, it, expect } from 'vitest';
import { CreateFollowUpSchema } from '@/ai/schemas';
import { createFollowUp } from '@/services/task-service';
import { findOrCreateLead } from '@/services/lead-service';
import { memoryStore } from '@/services/store';

describe('Error Handling, Validation & Missing Leads', () => {
  it('throws error when invalid due date timestamp is provided to service', async () => {
    await expect(
      createFollowUp({
        leadName: 'Test Lead',
        title: 'Call Test',
        dueAt: 'not-a-valid-date',
      })
    ).rejects.toThrow(/Invalid due date/i);
  });

  it('rejects invalid schema inputs with Zod', () => {
    expect(() => {
      CreateFollowUpSchema.parse({
        leadName: '', // empty name not allowed
        dueAt: '2026-09-04T17:00:00Z',
      });
    }).toThrow();

    expect(() => {
      CreateFollowUpSchema.parse({
        leadName: 'Arjun',
        dueAt: 'invalid-date',
      });
    }).toThrow();
  });

  it('automatically creates a new lead when lead does not exist', async () => {
    const newLeadName = 'Vikram Singhania';
    const lead = await findOrCreateLead(newLeadName, 'user-default');

    expect(lead).toBeDefined();
    expect(lead.name).toBe(newLeadName);

    // Should find the same lead on subsequent call
    const existing = await findOrCreateLead(newLeadName, 'user-default');
    expect(existing.id).toBe(lead.id);
  });
});
