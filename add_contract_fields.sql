-- Add new fields for Contract details
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS ev_adresi text,
ADD COLUMN IF NOT EXISTS is_adresi text,
ADD COLUMN IF NOT EXISTS is_yeri_unvani text;
