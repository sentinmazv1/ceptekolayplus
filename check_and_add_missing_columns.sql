-- VERITABANI ALAN KONTROLÜ VE EKSİK KOLONLARIN EKLENMESİ
-- Bu script ile yeni eklenen alanların database'de olup olmadığını kontrol edip, yoksa ekleyeceğiz

-- ===================================
-- LEADS TABLOSU EKSİK ALANLAR
-- ===================================

-- finansal_notlar (yeni eklendi - müşteri kartında kullanılıyor)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'finansal_notlar'
    ) THEN
        ALTER TABLE leads ADD COLUMN finansal_notlar TEXT;
        RAISE NOTICE 'finansal_notlar kolonu eklendi';
    ELSE
        RAISE NOTICE 'finansal_notlar kolonu zaten mevcut';
    END IF;
END $$;

-- avukat_sorgu_sonuc (mevcut olmalı ama kontrol edelim)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'avukat_sorgu_sonuc'
    ) THEN
        ALTER TABLE leads ADD COLUMN avukat_sorgu_sonuc TEXT;
        RAISE NOTICE 'avukat_sorgu_sonuc kolonu eklendi';
    ELSE
        RAISE NOTICE 'avukat_sorgu_sonuc kolonu zaten mevcut';
    END IF;
END $$;

-- kefil_notlar (mevcut olmalı ama kontrol edelim)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'kefil_notlar'
    ) THEN
        ALTER TABLE leads ADD COLUMN kefil_notlar TEXT;
        RAISE NOTICE 'kefil_notlar kolonu eklendi';
    ELSE
        RAISE NOTICE 'kefil_notlar kolonu zaten mevcut';
    END IF;
END $$;

-- ===================================
-- TÜM ALANLARIN LİSTESİNİ KONTROL ET
-- ===================================

-- Leads tablosundaki tüm kolonları listele
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'leads'
ORDER BY ordinal_position;

-- Inventory tablosundaki tüm kolonları listele  
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'inventory'
ORDER BY ordinal_position;

-- Logs tablosundaki tüm kolonları listele
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'logs'
ORDER BY ordinal_position;

-- ===================================
-- RAPOR: EKSİK OLABILECEK DİĞER ALANLAR
-- ===================================

-- Bu alanlar types.ts'de var, database'de olup olmadığını kontrol et:
DO $$
DECLARE
    missing_fields TEXT[] := ARRAY[
        'finansal_notlar',
        'ozel_musteri_mi', 
        'calisma_sekli',
        'ek_gelir',
        'findeks_risk_durumu',
        'renk',
        'satis_tarihi',
        'kargo_takip_no'
    ];
    field TEXT;
    exists_count INTEGER;
BEGIN
    RAISE NOTICE '=== EKSİK ALAN KONTROLÜ ===';
    FOREACH field IN ARRAY missing_fields
    LOOP
        SELECT COUNT(*) INTO exists_count
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = field;
        
        IF exists_count = 0 THEN
            RAISE NOTICE 'EKSİK: % kolonu leads tablosunda YOK', field;
        ELSE
            RAISE NOTICE 'MEVCUT: % kolonu var', field;
        END IF;
    END LOOP;
END $$;
