-- PERSONEL PERFORMANS RAPORU - DOĞRU SÜTUNLARLA
-- Test tarihleri: 2026-02-01 ile 2026-02-06 arası

-- 1. Activity Logs Metrikleri
SELECT 
    user_email as "Personel",
    COUNT(*) FILTER (WHERE action = 'PULL_LEAD') as "Arama",
    COUNT(*) FILTER (WHERE action = 'SEND_SMS' OR action = 'CLICK_SMS') as "SMS",
    COUNT(*) FILTER (WHERE action = 'SEND_WHATSAPP' OR action = 'CLICK_WHATSAPP') as "WP",
    COUNT(*) FILTER (WHERE (action = 'UPDATE_STATUS' OR action = 'CREATED') 
                      AND (LOWER(new_value) LIKE '%başvuru alındı%' 
                           OR LOWER(new_value) LIKE '%onaya gönderildi%' 
                           OR LOWER(new_value) LIKE '%onay bekleniyor%' 
                           OR LOWER(new_value) LIKE '%eksik evrak bekleniyor%')) as "Başvuru"
FROM activity_logs
WHERE created_at >= '2026-02-01T00:00:00Z' 
  AND created_at <= '2026-02-06T23:59:59Z'
  AND user_email IS NOT NULL
  AND user_email NOT ILIKE '%sistem%'
  AND user_email NOT ILIKE '%admin%'
  AND user_email NOT ILIKE '%ibrahim%'
GROUP BY user_email
ORDER BY "Arama" DESC;

-- 2. Attorney History Metrikleri
SELECT 
    changed_by as "Personel",
    COUNT(*) FILTER (WHERE new_status = 'Sorgu Bekleniyor' OR new_status = 'Kefil bekleniyor') as "Avukat Sorgu",
    COUNT(*) FILTER (WHERE new_status = 'Temiz') as "Temiz",
    COUNT(*) FILTER (WHERE new_status = 'Riskli') as "Riskli"
FROM attorney_status_history
WHERE created_at >= '2026-02-01T00:00:00Z' 
  AND created_at <= '2026-02-06T23:59:59Z'
  AND changed_by IS NOT NULL
  AND changed_by NOT ILIKE '%sistem%'
  AND changed_by NOT ILIKE '%admin%'
  AND changed_by NOT ILIKE '%ibrahim%'
GROUP BY changed_by
ORDER BY "Avukat Sorgu" DESC;

-- 3. Onaylı Limit ve Adet
SELECT 
    sahip_email as "Personel",
    COUNT(*) as "Onaylı Adet",
    SUM(
        CASE 
            WHEN kredi_limiti IS NULL THEN 0
            WHEN kredi_limiti::text ~ '^[0-9]+$' THEN kredi_limiti::numeric
            ELSE CAST(REGEXP_REPLACE(kredi_limiti::text, '[^0-9,.-]', '', 'g') AS numeric)
        END
    ) as "Onaylı Limit"
FROM leads
WHERE onay_durumu = 'Onaylandı'
  AND onay_tarihi >= '2026-02-01T00:00:00Z'
  AND onay_tarihi <= '2026-02-06T23:59:59Z'
  AND sahip_email IS NOT NULL
  AND sahip_email NOT ILIKE '%sistem%'
  AND sahip_email NOT ILIKE '%admin%'
  AND sahip_email NOT ILIKE '%ibrahim%'
GROUP BY sahip_email
ORDER BY "Onaylı Limit" DESC;

-- 4. Teslim Edilen ve Ciro
SELECT 
    sahip_email as "Personel",
    COUNT(*) as "Teslim Adet",
    SUM(
        CASE 
            WHEN kredi_limiti IS NULL THEN 0
            WHEN kredi_limiti::text ~ '^[0-9]+$' THEN kredi_limiti::numeric
            ELSE CAST(REGEXP_REPLACE(kredi_limiti::text, '[^0-9,.-]', '', 'g') AS numeric)
        END
    ) as "Ciro"
FROM leads
WHERE (durum = 'Teslim edildi' OR durum = 'Satış yapıldı/Tamamlandı' OR durum = 'Satış Yapıldı')
  AND teslim_tarihi >= '2026-02-01T00:00:00Z'
  AND teslim_tarihi <= '2026-02-06T23:59:59Z'
  AND sahip_email IS NOT NULL
  AND sahip_email NOT ILIKE '%sistem%'
  AND sahip_email NOT ILIKE '%admin%'
  AND sahip_email NOT ILIKE '%ibrahim%'
GROUP BY sahip_email
ORDER BY "Ciro" DESC;
