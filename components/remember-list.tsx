'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Bookmark, Clock, RefreshCw } from 'lucide-react';
import { GeneralNote } from '@/types/models';
import { formatDistanceToNow } from 'date-fns';

interface RememberListProps {
  refreshTrigger?: number;
}

export function RememberList({ refreshTrigger }: RememberListProps) {
  const [notes, setNotes] = useState<GeneralNote[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notes');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNotes(data.data);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes, refreshTrigger]);

  const formatRelativeTime = (isoString: string) => {
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Bookmark className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Remember
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {notes.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => fetchNotes()}
          disabled={loading}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh Notes"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center italic">
          No general memories yet. Try saying &ldquo;Remember to review the pricing deck&rdquo;.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-60 overflow-y-auto">
          {notes.map(note => (
            <li key={note.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
              <span className="text-slate-800 dark:text-slate-200 leading-relaxed flex-1">
                {note.content}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(note.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
