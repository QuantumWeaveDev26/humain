-- ==============================================================================
-- Migration: 001_initial_schema.sql
-- Purpose: Schema for Humain AI Work Assistant
-- Tables: profiles, leads, tasks, reminders, lead_activities, ai_actions, audit_logs
-- Includes: Indexes, Triggers, and Row-Level Security (RLS) policies
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'sales_rep',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, timezone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'sales_rep',
        'Asia/Kolkata'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. LEADS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    company TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_progress', 'qualified', 'lost', 'won')),
    owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_name_lower ON leads(lower(name));

-- ------------------------------------------------------------------------------
-- 3. TASKS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    due_at TIMESTAMPTZ NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'rescheduled')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_due ON tasks(assigned_to, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ------------------------------------------------------------------------------
-- 4. REMINDERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    remind_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'dismissed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status_remind_at ON reminders(status, remind_at);

-- ------------------------------------------------------------------------------
-- 5. LEAD ACTIVITIES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'note', 'follow_up_scheduled', 'follow_up_completed', 'follow_up_rescheduled', 'status_changed', 'lead_created')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. AI ACTIONS (For traceability, audit, and undo capability)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    command_text TEXT NOT NULL,
    intent TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    undo_state JSONB,
    status TEXT NOT NULL DEFAULT 'executed' CHECK (status IN ('executed', 'undone', 'failed', 'pending_confirmation')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_actions_user_created ON ai_actions(user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. AUDIT LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Leads policies
CREATE POLICY "Users can view leads they own or unassigned"
    ON leads FOR SELECT
    TO authenticated
    USING (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Users can insert leads"
    ON leads FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update leads they own"
    ON leads FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid() OR owner_id IS NULL);

-- Tasks policies
CREATE POLICY "Users can view assigned tasks"
    ON tasks FOR SELECT
    TO authenticated
    USING (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can insert tasks"
    ON tasks FOR INSERT
    TO authenticated
    WITH CHECK (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can update their tasks"
    ON tasks FOR UPDATE
    TO authenticated
    USING (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can delete their tasks"
    ON tasks FOR DELETE
    TO authenticated
    USING (assigned_to = auth.uid() OR created_by = auth.uid());

-- Reminders policies
CREATE POLICY "Users can view reminders for their tasks"
    ON reminders FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = reminders.task_id
            AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
        )
    );

CREATE POLICY "Users can insert reminders for their tasks"
    ON reminders FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = reminders.task_id
            AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
        )
    );

CREATE POLICY "Users can update reminders for their tasks"
    ON reminders FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = reminders.task_id
            AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
        )
    );

CREATE POLICY "Users can delete reminders for their tasks"
    ON reminders FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = reminders.task_id
            AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
        )
    );

-- Lead Activities policies
CREATE POLICY "Users can view activities of leads they can see"
    ON lead_activities FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM leads
            WHERE leads.id = lead_activities.lead_id
            AND (leads.owner_id = auth.uid() OR leads.owner_id IS NULL)
        )
    );

CREATE POLICY "Users can insert lead activities"
    ON lead_activities FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- AI Actions policies
CREATE POLICY "Users can view their own AI actions"
    ON ai_actions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own AI actions"
    ON ai_actions FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own AI actions"
    ON ai_actions FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Audit Logs policies
CREATE POLICY "Users can view their own audit logs"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert audit logs"
    ON audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
