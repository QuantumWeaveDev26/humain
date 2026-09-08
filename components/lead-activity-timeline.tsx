'use client';

import React, { useEffect, useState } from 'react';
import { Lead, LeadActivity } from '@/types/models';
import { X, Clock, PhoneCall, FileText, CheckCircle, Calendar, Plus } from 'lucide-react';
import { formatFriendlyDateTime } from '@/lib/time';

interface LeadActivityTimelineProps {
  leadId: string | null;
  onClose: () => void;
  onAddNote?: (leadId: string, note: string) => void;
  timezone?: string;
}

export function LeadActivityTimeline({
  leadId,
  onClose,
  onAddNote,
  timezone = 'Asia/Kolkata',
}: LeadActivityTimelineProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (!leadId) return;

    setLoading(true);
    fetch(`/api/leads/${leadId}/history`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLead(data.lead);
          setActivities(data.data || []);
        }
      })
      .catch((err) => console.error('Failed to load lead history:', err))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (!leadId) return null;

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !leadId) return;

    try {
      const res = await fetch('/api/assistant/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandText: `Add note to ${lead?.name}: ${newNote}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewNote('');
        // Refresh history
        const refresh = await fetch(`/api/leads/${leadId}/history`).then((r) => r.json());
        if (refresh.success) {
          setActivities(refresh.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const activityIcons: Record<string, any> = {
    call: PhoneCall,
    note: FileText,
    follow_up_scheduled: Calendar,
    follow_up_completed: CheckCircle,
    follow_up_rescheduled: Clock,
    lead_created: Plus,
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-slide-left">
        {/* Drawer Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {lead?.name || 'Lead Details'}
            </h3>
            {lead?.company && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{lead.company}</p>
            )}
            {lead?.phone && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{lead.phone}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Add Note */}
        <form onSubmit={handleCreateNote} className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a quick note or outcome..."
            className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newNote.trim()}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
        </form>

        {/* Timeline Activities */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Activity Timeline
          </h4>

          {loading ? (
            <p className="text-xs text-slate-400 text-center py-6">Loading timeline...</p>
          ) : activities.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No activity history yet.</p>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-6">
              {activities.map((act) => {
                const Icon = activityIcons[act.activity_type] || FileText;
                return (
                  <div key={act.id} className="relative group">
                    {/* Timeline bullet */}
                    <div className="absolute -left-[31px] top-0.5 p-1 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-500 text-blue-500">
                      <Icon className="w-3 h-3" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                          {act.activity_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatFriendlyDateTime(act.created_at, timezone)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {act.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
