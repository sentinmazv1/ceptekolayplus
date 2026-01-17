
-- Create the missing 'inventory' table
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Device Info
  marka text NOT NULL,
  model text NOT NULL,
  imei text UNIQUE,
  seri_no text,

  -- Status
  durum text DEFAULT 'STOKTA', -- STOKTA, SATILDI
  
  -- Pricing
  alis_fiyati numeric DEFAULT 0, -- Cost price
  fiyat_nakit numeric,
  fiyat_taksitli numeric, -- General price
  
  -- Installment Prices (Cached)
  fiyat_3_taksit numeric,
  fiyat_6_taksit numeric,
  fiyat_12_taksit numeric,
  fiyat_15_taksit numeric,

  -- Relations
  musteri_id uuid REFERENCES leads(id), -- If sold
  satis_tarihi timestamptz,
  
  -- Metadata
  ekleyen text,
  giris_tarihi timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Allow access (For now public, as per other tables)
CREATE POLICY "Enable read access for all users" ON inventory FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON inventory FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON inventory FOR DELETE USING (true);
