'use client';

import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Bot, CheckCircle, RotateCcw, AlertCircle } from 'lucide-react';
import { AiAction, AuditLog } from '@/types/models';
import { formatFriendlyDateTime } from '@/lib/time';

interface AuditLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  timezone?: string;
  onUndoAction?: (aiActionId: string) => void;
}

export function AuditLogDrawer({
  isOpen,
  onClose,
  timezone = 'Asia/Kolkata',
  onUndoAction,
}: AuditLogDrawerProps) {
  const [aiActions, setAiActions] = useState<AiAction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'ai' | 'audit'>('ai');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch('/api/audit')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAiActions(data.aiActions || []);
          setAuditLogs(data.auditLogs || []);
        }
      })
      .catch((err) => console.error('Failed to load audit:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Audit & AI Execution Log
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-colors ${
              activeTab === 'ai'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            AI Actions ({aiActions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            System Audit Log ({auditLogs.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-6">Loading records...</p>
          ) : activeTab === 'ai' ? (
            aiActions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No AI actions executed yet.</p>
            ) : (
              aiActions.map((action) => (
                <div
                  key={action.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                      <Bot className="w-3.5 h-3.5 text-blue-500" />
                      <span>{action.tool_name}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        action.status === 'executed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                          : action.status === 'undone'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {action.status}
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 italic">
                    &ldquo;{action.command_text}&rdquo;
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                    <span>{formatFriendlyDateTime(action.created_at, timezone)}</span>
                    {action.status === 'executed' && action.undo_state && onUndoAction && (
                      <button
                        type="button"
                        onClick={() => onUndoAction(action.id)}
                        className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Undo
                      </button>
                    )}
                  </div>
                </div>
              ))
            )
          ) : auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No audit records found.</p>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{log.action}</span>
                  <span className="text-[10px] text-slate-400">
                    {formatFriendlyDateTime(log.created_at, timezone)}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Entity: <span className="font-mono">{log.entity_type}</span>
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
