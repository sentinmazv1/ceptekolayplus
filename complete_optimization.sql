-- ==========================================
-- FINAL CLEANUP & OPTIMIZATION SCRIPT
-- ==========================================
-- This script secures the remaining "helper" tables and adds extra performance indexes.

BEGIN;

-- 1. SECURITY: Enable RLS on Remaining Tables
-- Locking down these tables ensures "Security Issues" count drops to near zero.

ALTER TABLE IF EXISTS sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quick_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS competitor_hits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_brands ENABLE ROW LEVEL SECURITY;

-- 2. PERFORMANCE: Secondary Indexes
-- Indexes for 'helper' tables to speed up dropdowns and lookups.

-- SMS Templates
CREATE INDEX IF NOT EXISTS idx_sms_templates_category ON sms_templates(category);

-- Competitor Hits
CREATE INDEX IF NOT EXISTS idx_competitor_hits_created_at ON competitor_hits(created_at DESC);

-- Users (If strictly public table exists)
CREATE INDEX IF NOT EXISTS idx_users_email_search ON "users"(email);

-- 3. REPORTING INDEXES (Critical for "Raporlar" page speed)
-- Ensure these exist for the updated_at filtering used in V2 stats.

CREATE INDEX IF NOT EXISTS idx_leads_updated_at_brin ON leads USING brin(updated_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

COMMIT;

NOTIFY pgrst, 'reload schema';

SELECT 'FINAL OPTIMIZATION COMPLETED' as result;
