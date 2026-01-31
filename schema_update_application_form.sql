-- Add columns for Application Form Logic
ALTER TABLE leads ADD COLUMN IF NOT EXISTS taksit_sayisi INT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS basvuru_kanali TEXT;
