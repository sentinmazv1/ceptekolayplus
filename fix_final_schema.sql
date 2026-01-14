-- Comprehensive Schema Fix for ALL missing Customer fields
-- This ensures the DB matches the full Typescript interface

ALTER TABLE leads 
-- Avukat / Yasal Sorgu
ADD COLUMN IF NOT EXISTS avukat_sorgu_durumu TEXT,
ADD COLUMN IF NOT EXISTS avukat_sorgu_sonuc TEXT,
ADD COLUMN IF NOT EXISTS aciklama_uzun TEXT,

-- Psikoteknik & Belgeler
ADD COLUMN IF NOT EXISTS psikoteknik_varmi TEXT, -- Evet/Hayır
ADD COLUMN IF NOT EXISTS psikoteknik_notu TEXT,
ADD COLUMN IF NOT EXISTS ikametgah_varmi TEXT, -- Evet/Hayır
ADD COLUMN IF NOT EXISTS hizmet_dokumu_varmi TEXT, -- Evet/Hayır

-- İş & Gelir Detay
ADD COLUMN IF NOT EXISTS ayni_isyerinde_sure_ay TEXT,

-- Varlıklar & Detaylar
ADD COLUMN IF NOT EXISTS mulkiyet_durumu TEXT,
ADD COLUMN IF NOT EXISTS arac_varmi TEXT,
ADD COLUMN IF NOT EXISTS arac_detay TEXT,
ADD COLUMN IF NOT EXISTS tapu_varmi TEXT,
ADD COLUMN IF NOT EXISTS tapu_detay TEXT,

-- İcra/Dava Detayları (Mevcut JSONB yerine kolon olarak da destekleyelim veya JSONB güncellemesi yapalım. 
-- Mevcut kod JSONB kullanıyor ama bazı alanlar eksik olabilir.
-- Eksik olanlar:
ADD COLUMN IF NOT EXISTS kapali_icra_kapanis_sekli TEXT,
ADD COLUMN IF NOT EXISTS gizli_dosya_varmi TEXT,
ADD COLUMN IF NOT EXISTS gizli_dosya_detay TEXT,

-- KEFİL (Bütün Detaylar)
ADD COLUMN IF NOT EXISTS kefil_meslek_is TEXT,
ADD COLUMN IF NOT EXISTS kefil_son_yatan_maas TEXT,
ADD COLUMN IF NOT EXISTS kefil_ayni_isyerinde_sure_ay TEXT,
ADD COLUMN IF NOT EXISTS kefil_e_devlet_sifre TEXT,
ADD COLUMN IF NOT EXISTS kefil_ikametgah_varmi TEXT,
ADD COLUMN IF NOT EXISTS kefil_hizmet_dokumu_varmi TEXT,
ADD COLUMN IF NOT EXISTS kefil_dava_dosyasi_varmi TEXT,
ADD COLUMN IF NOT EXISTS kefil_dava_detay TEXT,
ADD COLUMN IF NOT EXISTS kefil_acik_icra_varmi TEXT,
ADD COLUMN IF NOT EXISTS kefil_acik_icra_detay TEXT,
ADD COLUMN IF NOT EXISTS kefil_kapali_icra_varmi TEXT,
ADD COLUMN IF NOT EXISTS kefil_kapali_icra_kapanis_sekli TEXT,
ADD COLUMN IF NOT EXISTS kefil_mulkiyet_durumu TEXT,
ADD COLUMN IF NOT EXISTS kefil_arac_varmi TEXT,
ADD COLUMN IF NOT EXISTS kefil_tapu_varmi TEXT,
ADD COLUMN IF NOT EXISTS kefil_notlar TEXT;
