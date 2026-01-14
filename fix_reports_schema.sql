-- Add onay_tarihi column for reporting
ALTER TABLE leads ADD COLUMN IF NOT EXISTS onay_tarihi TIMESTAMPTZ;
