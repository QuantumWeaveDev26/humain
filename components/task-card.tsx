'use client';

import React, { useState } from 'react';
import { TaskWithLead } from '@/types/models';
import { Check, Clock, Bell, User, Phone, MoreVertical, Calendar } from 'lucide-react';
import { formatTimeInTz, formatFriendlyDateTime } from '@/lib/time';

interface TaskCardProps {
  task: TaskWithLead;
  onComplete: (taskId: string, notes?: string) => void;
  onReschedule: (taskId: string, newDueAt: string, newReminderAt?: string) => void;
  onViewLeadHistory: (leadId: string) => void;
  timezone?: string;
}

export function TaskCard({
  task,
  onComplete,
  onReschedule,
  onViewLeadHistory,
  timezone = 'Asia/Kolkata',
}: TaskCardProps) {
  const [showRescheduleMenu, setShowRescheduleMenu] = useState(false);
  const [completing, setCompleting] = useState(false);

  const formattedTime = formatTimeInTz(task.due_at, timezone);
  const friendlyDue = formatFriendlyDateTime(task.due_at, timezone);
  const hasReminder = task.reminders && task.reminders.length > 0;

  const handleQuickSnooze = (minutes: number) => {
    const newDue = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    const newRem = new Date(Date.now() + (minutes - 5) * 60 * 1000).toISOString();
    onReschedule(task.id, newDue, newRem);
    setShowRescheduleMenu(false);
  };

  const handleTomorrowMorning = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const newDue = tomorrow.toISOString();
    const newRem = new Date(tomorrow.getTime() - 5 * 60 * 1000).toISOString();
    onReschedule(task.id, newDue, newRem);
    setShowRescheduleMenu(false);
  };

  const handleComplete = () => {
    setCompleting(true);
    onComplete(task.id);
  };

  const priorityColors = {
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };

  return (
    <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3">
      {/* Header: Title & Priority */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-snug">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
            priorityColors[task.priority] || priorityColors.medium
          }`}
        >
          {task.priority}
        </span>
      </div>

      {/* Lead info (if associated) */}
      {task.lead && (
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => task.lead_id && onViewLeadHistory(task.lead_id)}
            className="flex items-center gap-1.5 font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
            title="View Lead Activity Timeline"
          >
            <User className="w-3.5 h-3.5 text-blue-500" />
            <span>{task.lead.name}</span>
          </button>

          {task.lead.phone && (
            <a
              href={`tel:${task.lead.phone}`}
              className="flex items-center gap-1 text-slate-500 hover:text-emerald-600 transition-colors"
            >
              <Phone className="w-3 h-3" />
              <span>{task.lead.phone}</span>
            </a>
          )}
        </div>
      )}

      {/* Footer: Due Time & Quick Actions */}
      <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">{friendlyDue}</span>
          </div>
          {hasReminder && (
            <span
              className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400"
              title="Reminder active"
            >
              <Bell className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Complete Button */}
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
            title="Mark as Completed"
          >
            <Check className="w-4 h-4" />
          </button>

          {/* Reschedule / Snooze Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRescheduleMenu(!showRescheduleMenu)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Reschedule / Snooze"
            >
              <Calendar className="w-4 h-4" />
            </button>

            {showRescheduleMenu && (
              <div className="absolute right-0 bottom-full mb-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 py-1 text-xs text-slate-700 dark:text-slate-200">
                <button
                  type="button"
                  onClick={() => handleQuickSnooze(15)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Snooze 15 minutes
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSnooze(60)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Snooze 1 hour
                </button>
                <button
                  type="button"
                  onClick={handleTomorrowMorning}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Tomorrow at 10:00 AM
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
