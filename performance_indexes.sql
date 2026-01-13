
-- 1M+ Scale Performance Indexes

-- 1. Status & Ownership (Most used filter: "My Leads", "Pool")
CREATE INDEX IF NOT EXISTS idx_leads_durum ON leads(durum);
CREATE INDEX IF NOT EXISTS idx_leads_sahip_email ON leads(sahip_email);

-- 2. Sorting & Time Logic (Critical for "Recent", "Scheduled", "Retry timeouts")
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_sonraki_arama ON leads(sonraki_arama_zamani);
CREATE INDEX IF NOT EXISTS idx_leads_son_arama ON leads(son_arama_zamani);

-- 3. Search Performance (Phone & ID are exact or prefix searches)
-- For 'ilike' queries on names, PostgreSQL usually needs pg_trgm extension for speed on 1M rows.
-- For now, standard B-tree handles prefix/exact matches well enough.
CREATE INDEX IF NOT EXISTS idx_leads_telefon ON leads(telefon);
CREATE INDEX IF NOT EXISTS idx_leads_tc_kimlik ON leads(tc_kimlik);

-- 4. Composite Index for Pool Queries (Optimization for "Unowned + Status")
CREATE INDEX IF NOT EXISTS idx_leads_pool_optim ON leads(sahip_email, durum);
