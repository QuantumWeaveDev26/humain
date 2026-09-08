-- ==============================================================================
-- Migration: 002_sample_seed.sql
-- Purpose: Sample seed data for testing Humain Work Assistant
-- Seeds: Sample leads (Arjun, Rahul, Priya)
-- ==============================================================================

-- Insert sample leads if not exists
INSERT INTO leads (name, phone, email, company, status)
VALUES 
    ('Arjun Mehta', '+91 98765 43210', 'arjun.mehta@example.com', 'Apex Solutions', 'in_progress'),
    ('Rahul Sharma', '+91 98111 22334', 'rahul.s@techcorp.in', 'TechCorp India', 'contacted'),
    ('Priya Nair', '+91 97222 33445', 'priya.nair@innovate.co', 'Innovate Labs', 'new')
ON CONFLICT DO NOTHING;
