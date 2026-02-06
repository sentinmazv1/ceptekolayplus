-- Hangi durum değerleri var ve kaç tane?
SELECT durum, COUNT(*) as count
FROM leads
WHERE teslim_tarihi IS NOT NULL
GROUP BY durum
ORDER BY count DESC;

-- Alternatif: teslim_tarihi olan tüm kayıtlar
SELECT 
    l.ad_soyad,
    l.meslek,
    l.durum,
    l.satilan_urunler,
    l.kredi_limiti,
    l.teslim_tarihi,
    l.sahip_email
FROM leads l
WHERE l.teslim_tarihi IS NOT NULL
  AND l.teslim_tarihi >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY l.teslim_tarihi DESC
LIMIT 20;
