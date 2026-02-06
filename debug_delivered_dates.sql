-- Test: Teslim edildi kayıtları tarih filtresiz
SELECT 
    COUNT(*) as total,
    MIN(teslim_tarihi) as en_eski,
    MAX(teslim_tarihi) as en_yeni
FROM leads
WHERE durum IN ('Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Satış Yapıldı');

-- Test: Son 60 günde teslim edilenler
SELECT 
    ad_soyad,
    durum,
    teslim_tarihi,
    satilan_urunler
FROM leads
WHERE durum IN ('Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Satış Yapıldı')
  AND teslim_tarihi >= CURRENT_DATE - INTERVAL '60 days'
ORDER BY teslim_tarihi DESC
LIMIT 10;
