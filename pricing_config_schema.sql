CREATE TABLE IF NOT EXISTS pricing_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    multiplier_15 DECIMAL(10,2) DEFAULT 2.60,
    divisor_12 DECIMAL(10,2) DEFAULT 1.05,
    divisor_6 DECIMAL(10,2) DEFAULT 1.10,
    divisor_3 DECIMAL(10,2) DEFAULT 1.10,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID -- Optional: link to user who made changes
);

-- RLS
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read (needed for calculations)
CREATE POLICY "Public read pricing config" ON pricing_config FOR SELECT USING (true);

-- Allow only admins to update/insert
CREATE POLICY "Admins manage pricing config" ON pricing_config FOR ALL USING ((select role from users where email = auth.jwt() ->> 'email') = 'ADMIN');

-- Insert default row if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pricing_config) THEN
        INSERT INTO pricing_config (multiplier_15, divisor_12, divisor_6, divisor_3)
        VALUES (2.60, 1.05, 1.10, 1.10);
    END IF;
END $$;
