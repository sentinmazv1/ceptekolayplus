-- Create cancellation_reasons table
CREATE TABLE IF NOT EXISTS cancellation_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to all users" ON cancellation_reasons
    FOR SELECT TO authenticated USING (true);

-- Allow write access only to admins (based on email for now as simplified logic found in app)
-- or allow all authenticated for simplicity in this MVP context if admin role isn't strict in DB
CREATE POLICY "Allow write access to all users" ON cancellation_reasons
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default reasons
INSERT INTO cancellation_reasons (reason) VALUES
('Müşteri Vazgeçti'),
('Fiyat Yüksek Geldi'),
('Rakip Firmadan aldı'),
('Stok Sorunu'),
('Ulaşılamıyor'),
('Diğer')
ON CONFLICT (reason) DO NOTHING;
