
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Leads Table (Müşteriler)
create table leads (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Core Identity
  ad_soyad text not null,
  telefon text,
  tc_kimlik text,
  email text,
  dogum_tarihi date,
  
  -- Status & Tracking
  durum text default 'Yeni',
  onay_durumu text default 'Beklemede', -- Beklemede, Onaylandı, Reddedildi, Kefil İstendi
  
  -- Ownership
  sahip_email text, -- For easier migration, we stick to email for now. Ideally UUID of auth.users
  
  -- Details
  sehir text,
  ilce text,
  meslek_is text,
  maas_bilgisi text, -- son_yatan_maas
  
  -- Legal & Assets (Booleans stored as text or boolean)
  icra_durumu jsonb, -- { varmi: boolean, detay: text }
  dava_durumu jsonb,
  
  -- Notes
  admin_notu text,
  arama_notu text,
  
  -- Metadata
  basvuru_kanali text, -- Instagram, Whatsapp, etc.
  talep_edilen_urun text,
  talep_edilen_tutar numeric
);

-- 2. Activity Logs Table (Loglar)
create table activity_logs (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  
  user_email text,
  lead_id uuid references leads(id),
  
  action text, -- PULL_LEAD, UPDATE_STATUS, etc.
  old_value text,
  new_value text,
  note text
);

-- 3. Products Table (Satılan Ürünler / Stok)
create table products (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  
  marka text,
  model text,
  imei text unique,
  seri_no text,
  
  durum text default 'STOKTA', -- STOKTA, SATILDI
  
  fiyat_nakit numeric,
  fiyat_taksitli numeric, -- Calculated price
  
  lead_id uuid references leads(id), -- If sold, link to customer
  satis_tarihi timestamptz
);

-- Enable Row Level Security (RLS)
alter table leads enable row level security;
alter table activity_logs enable row level security;
alter table products enable row level security;

-- Policies (For now, allow public access with Anon Key for simplicity of migration)
-- WARNING: In production, we will tighten this to Authenticated Users only.
create policy "Enable read access for all users" on leads for select using (true);
create policy "Enable insert for all users" on leads for insert with check (true);
create policy "Enable update for all users" on leads for update using (true);
create policy "Enable delete for all users" on leads for delete using (true);

create policy "Enable read access for all users" on activity_logs for select using (true);
create policy "Enable insert for all users" on activity_logs for insert with check (true);

create policy "Enable read access for all users" on products for select using (true);
create policy "Enable insert for all users" on products for insert with check (true);
create policy "Enable update for all users" on products for update using (true);
