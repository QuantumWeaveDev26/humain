'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  isProcessing?: boolean;
}

export function VoiceInput({ onTranscript, isProcessing = false }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let current = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      setInterimTranscript(current);

      if (event.results[0].isFinal) {
        onTranscript(current);
        setInterimTranscript('');
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      setInterimTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or text input.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInterimTranscript('');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <button
        type="button"
        onClick={toggleListening}
        disabled={isProcessing}
        className={`relative group flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 shadow-xl focus:outline-none ${
          isListening
            ? 'bg-red-500 text-white shadow-red-500/40 scale-105 animate-pulse'
            : isProcessing
            ? 'bg-blue-600 text-white shadow-blue-500/30'
            : 'bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-indigo-500/30 hover:scale-105'
        }`}
        title={isListening ? 'Click to stop listening' : 'Click and speak your command'}
      >
        {isListening && (
          <span className="absolute inset-0 rounded-full bg-red-400 opacity-75 animate-ping" />
        )}
        {isProcessing ? (
          <Loader2 className="w-10 h-10 animate-spin" />
        ) : isListening ? (
          <MicOff className="w-10 h-10 z-10" />
        ) : (
          <Mic className="w-10 h-10 z-10" />
        )}
      </button>

      <div className="mt-3 text-center">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {isListening ? 'Listening... Speak now' : isProcessing ? 'Understanding...' : 'What do you want me to do?'}
        </p>
        {interimTranscript && (
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 italic max-w-md animate-fade-in">
            &ldquo;{interimTranscript}&rdquo;
          </p>
        )}
        {!speechSupported && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Microphone unavailable in this browser. Use text input below.
          </p>
        )}
      </div>
    </div>
  );
}
