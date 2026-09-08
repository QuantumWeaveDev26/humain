'use client';

import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { VoiceInput } from './voice-input';

interface CommandBarProps {
  onSubmit: (commandText: string) => void;
  isProcessing: boolean;
}

const EXAMPLE_PROMPTS = [
  'Remind me to call Arjun today at 5 PM, five minutes before.',
  'Arjun didnt answer. Remind me tomorrow at 10 AM.',
  'Call Rahul tomorrow at 11 AM',
  'What are my tasks today?',
];

export function CommandBar({ onSubmit, isProcessing }: CommandBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSubmit(input.trim());
    setInput('');
  };

  const handleChipClick = (prompt: string) => {
    if (isProcessing) return;
    setInput(prompt);
    onSubmit(prompt);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6">
      {/* Voice Mic Button */}
      <VoiceInput onTranscript={onSubmit} isProcessing={isProcessing} />

      {/* Text Command Input */}
      <form onSubmit={handleSubmit} className="w-full relative">
        <div className="relative flex items-center shadow-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            placeholder='Type or speak: "Remind me to call Arjun today at 5 PM, five minutes before."'
            className="w-full py-3.5 pl-5 pr-14 text-sm sm:text-base bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors"
            title="Execute command"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Quick Prompt Chips */}
      <div className="w-full flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Quick actions or try saying:</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isProcessing}
              onClick={() => handleChipClick(prompt)}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200/60 dark:border-slate-700"
            >
              &ldquo;{prompt}&rdquo;
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
