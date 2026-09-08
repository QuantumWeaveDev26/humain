'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CommandBar } from '@/components/command-bar';
import { ConfirmationCard } from '@/components/confirmation-card';
import { MyFocusBoard } from '@/components/my-focus-board';
import { RememberList } from '@/components/remember-list';
import { LeadActivityTimeline } from '@/components/lead-activity-timeline';
import { AuditLogDrawer } from '@/components/audit-log-drawer';
import { CommandExecutionResult } from '@/types/assistant';
import { FocusGroupedTasks } from '@/types/models';
import { Sparkles, Shield, UserCircle, RefreshCw } from 'lucide-react';

export default function MyFocusPage() {
  const [groupedTasks, setGroupedTasks] = useState<FocusGroupedTasks>({
    now: [],
    next: [],
    overdue: [],
    today: [],
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [lastResult, setLastResult] = useState<CommandExecutionResult | null>(null);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);

  // User details
  const userName = 'Abhilash';
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  // Compute greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Load tasks
  const fetchTasks = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/tasks?timezone=${encodeURIComponent(userTimezone)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setGroupedTasks(data.data);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setRefreshing(false);
    }
  }, [userTimezone]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Execute Command (Voice or Text)
  const handleExecuteCommand = async (commandText: string) => {
    setIsProcessing(true);
    setLastResult(null);

    try {
      const res = await fetch('/api/assistant/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandText,
          userTimezone,
          referenceTime: new Date().toISOString(),
          userId: 'user-default',
        }),
      });

      const result: CommandExecutionResult = await res.json();
      setLastResult(result);

      // Refresh tasks board and notes after action
      await fetchTasks();
      setNotesRefreshKey(k => k + 1);
    } catch (err: any) {
      setLastResult({
        success: false,
        intent: 'unknown',
        toolName: 'unknown',
        summary: 'Error',
        confirmationMessage: `Failed to process command: ${err.message}`,
        undoable: false,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Undo
  const handleUndo = async (aiActionId: string) => {
    setIsUndoing(true);
    try {
      const res = await fetch('/api/assistant/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiActionId, userId: 'user-default' }),
      });

      const result = await res.json();
      if (result.success) {
        setLastResult({
          success: true,
          intent: 'unknown',
          toolName: 'undo',
          summary: 'Undone',
          confirmationMessage: result.message,
          undoable: false,
        });
        await fetchTasks();
      } else {
        alert(result.message || 'Failed to undo action.');
      }
    } catch (err: any) {
      alert(`Undo failed: ${err.message}`);
    } finally {
      setIsUndoing(false);
    }
  };

  // Complete Task
  const handleCompleteTask = async (taskId: string, notes?: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, userId: 'user-default' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  // Reschedule Task
  const handleRescheduleTask = async (taskId: string, newDueAt: string, newReminderAt?: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDueAt, newReminderAt, userId: 'user-default' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to reschedule task:', err);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Top Navbar */}
      <header className="w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                HUMAIN
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                Work Assistant
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchTasks()}
              disabled={refreshing}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh Tasks"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowAuditDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span>Audit & AI Log</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <UserCircle className="w-6 h-6 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">
                {userName}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col gap-8 w-full">
        {/* User Greeting & Focus Title */}
        <div className="text-center sm:text-left">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {getGreeting()}, {userName}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            My Focus
          </h1>
        </div>

        {/* Center/Top Voice & Command Bar */}
        <section className="py-2">
          <CommandBar
            onSubmit={handleExecuteCommand}
            isProcessing={isProcessing}
          />
        </section>

        {/* Confirmation Card with Undo */}
        {lastResult && (
          <section className="animate-fade-in">
            <ConfirmationCard
              result={lastResult}
              onUndo={handleUndo}
              onDismiss={() => setLastResult(null)}
              isUndoing={isUndoing}
            />
          </section>
        )}

        {/* 4-Column My Focus Board (NOW, NEXT, OVERDUE, TODAY) */}
        <section className="flex-1">
          <MyFocusBoard
            groupedTasks={groupedTasks}
            onCompleteTask={handleCompleteTask}
            onRescheduleTask={handleRescheduleTask}
            onViewLeadHistory={(id) => setActiveLeadId(id)}
            timezone={userTimezone}
          />
        </section>

        {/* Remember / General Notes Card */}
        <section className="w-full">
          <RememberList refreshTrigger={notesRefreshKey} />
        </section>
      </div>

      {/* Drawers & Modals */}
      <LeadActivityTimeline
        leadId={activeLeadId}
        onClose={() => setActiveLeadId(null)}
        timezone={userTimezone}
      />

      <AuditLogDrawer
        isOpen={showAuditDrawer}
        onClose={() => setShowAuditDrawer(false)}
        timezone={userTimezone}
        onUndoAction={handleUndo}
      />
    </main>
  );
}
