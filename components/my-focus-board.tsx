'use client';

import React from 'react';
import { FocusGroupedTasks, TaskWithLead } from '@/types/models';
import { TaskCard } from './task-card';
import { AlertTriangle, Clock, FastForward, CalendarDays } from 'lucide-react';

interface MyFocusBoardProps {
  groupedTasks: FocusGroupedTasks;
  onCompleteTask: (taskId: string, notes?: string) => void;
  onRescheduleTask: (taskId: string, newDueAt: string, newReminderAt?: string) => void;
  onViewLeadHistory: (leadId: string) => void;
  timezone?: string;
}

export function MyFocusBoard({
  groupedTasks,
  onCompleteTask,
  onRescheduleTask,
  onViewLeadHistory,
  timezone = 'Asia/Kolkata',
}: MyFocusBoardProps) {
  const sections = [
    {
      id: 'now',
      title: 'NOW',
      subtitle: 'Due right now or within 30 min',
      icon: Clock,
      tasks: groupedTasks.now,
      color: 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    },
    {
      id: 'next',
      title: 'NEXT',
      subtitle: 'Scheduled for later today',
      icon: FastForward,
      tasks: groupedTasks.next,
      color: 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
    },
    {
      id: 'overdue',
      title: 'OVERDUE',
      subtitle: 'Needs immediate attention',
      icon: AlertTriangle,
      tasks: groupedTasks.overdue,
      color: 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    },
    {
      id: 'today',
      title: 'TODAY',
      subtitle: 'All items for today',
      icon: CalendarDays,
      tasks: groupedTasks.today,
      color: 'border-slate-400 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/20',
      badge: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    },
  ];

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {sections.map((section) => (
        <div
          key={section.id}
          className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-4 shadow-sm min-h-[380px]"
        >
          {/* Section Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <section.icon className={`w-4 h-4 ${section.color.split(' ')[1]}`} />
              <h3 className="font-bold text-sm tracking-wide text-slate-900 dark:text-slate-100 uppercase">
                {section.title}
              </h3>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${section.badge}`}>
              {section.tasks.length}
            </span>
          </div>

          {/* Cards List */}
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[500px] pr-1">
            {section.tasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <p className="text-xs">No tasks in this section</p>
              </div>
            ) : (
              section.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={onCompleteTask}
                  onReschedule={onRescheduleTask}
                  onViewLeadHistory={onViewLeadHistory}
                  timezone={timezone}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
