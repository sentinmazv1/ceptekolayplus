-- Create SMS Templates Table
create table if not exists sms_templates (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table sms_templates enable row level security;

-- Policies (Admin Only)
create policy "Allow full access to admins"
on sms_templates
for all
to authenticated
using (
  auth.email() in (select email from users where role = 'ADMIN')
);

-- Insert Default Templates
INSERT INTO sms_templates (title, content, tags) VALUES
('Onaylandı', 'Sayın {ad_soyad}, {urun} talebiniz ONAYLANMISTIR! Cihazinizi teslim almak icin sizi magazamiza bekliyoruz. CEPTE KOLAY', ARRAY['onay', 'teslim']),
('Kefil İstendi', 'Değerli Müşterimiz {ad_soyad}, başvurunuzun olumlu sonuçlanabilmesi için kefil desteğine ihtiyaç duyulmuştur. Detaylı bilgi için bize ulaşabilirsiniz. CEPTE KOLAY', ARRAY['kefil']),
('Ulaşılamadı', 'Sayın {ad_soyad}, başvurunuzla ilgili size ulaşmaya çalıştık ancak ulaşamadık. Müsait olduğunuzda dönüş yapmanızı rica ederiz. CEPTE KOLAY', ARRAY['ulasilamadi']),
('Teslim Edildi', 'Sayın {ad_soyad}, ürününüz teslim edilmiştir. İyi günlerde kullanın. CEPTE KOLAY', ARRAY['teslim']);
