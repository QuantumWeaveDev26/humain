# Humain — Project Handoff & Knowledge Base

> Complete context document for continuing work (e.g. with Codex or any assistant).
> Last updated: 2026-09-09. Current HEAD: `6789642`. Repo: https://github.com/QuantumWeaveDev26/humain (branch `main`).

---

## 1. What this project is

**Humain** is an internal **voice-first AI work assistant** for sales/follow-up teams. Users speak or type natural-language commands; the app extracts intent, executes it through a controlled service layer, and confirms with an instant **undo** option. Milestone 1.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · Zod · date-fns / date-fns-tz · Google Generative AI (Gemini) · Supabase (Postgres + RLS) · Vitest.

---

## 2. How to run, test, verify

From `D:\office\humain`:

```bash
npm run dev          # start dev server at http://localhost:3000
npm run build        # production build
npm run test         # Vitest — 26 tests (all passing at HEAD)
npx tsc --noEmit     # typecheck — clean at HEAD
```

The dev server must be started fresh each session; stop it by killing the PID LISTENING on port 3000.

---

## 3. Demo mode vs. production (IMPORTANT)

The app runs in one of two modes, decided at runtime by `services/store.ts → isSupabaseConfigured()`:

- **Demo / in-memory mode** (default, no env set): all data lives in an in-memory singleton (`memoryStore` in `services/store.ts`), seeded with 3 leads (Arjun Mehta, Rahul Sharma, Priya Nair), tasks, reminders, activities. **No Gemini key → intent parsing uses the deterministic offline parser** (`ai/gemini-client.ts → parseCommandOfflineFallback`). This is the code path that actually runs today.
- **Production mode**: set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` in `.env.local` (see `.env.example`). Then data persists to Supabase and intent uses Gemini function-calling. Run the SQL in `db/migrations/001_initial_schema.sql` then `002_sample_seed.sql`.

**Key implication:** when testing locally without keys, you are exercising the offline parser + in-memory store, NOT Gemini/Supabase. Both paths must be kept in sync when changing intents.

---

## 4. Request/execution flow

```
User voice/text
  → components/command-bar.tsx (or voice-input.tsx) POSTs to
  → app/api/assistant/command/route.ts
  → ai/orchestrator.ts  executeAssistantCommand()
       1. Get a tool call: Gemini (if key) else parseCommandOfflineFallback()
       2. Validate args with a Zod schema (ai/schemas.ts)
       3. Dispatch via switch(toolName) to the services layer
       4. recordAiAction() for audit + undo
  → services/*  (the ONLY layer allowed to touch data)
  → response: { success, intent, confirmationMessage, data, aiActionId, undoable, ... }
  → components/confirmation-card.tsx shows the message + Undo
```

**Design rule:** the AI never writes to the DB directly — everything goes through `services/*`. Preserve this.

---

## 5. Directory / file map

```
ai/
  gemini-client.ts   Gemini model init + parseCommandOfflineFallback (offline NLP) + calculateDateFromNaturalLanguage
  orchestrator.ts    executeAssistantCommand — intent → Zod validate → service dispatch → audit/undo
  schemas.ts         Zod schemas: CreateFollowUp, Reschedule, Complete, AddLeadNote, Remember, ...
  tools.ts           Gemini FunctionDeclarations (must mirror schemas)
app/
  page.tsx           "My Focus" dashboard; mounts MyFocusBoard, CommandBar, RememberList, etc.
  layout.tsx         root layout; mounts ReminderToast
  globals.css
  api/
    assistant/command/route.ts   main command endpoint
    assistant/undo/route.ts       undo endpoint
    tasks/route.ts + [id]/complete + [id]/reschedule
    leads/route.ts + [id]/history
    reminders/poll/route.ts       GET pending due reminders, POST mark sent
    notes/route.ts                GET/POST general "remember" notes  (added this round)
    audit/route.ts
components/
  command-bar.tsx, voice-input.tsx, confirmation-card.tsx, my-focus-board.tsx,
  task-card.tsx, lead-activity-timeline.tsx, audit-log-drawer.tsx, reminder-toast.tsx,
  remember-list.tsx  (added this round — shows general notes)
services/
  task-service.ts    createFollowUp, reschedule, complete, focus grouping
  lead-service.ts    searchLead, createLead, findOrCreateLead, addLeadNote, getLeadHistory
  reminder-service.ts scheduleReminder, cancelReminder, getPendingReminders (returns enriched PendingReminder), markReminderSent
  note-service.ts    addGeneralNote, getGeneralNotes  (added this round)
  ai-action-service.ts recordAiAction, undoAiAction
  audit-service.ts   logAuditEvent, getAuditLogs
  store.ts           in-memory singleton + isSupabaseConfigured()
types/
  database.ts (Supabase types + ActivityType union), models.ts (domain models + GeneralNote), assistant.ts (AIIntent, CommandRequest/Result)
db/migrations/       001_initial_schema.sql, 002_sample_seed.sql
tests/               command-intent, task-creation, reminder-calculation, timezone-handling, invalid-dates-and-leads
```

---

## 6. The intent system (core logic — read before touching)

`parseCommandOfflineFallback(text, referenceDate, timezone)` in `ai/gemini-client.ts` classifies in this ORDER:

1. **Complete / reschedule** — triggers: "didn't answer", "no answer", "busy", "completed", "mark complete". If it also chains a new time ("remind me tomorrow") → `reschedule_follow_up`, else `complete_follow_up`.
2. **Get tasks** — "today" + (what are/show/my tasks/focus) → `get_todays_tasks`; "overdue" → `get_overdue_tasks`.
3. **Remember / note** — triggers: `remember|note that|make a note|keep in mind|don't forget|note down|for the record|fyi|jot down`. Extracts a lead name (capitalized word, or after "about/regarding"), and a time ONLY if a time/date token is present (never defaults notes to 5 PM). Emits `remember` with `{ note, leadName?, dueAt?, reminderAt? }`.
4. **Schedule** — emits `create_follow_up` ONLY when there is a real scheduling signal: a time/date token, OR an explicit verb (`remind|schedule|follow up|call|meet|meeting|demo`) together with an extractable lead name.
5. **Else → `unknown`** — does NOT fabricate a task. (This was the fix for "everything becomes a task".)

`remember` handling (in `orchestrator.ts case 'remember'`):
- **Lead named** → `findOrCreateLead` + `addLeadNote(..., 'note')`; if `dueAt` present, ALSO `createFollowUp` (undoable). Confirmation includes the reminder time.
- **No lead** → `addGeneralNote` → shows in the RememberList card. Not undoable.

`AIIntent` union lives in `types/assistant.ts` (includes `remember`). When adding an intent, update: parser branch (offline), `ai/tools.ts` (Gemini declaration), `ai/schemas.ts` (Zod), `orchestrator.ts` (case + dispatch), and `AIIntent`.

**Time parsing:** `calculateDateFromNaturalLanguage` handles "tomorrow", "morning", and `H[:MM] am/pm` (bare "at 1–7" is treated as PM). All times are built in the user timezone (default `Asia/Kolkata`) then converted to UTC via `date-fns-tz`. Reminders are `dueAt − N minutes` (default 5) via `lib/time.ts calculateReminderAt`.

---

## 7. Reminder notifications (this round)

- `reminder-toast.tsx` polls `/api/reminders/poll` every 15s. For each newly-due reminder (deduped via a `useRef<Set>` of ids): if `Notification.permission === 'granted'`, fires an **OS notification** with the enriched `taskTitle — leadName`; still shows the in-app toast when the tab is visible.
- Permission is requested on mount. **Caveat:** Chrome may ignore a permission request without a user gesture — if the prompt doesn't appear, a click-triggered "Enable notifications" affordance is the fix.
- `getPendingReminders` returns `PendingReminder = Reminder & { taskTitle?, leadName? }` in both memory and Supabase modes.
- **Not verifiable by browser automation:** the OS-level popup lives outside the DOM — confirm it visually. True "notify when browser fully closed" would require a Service Worker + Web Push (VAPID) — NOT implemented (deliberately scoped out).

---

## 8. What shipped this round (commit 6789642)

1. Gated `create_follow_up`; non-actionable input → `unknown` (no more phantom tasks).
2. New `remember` intent with smart split (person note ± follow-up; general notes list).
3. New `note-service.ts`, `/api/notes`, `RememberList` UI, `GeneralNote` type, `memoryStore.notes`.
4. OS reminder notifications + enriched `PendingReminder` + in-app toast retained.
5. Fixed `store.ts` singleton to always initialize `notes` across hot-reloads (a stale-global class of bug — worth remembering when adding new `memoryStore` fields).
6. Tests added; 26/26 pass, tsc clean.

---

## 9. Conventions & gotchas

- **Git author:** commits use the user's identity only (`Naveen-145119 <naveenreddy95190@gmail.com>`). Do **NOT** add `Co-Authored-By` / AI attribution trailers.
- **.gitignore:** must keep the Next.js rules (`node_modules`, `.next`, `.env`, `*.tsbuildinfo`, `next-env.d.ts`). Tool setups (Codex/October) have overwritten it before — verify `git check-ignore node_modules` returns `node_modules` before committing. Never stage `node_modules` or `.env*`.
- **Client/server boundary:** client components import only *types* from service files (which pull in server-only Supabase). SWC elides type-only imports, but keep shared types in `types/*` when in doubt.
- **In-memory singleton** survives hot-reload via `global.__humainMemoryStore`; adding a field means guarding for older instances (see fix #5).
- Default timezone is `Asia/Kolkata`; all stored timestamps are UTC ISO.

---

## 10. Known / by-design behavior

- The focus board (`my-focus-board.tsx`) is **today-only** (NOW/NEXT/OVERDUE/TODAY). Tasks scheduled for **tomorrow** are created correctly but only visible on the lead's activity timeline, not the board.

---

## 11. Open next task

**"Upcoming / Tomorrow" dashboard view** — surface tomorrow's (and later) follow-ups so a scheduled-for-tomorrow task is visible on the dashboard, not just the lead timeline. This is the agreed next piece of work; not started.
