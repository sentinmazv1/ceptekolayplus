-- Gecikme sınıfındaki tüm müşterileri kontrol et
-- ÖNEMLI: Bu sorgu collection panel ile AYNI mantığı kullanmalı

-- 1. Toplam Gecikme dosyası
SELECT COUNT(*) as "Toplam Dosya"
FROM leads
WHERE sinif = 'Gecikme';

-- 2. Tahsilat durumlarına göre dağılım
SELECT 
    COALESCE(tahsilat_durumu, '(boş/null)') as "Tahsilat Durumu",
    COUNT(*) as "Adet"
FROM leads
WHERE sinif = 'Gecikme'
GROUP BY tahsilat_durumu
ORDER BY COUNT(*) DESC;

-- 3. SÖZÜ GEÇEN - Collection panel mantığı: sadece tarih < bugün
-- (tahsilat_durumu kontrolü YOK!)
SELECT 
    ad_soyad,
    tahsilat_durumu,
    odeme_sozu_tarihi::date as "Söz Tarihi"
FROM leads
WHERE sinif = 'Gecikme' 
  AND odeme_sozu_tarihi < CURRENT_DATE
ORDER BY odeme_sozu_tarihi;

SELECT COUNT(*) as "Sözü Geçen (tarih bazlı)"
FROM leads
WHERE sinif = 'Gecikme' 
  AND odeme_sozu_tarihi < CURRENT_DATE;

-- 4. Duruma göre sayılar (collection stats API mantığı)
SELECT 
    'Toplam Dosya' as "KPI",
    COUNT(*) as "Adet"
FROM leads
WHERE sinif = 'Gecikme'

UNION ALL

SELECT 
    'Ödeme Sözü Alındı (tümü)',
    COUNT(*)
FROM leads
WHERE sinif = 'Gecikme' 
  AND tahsilat_durumu = 'Ödeme Sözü Alındı'

UNION ALL

SELECT 
    'Ulaşılamadı',
    COUNT(*)
FROM leads
WHERE sinif = 'Gecikme' 
  AND tahsilat_durumu = 'Ulaşılamadı'

UNION ALL

SELECT 
    'Avukata Hazırlık Aşaması',
    COUNT(*)
FROM leads
WHERE sinif = 'Gecikme' 
  AND tahsilat_durumu = 'Avukata Hazırlık Aşaması'

UNION ALL

SELECT 
    'Avukata Teslim Edildi',
    COUNT(*)
FROM leads
WHERE sinif = 'Gecikme' 
  AND tahsilat_durumu = 'Avukata Teslim Edildi'

UNION ALL

SELECT 
    'Boş/Null (İşlem Bekliyor)',
    COUNT(*)
FROM leads
WHERE sinif = 'Gecikme' 
  AND (tahsilat_durumu IS NULL OR tahsilat_durumu = '');

-- 5. RAPORLAR İÇİN DOĞRU HESAPLAMA
-- Collection panel "Sözü Geçen" mantığı: sadece odeme_sozu_tarihi < bugün
SELECT 
    'Sözü Geçen (panel mantığı)' as "KPI",
    COUNT(*) as "Adet"
FROM leads
WHERE sinif = 'Gecikme' 
  AND odeme_sozu_tarihi < CURRENT_DATE;
