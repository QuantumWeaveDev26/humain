# Humain — Voice-First AI Work Assistant (Milestone 1)

Humain is an internal voice-first AI work assistant designed for teams to eliminate manual task management, follow-ups, and calendar coordination.

## Core Interaction Model
```
USER VOICE / TEXT
       │
       ▼
Speech-to-Text / Transcript
       │
       ▼
Command API (/api/assistant/command)
       │
       ▼
AI Orchestrator (Intent + Parameter Extraction)
       │
       ▼
Tool Router & Zod Parameter Validation
       │
       ▼
Controlled Business Services Layer (Zero direct DB modification by AI)
 ├── searchLead() / createLead() / getLeadHistory()
 ├── createFollowUp() / updateFollowUp() / rescheduleFollowUp() / completeFollowUp()
 └── scheduleReminder() / recordAiAction() / logAuditEvent()
       │
       ▼
Database Persistence (Supabase PostgreSQL with RLS)
       │
       ▼
Confirmation Banner + Instant Undo Token
```

---

## File Structure

```
/humain
├── /app
│   ├── layout.tsx                    # Root layout with reminder toast
│   ├── page.tsx                      # "My Focus" main dashboard
│   ├── login/page.tsx                # Supabase Auth skeleton & demo mode
│   ├── globals.css                   # Tailwind styles & smooth animations
│   └── api
│       ├── assistant
│       │   ├── command/route.ts      # Main voice/text command handler
│       │   └── undo/route.ts         # One-click action reversion endpoint
│       ├── tasks
│       │   ├── route.ts              # Focus-grouped tasks (NOW, NEXT, OVERDUE, TODAY)
│       │   └── [id]
│       │       ├── complete/route.ts # Mark task complete with outcome note
│       │       └── reschedule/route.ts # Reschedule / snooze task
│       ├── leads
│       │   ├── route.ts              # Search / create leads
│       │   └── [id]/history/route.ts # Lead activity timeline
│       ├── reminders/poll/route.ts   # In-app reminder polling & dismissal
│       └── audit/route.ts            # Audit logs & AI actions trace
├── /components
│   ├── command-bar.tsx               # Text command input & quick prompt chips
│   ├── voice-input.tsx               # Web Speech API voice capture button
│   ├── confirmation-card.tsx         # AI confirmation message with Undo button
│   ├── my-focus-board.tsx            # 4-column dashboard (NOW, NEXT, OVERDUE, TODAY)
│   ├── task-card.tsx                 # Follow-up card with snooze, complete & lead links
│   ├── lead-activity-timeline.tsx    # Lead history drawer with quick notes
│   ├── audit-log-drawer.tsx          # System audit log & AI action traceability
│   └── reminder-toast.tsx            # In-app real-time reminder alerts
├── /services
│   ├── task-service.ts               # createFollowUp, reschedule, complete, grouping
│   ├── lead-service.ts               # searchLead, createLead, addLeadNote, history
│   ├── reminder-service.ts           # scheduleReminder, cancelReminder, poll
│   ├── ai-action-service.ts          # recordAiAction, undoAiAction, audit
│   ├── audit-service.ts              # logAuditEvent, getAuditLogs
│   └── store.ts                      # In-memory fallback repository & config detector
├── /ai
│   ├── orchestrator.ts               # AI Command Orchestrator & service dispatcher
│   ├── tools.ts                      # Gemini Function Declarations matching services
│   ├── schemas.ts                    # Zod validation schemas for all AI inputs
│   └── gemini-client.ts              # Gemini API client + offline fallback parser
├── /db
│   └── migrations
│       ├── 001_initial_schema.sql    # PostgreSQL DDL, triggers & Row-Level Security
│       └── 002_sample_seed.sql       # Seed data with Arjun, Rahul, and Priya
├── /types
│   ├── database.ts                   # Supabase Database TypeScript definitions
│   ├── models.ts                     # Domain models (Task, Lead, Reminder, etc.)
│   └── assistant.ts                  # Command types, intents, and undo tokens
├── /tests
│   ├── command-intent.test.ts        # Intent and entity parsing tests
│   ├── task-creation.test.ts         # Task creation, reminder & undo tests
│   ├── reminder-calculation.test.ts  # Reminder offset & math tests
│   ├── timezone-handling.test.ts     # UTC storage & local timezone display tests
│   └── invalid-dates-and-leads.test.ts # Validation, error & missing lead tests
├── .env.example                      # Configuration template
├── vitest.config.ts                  # Test runner configuration
├── tailwind.config.ts                # Styling configuration
└── tsconfig.json                     # TypeScript configuration
```

---

## Quick Start & Verification

### 1. Run the Test Suite
```bash
npm run test
```
Runs 19 automated unit & integration tests covering intent parsing, task scheduling, reminder calculation, timezone normalization, error handling, and undo actions.

### 2. Run Typecheck
```bash
npx tsc --noEmit
```

### 3. Run Production Build
```bash
npm run build
```

### 4. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Connecting Supabase & Gemini API

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. In your Supabase project dashboard SQL Editor, execute the migration files in order:
   - `db/migrations/001_initial_schema.sql`
   - `db/migrations/002_sample_seed.sql`
3. Add your credentials to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
