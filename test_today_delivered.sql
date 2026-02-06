-- Bugün (2026-02-06) teslim edilen müşteriler
-- Tüm tarih fieldlarını kontrol edelim

SELECT 
    ad_soyad as "Müşteri İsmi",
    meslek as "Meslek",
    durum as "Durum",
    created_at as "Oluşturulma",
    updated_at as "Güncellenme",
    teslim_tarihi as "Teslim Tarihi",
    onay_tarihi as "Onay Tarihi",
    -- Hangi tarih bugüne denk geliyor?
    CASE 
        WHEN created_at::date = '2026-02-06' THEN 'created_at'
        WHEN updated_at::date = '2026-02-06' THEN 'updated_at'
        WHEN teslim_tarihi::date = '2026-02-06' THEN 'teslim_tarihi'
        WHEN onay_tarihi::date = '2026-02-06' THEN 'onay_tarihi'
        ELSE 'none'
    END as "Bugüne Denk Gelen Field"
FROM leads
WHERE durum IN ('Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Satış Yapıldı')
  AND (
      created_at::date = '2026-02-06' OR
      updated_at::date = '2026-02-06' OR
      teslim_tarihi::date = '2026-02-06' OR
      onay_tarihi::date = '2026-02-06'
  )
ORDER BY updated_at DESC
LIMIT 20;
