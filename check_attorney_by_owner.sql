-- Avukat Sorguları - Lead Sahibine Göre

-- 1. Attorney history + leads JOIN
SELECT 
    l.sahip_email as "Personel",
    COUNT(*) FILTER (WHERE ah.new_status = 'Sorgu Bekleniyor' OR ah.new_status = 'Kefil bekleniyor') as "Avukat Sorgu",
    COUNT(*) FILTER (WHERE ah.new_status = 'Temiz') as "Temiz",
    COUNT(*) FILTER (WHERE ah.new_status = 'Riskli') as "Riskli"
FROM attorney_status_history ah
JOIN leads l ON ah.lead_id = l.id
WHERE ah.created_at >= '2026-02-01T00:00:00Z' 
  AND ah.created_at <= '2026-02-06T23:59:59Z'
  AND l.sahip_email IS NOT NULL
  AND l.sahip_email NOT ILIKE '%sistem%'
  AND l.sahip_email NOT ILIKE '%admin%'
  AND l.sahip_email NOT ILIKE '%ibrahim%'
GROUP BY l.sahip_email
ORDER BY "Avukat Sorgu" DESC;

-- 2. Detaylı liste - hangi leadler için avukat sorgusu yapıldı
SELECT 
    ah.created_at,
    ah.changed_by as "İşlemi Yapan",
    l.sahip_email as "Lead Sahibi",
    l.ad_soyad as "Müşteri",
    ah.new_status,
    ah.lead_id
FROM attorney_status_history ah
JOIN leads l ON ah.lead_id = l.id
WHERE ah.created_at >= '2026-02-01T00:00:00Z' 
  AND ah.created_at <= '2026-02-06T23:59:59Z'
  AND (ah.new_status = 'Temiz' OR ah.new_status = 'Riskli' OR ah.new_status = 'Sorgu Bekleniyor' OR ah.new_status = 'Kefil bekleniyor')
ORDER BY ah.created_at DESC;
