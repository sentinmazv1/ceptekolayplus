
-- SCHEMA SYNC FOR CUSTOMER CARD FIELDS
-- Adds missing columns to the leads table to match UI and Typescript interfaces

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS ev_adresi TEXT,
ADD COLUMN IF NOT EXISTS is_adresi TEXT,
ADD COLUMN IF NOT EXISTS is_yeri_unvani TEXT,
ADD COLUMN IF NOT EXISTS is_yeri_bilgisi TEXT,
ADD COLUMN IF NOT EXISTS meslek TEXT,
ADD COLUMN IF NOT EXISTS onay_tarihi TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS teslim_tarihi TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS teslim_eden TEXT,
ADD COLUMN IF NOT EXISTS urun_seri_no TEXT,
ADD COLUMN IF NOT EXISTS urun_imei TEXT,
ADD COLUMN IF NOT EXISTS winner_musteri_no TEXT,
ADD COLUMN IF NOT EXISTS iptal_nedeni TEXT,
ADD COLUMN IF NOT EXISTS ozet_notlar TEXT; -- Optional but useful for quick summaries

COMMENT ON COLUMN leads.ev_adresi IS 'Customer home address for contracts';
COMMENT ON COLUMN leads.is_adresi IS 'Customer work address for contracts';
COMMENT ON COLUMN leads.is_yeri_unvani IS 'Corporate title of the workplace';
COMMENT ON COLUMN leads.is_yeri_bilgisi IS 'Additional workplace details';
COMMENT ON COLUMN leads.meslek IS 'Customer profession/job title';
