-- ==========================================
-- SUPABASE OPTIMIZATION & SECURITY SCRIPT
-- ==========================================
-- This script addresses the 53 reported issues:
-- 1. Enables RLS (Security) on tables to prevent unauthorized access.
-- 2. Adds INDEXES (Performance) to speed up slow queries.
-- 3. Secures FUNCTIONS by setting a explicit search_path.

BEGIN;

-- 1. SECURITY: Enable Row Level Security (RLS)
-- When RLS is enabled without policies, NO ONE (except Service Role) can access the data.
-- Since our app uses API Routes (Service Role), this effectively locks the DB from public view.

ALTER TABLE IF EXISTS leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS collection_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS collection_statuses ENABLE ROW LEVEL SECURITY;

-- 2. PERFORMANCE: Add Indexes for Frequent Queries
-- These indexes target the columns most used in filters and sorting.

-- Leads Table
CREATE INDEX IF NOT EXISTS idx_leads_durum ON leads(durum);
CREATE INDEX IF NOT EXISTS idx_leads_sahip_email ON leads(sahip_email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_telefon_search ON leads(telefon);
CREATE INDEX IF NOT EXISTS idx_leads_tc_search ON leads(tc_kimlik);
CREATE INDEX IF NOT EXISTS idx_leads_basvuru_kanali ON leads(basvuru_kanali);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at DESC);

-- Activity Logs (Heavy table)
CREATE INDEX IF NOT EXISTS idx_logs_lead_id ON activity_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON activity_logs(created_at DESC);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_durum ON inventory(durum);
CREATE INDEX IF NOT EXISTS idx_inventory_marka_model ON inventory(marka, model);

-- 3. FUNCTION SECURITY: Set Search Path
-- Prevents malicious code from hijacking the search path.

ALTER FUNCTION update_updated_at_column() SET search_path = public;

-- Attempt to fix collection stats functions if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_collection_city_stats_v1') THEN
        ALTER FUNCTION get_collection_city_stats_v1() SET search_path = public;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_collection_daily_stats_v1') THEN
        ALTER FUNCTION get_collection_daily_stats_v1() SET search_path = public;
    END IF;
END
$$;

COMMIT;

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';

-- Verification Output
SELECT 'OPTIMIZATION COMPLETED SUCCESSFULLY' as result;
