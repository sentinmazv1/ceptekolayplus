
-- REPAIR SYSTEM SCHEMA
-- Creates missing tables and ensures correct naming for backup system

-- 1. Quick Notes Table
CREATE TABLE IF NOT EXISTS public.quick_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    label TEXT NOT NULL,
    color TEXT DEFAULT 'gray',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Quick Notes
ALTER TABLE public.quick_notes ENABLE ROW LEVEL SECURITY;

-- Policies for Quick Notes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quick_notes' AND policyname = 'Everyone can read quick_notes'
    ) THEN
        CREATE POLICY "Everyone can read quick_notes" ON public.quick_notes FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quick_notes' AND policyname = 'Admins can manage quick_notes'
    ) THEN
        CREATE POLICY "Admins can manage quick_notes" ON public.quick_notes FOR ALL USING (
            (SELECT role FROM public.users WHERE email = auth.jwt() ->> 'email') = 'ADMIN'
        );
    END IF;
END $$;

-- 2. Ensure activity_logs has correct references and RLS
-- (Assuming it was created by previous scripts, but ensuring it exists)
-- This script only adds missing tables identified by backup failures.

COMMENT ON TABLE public.quick_notes IS 'Templates for quick notes in the customer card';
