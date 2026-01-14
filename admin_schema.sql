
-- Admin Panel & User System Schema

-- 1. USERS TABLE (Replaces Google Sheets 'Users' tab)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Storing as text initially to match Sheets. Recommend hashing later.
    name TEXT,
    role TEXT DEFAULT 'SALES_REP', -- 'ADMIN' or 'SALES_REP'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- RLS for Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Admins can view/edit all. Users can view themselves.
CREATE POLICY "Admins can do everything on users" ON users
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'ADMIN' OR (select role from users where email = auth.jwt() ->> 'email') = 'ADMIN');
    
-- (Note: For Login, we use Service Role in NextAuth, so RLS doesn't block auth check)

-- 2. STATUSES TABLE (Dynamic Status Management)
CREATE TABLE IF NOT EXISTS statuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    label TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT 'gray',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Statuses (Safe Insert)
INSERT INTO statuses (label, color, sort_order) VALUES
('Yeni', 'blue', 1),
('Aranacak', 'yellow', 2),
('Ulaşılamadı', 'red', 3),
('Daha sonra aranmak istiyor', 'purple', 4),
('Meşgul/Hattı kapalı', 'red', 5),
('Cevap Yok', 'red', 6),
('Başvuru alındı', 'orange', 7),
('Kefil bekleniyor', 'orange', 8),
('Teslim edildi', 'green', 9),
('Onaylandı', 'green', 10),
('Reddetti', 'red', 11),
('İptal/Vazgeçti', 'gray', 12),
('Uygun değil', 'gray', 13)
ON CONFLICT (label) DO NOTHING;

-- 3. PRODUCTS TABLE (Product Management)
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Statuses/Products
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read statuses" ON statuses FOR SELECT USING (true);
CREATE POLICY "Admins can manage statuses" ON statuses FOR ALL USING ((select role from users where email = auth.jwt() ->> 'email') = 'ADMIN');

CREATE POLICY "Everyone can read products" ON products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON products FOR ALL USING ((select role from users where email = auth.jwt() ->> 'email') = 'ADMIN');
