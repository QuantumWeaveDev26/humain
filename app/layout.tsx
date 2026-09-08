import type { Metadata } from 'next';
import './globals.css';
import { ReminderToast } from '@/components/reminder-toast';

export const metadata: Metadata = {
  title: 'Humain — Voice-First AI Work Assistant',
  description: 'AI work assistant for sales & follow-up teams. Talk to the system, let AI handle tasks and reminders.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
        <ReminderToast />
        {children}
      </body>
    </html>
  );
}
