
-- Add specific date for payment promise
ALTER TABLE leads ADD COLUMN IF NOT EXISTS odeme_sozu_tarihi TIMESTAMPTZ;
