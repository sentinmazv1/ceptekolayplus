-- Teslim Edilen Müşteri Ürün Listesi - Daha Geniş Tarih
-- Son 30 günde teslim edilen müşterilerin detayları

SELECT 
    l.ad_soyad as "Müşteri İsmi",
    l.meslek as "Meslek",
    l.satilan_urunler as "Ürünler",
    l.kredi_limiti as "Tutar",
    l.teslim_tarihi as "Teslim Tarihi",
    l.sahip_email as "Personel"
FROM leads l
WHERE l.durum = 'Teslim Edildi'
  AND l.teslim_tarihi >= CURRENT_DATE - INTERVAL '30 days'
  AND l.sahip_email IS NOT NULL
  AND l.sahip_email NOT ILIKE '%sistem%'
  AND l.sahip_email NOT ILIKE '%admin%'
  AND l.sahip_email NOT ILIKE '%ibrahim%'
ORDER BY l.teslim_tarihi DESC
LIMIT 20;
