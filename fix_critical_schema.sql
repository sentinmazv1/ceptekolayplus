
-- 1. Fix leads table schema (Add potentially missing columns)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS kredi_limiti text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS admin_notu text;

-- 2. Fix activity_logs permissions (Enable RLS but verify policies)
-- Or just ensure public/authenticated read access for now to unblock
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all logs (or restrict?)
-- For now, let's allow all authenticated users to read to ensure visibility
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON activity_logs;
CREATE POLICY "Enable read access for authenticated users" ON activity_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow insert for authenticated (server side service role bypasses this anyway, but for client calls)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON activity_logs;
CREATE POLICY "Enable insert for authenticated users" ON activity_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 3. Fix stats timezone (Checking logic in SQL if used there, usually in Code)
-- This file just fixes the DB structure.
