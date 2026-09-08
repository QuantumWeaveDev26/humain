'use client';

import React, { useEffect, useState } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { Reminder } from '@/types/models';

export function ReminderToast() {
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    // Poll reminders every 15 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/reminders/poll');
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          // Show the first due reminder
          setActiveReminder(data.data[0]);
        }
      } catch (err) {
        // Silently fail polling
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  if (!activeReminder) return null;

  const handleDismiss = async () => {
    try {
      await fetch('/api/reminders/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId: activeReminder.id }),
      });
    } catch {
      // ignore
    }
    setActiveReminder(null);
  };

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-indigo-600 text-white p-4 rounded-xl shadow-2xl flex items-start gap-3 border border-indigo-400 animate-bounce">
      <Bell className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse text-amber-300" />
      <div className="flex-1">
        <h4 className="font-bold text-sm">Follow-up Reminder!</h4>
        <p className="text-xs text-indigo-100 mt-0.5">
          You have a scheduled follow-up due right now.
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-2.5 py-1 bg-white text-indigo-700 font-semibold text-xs rounded-md hover:bg-indigo-50 transition-colors flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            Got it
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-indigo-200 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
