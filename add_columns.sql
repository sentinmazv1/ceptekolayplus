-- Add legacy and new columns to leads table if they are missing
-- This script is idempotent (safe to run multiple times)

DO $$
BEGIN
    -- 1. Check/Add 'gorsel_1_url'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'gorsel_1_url') THEN
        ALTER TABLE leads ADD COLUMN gorsel_1_url TEXT;
    END IF;

    -- 2. Check/Add 'gorsel_2_url'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'gorsel_2_url') THEN
        ALTER TABLE leads ADD COLUMN gorsel_2_url TEXT;
    END IF;

    -- 3. Check/Add 'onay_tarihi' (Was missing in some updates)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'onay_tarihi') THEN
        ALTER TABLE leads ADD COLUMN onay_tarihi TIMESTAMPTZ;
    END IF;

END $$;
