-- Teslim tarihi formatını ve değerlerini kontrol et
SELECT 
    ad_soyad,
    durum,
    teslim_tarihi,
    teslim_tarihi::date as tarih_only,
    CASE 
        WHEN teslim_tarihi >= '2026-02-01T00:00:00.000Z' AND teslim_tarihi <= '2026-02-06T23:59:59.999Z' THEN 'MATCH'
        ELSE 'NO MATCH'
    END as iso_filter_test,
    CASE 
        WHEN teslim_tarihi::date >= '2026-02-01' AND teslim_tarihi::date <= '2026-02-06' THEN 'MATCH'
        ELSE 'NO MATCH'
    END as date_filter_test
FROM leads
WHERE durum IN ('Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Satış Yapıldı')
ORDER BY teslim_tarihi DESC
LIMIT 10;
