-- Add missing columns to leads table to support full customer card functionality

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS sonraki_arama_zamani TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS son_arama_zamani TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS teslim_tarihi TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS teslim_eden TEXT,
ADD COLUMN IF NOT EXISTS winner_musteri_no TEXT,
ADD COLUMN IF NOT EXISTS e_devlet_sifre TEXT,
ADD COLUMN IF NOT EXISTS iptal_nedeni TEXT,
ADD COLUMN IF NOT EXISTS kefil_ad_soyad TEXT,
ADD COLUMN IF NOT EXISTS kefil_telefon TEXT,
ADD COLUMN IF NOT EXISTS kefil_tc_kimlik TEXT,
ADD COLUMN IF NOT EXISTS urun_imei TEXT,
ADD COLUMN IF NOT EXISTS urun_seri_no TEXT,
ADD COLUMN IF NOT EXISTS satilan_urunler JSONB DEFAULT '[]'::jsonb;

-- Ensure RLS allows updates to these new columns (Policies usually cover all columns, but good to check)
-- Existing policies are: create policy "Enable update for all users" on leads for update using (true); -> Covers all.

-- Verify updated_at trigger or default
-- If no trigger exists to auto-update updated_at, the application handles it manually, which is fine.
