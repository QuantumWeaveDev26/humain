'use client';

import React from 'react';
import { CheckCircle2, RotateCcw, X, AlertCircle } from 'lucide-react';
import { CommandExecutionResult } from '@/types/assistant';

interface ConfirmationCardProps {
  result: CommandExecutionResult | null;
  onUndo: (aiActionId: string) => void;
  onDismiss: () => void;
  isUndoing?: boolean;
}

export function ConfirmationCard({
  result,
  onUndo,
  onDismiss,
  isUndoing = false,
}: ConfirmationCardProps) {
  if (!result) return null;

  return (
    <div
      className={`relative w-full max-w-2xl mx-auto rounded-xl p-4 shadow-lg border transition-all duration-300 ${
        result.success
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
      }`}
    >
      <div className="flex items-start gap-3">
        {result.success ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
        )}

        <div className="flex-1">
          <p className="font-medium text-sm sm:text-base leading-relaxed">
            {result.confirmationMessage}
          </p>

          {result.success && result.undoable && result.aiActionId && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => result.aiActionId && onUndo(result.aiActionId)}
                disabled={isUndoing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors shadow-sm disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isUndoing ? 'animate-spin' : ''}`} />
                {isUndoing ? 'Undoing...' : 'Undo this action'}
              </button>
              <span className="text-xs text-emerald-700/70 dark:text-emerald-400/70">
                Created task & scheduled reminder
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
