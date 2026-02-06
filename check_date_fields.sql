-- Teslim edildi kayıtlarında hangi tarih fieldları dolu?
SELECT 
    ad_soyad,
    durum,
    created_at,
    updated_at,
    teslim_tarihi,
    onay_tarihi
FROM leads
WHERE durum IN ('Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Satış Yapıldı')
ORDER BY updated_at DESC
LIMIT 10;
