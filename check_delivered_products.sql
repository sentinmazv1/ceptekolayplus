-- Teslim Edilen Müşteri Ürün Listesi
-- Tarih aralığında teslim edilen müşterilerin detayları

SELECT 
    l.ad_soyad as "Müşteri İsmi",
    l.meslek as "Meslek",
    l.satilan_urunler as "Ürünler",
    l.kredi_limiti as "Tutar",
    l.teslim_tarihi as "Teslim Tarihi",
    l.sahip_email as "Personel"
FROM leads l
WHERE l.durum = 'Teslim Edildi'
  AND l.teslim_tarihi >= '2026-02-01'
  AND l.teslim_tarihi <= '2026-02-06'
  AND l.sahip_email IS NOT NULL
  AND l.sahip_email NOT ILIKE '%sistem%'
  AND l.sahip_email NOT ILIKE '%admin%'
  AND l.sahip_email NOT ILIKE '%ibrahim%'
ORDER BY l.teslim_tarihi DESC
LIMIT 20;
