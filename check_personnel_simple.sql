-- PERSONEL PERFORMANS RAPORU - BASİT VERSİYON
-- Test tarihleri: 2026-02-01 ile 2026-02-06 arası

-- BU SORGUYU ÇALIŞTIR
WITH personel_list AS (
    -- Tüm personeli topla
    SELECT DISTINCT user_email as personel FROM activity_logs
    WHERE created_at >= '2026-02-01T00:00:00Z' AND created_at <= '2026-02-06T23:59:59Z'
      AND user_email IS NOT NULL
    UNION
    SELECT DISTINCT changed_by FROM attorney_status_history
    WHERE created_at >= '2026-02-01T00:00:00Z' AND created_at <= '2026-02-06T23:59:59Z'
      AND changed_by IS NOT NULL
    UNION
    SELECT DISTINCT COALESCE(sahip, sahip_email, assigned_to) FROM leads
    WHERE ((onay_tarihi >= '2026-02-01T00:00:00Z' AND onay_tarihi <= '2026-02-06T23:59:59Z')
       OR (teslim_tarihi >= '2026-02-01T00:00:00Z' AND teslim_tarihi <= '2026-02-06T23:59:59Z'))
      AND COALESCE(sahip, sahip_email, assigned_to) IS NOT NULL
)
SELECT 
    p.personel as "Personel",
    
    -- Arama
    (SELECT COUNT(*) FROM activity_logs 
     WHERE action = 'PULL_LEAD' 
       AND user_email = p.personel
       AND created_at >= '2026-02-01T00:00:00Z' 
       AND created_at <= '2026-02-06T23:59:59Z') as "Arama",
    
    -- SMS
    (SELECT COUNT(*) FROM activity_logs 
     WHERE (action = 'SEND_SMS' OR action = 'CLICK_SMS')
       AND user_email = p.personel
       AND created_at >= '2026-02-01T00:00:00Z' 
       AND created_at <= '2026-02-06T23:59:59Z') as "SMS",
    
    -- WhatsApp
    (SELECT COUNT(*) FROM activity_logs 
     WHERE (action = 'SEND_WHATSAPP' OR action = 'CLICK_WHATSAPP')
       AND user_email = p.personel
       AND created_at >= '2026-02-01T00:00:00Z' 
       AND created_at <= '2026-02-06T23:59:59Z') as "WP",
    
    -- Başvuru
    (SELECT COUNT(*) FROM activity_logs 
     WHERE (action = 'UPDATE_STATUS' OR action = 'CREATED')
       AND (LOWER(new_value) LIKE '%başvuru alındı%' 
            OR LOWER(new_value) LIKE '%onaya gönderildi%' 
            OR LOWER(new_value) LIKE '%onay bekleniyor%' 
            OR LOWER(new_value) LIKE '%eksik evrak bekleniyor%')
       AND user_email = p.personel
       AND created_at >= '2026-02-01T00:00:00Z' 
       AND created_at <= '2026-02-06T23:59:59Z') as "Başvuru",
    
    -- Avukat Sorgu
    (SELECT COUNT(*) FROM attorney_status_history 
     WHERE changed_by = p.personel
       AND created_at >= '2026-02-01T00:00:00Z' 
       AND created_at <= '2026-02-06T23:59:59Z'
       AND (LOWER(new_status) NOT LIKE '%temiz%' 
            AND LOWER(new_status) NOT LIKE '%riskli%' 
            AND LOWER(new_status) NOT LIKE '%sorunlu%' 
            AND LOWER(new_status) NOT LIKE '%icralık%')) as "Avukat Sorgu",
    
    -- Temiz
    (SELECT COUNT(*) FROM attorney_status_history 
     WHERE changed_by = p.personel
       AND created_at >= '2026-02-01T00:00:00Z' 
       AND created_at <= '2026-02-06T23:59:59Z'
       AND LOWER(new_status) LIKE '%temiz%') as "Temiz",
    
    -- Riskli
    (SELECT COUNT(*) FROM attorney_status_history 
     WHERE changed_by = p.personel
       AND created_at >= '2026-02-01T00:00:00Z' 
       AND created_at <= '2026-02-06T23:59:59Z'
       AND (LOWER(new_status) LIKE '%riskli%' 
            OR LOWER(new_status) LIKE '%sorunlu%' 
            OR LOWER(new_status) LIKE '%icralık%')) as "Riskli",
    
    -- Onaylı Adet
    (SELECT COUNT(*) FROM leads 
     WHERE onay_durumu = 'Onaylandı'
       AND COALESCE(sahip, sahip_email, assigned_to) = p.personel
       AND onay_tarihi >= '2026-02-01T00:00:00Z' 
       AND onay_tarihi <= '2026-02-06T23:59:59Z') as "Onaylı Adet",
    
    -- Onaylı Limit
    (SELECT COALESCE(SUM(
        CASE 
            WHEN kredi_limiti IS NULL THEN 0
            WHEN kredi_limiti::text ~ '^[0-9]+$' THEN kredi_limiti::numeric
            ELSE CAST(REGEXP_REPLACE(kredi_limiti::text, '[^0-9,.-]', '', 'g') AS numeric)
        END
    ), 0) FROM leads 
     WHERE onay_durumu = 'Onaylandı'
       AND COALESCE(sahip, sahip_email, assigned_to) = p.personel
       AND onay_tarihi >= '2026-02-01T00:00:00Z' 
       AND onay_tarihi <= '2026-02-06T23:59:59Z') as "Onaylı Limit",
    
    -- Teslim Adet
    (SELECT COUNT(*) FROM leads 
     WHERE (durum = 'Teslim edildi' OR durum = 'Satış yapıldı/Tamamlandı' OR durum = 'Satış Yapıldı')
       AND COALESCE(sahip, sahip_email, assigned_to) = p.personel
       AND teslim_tarihi >= '2026-02-01T00:00:00Z' 
       AND teslim_tarihi <= '2026-02-06T23:59:59Z') as "Teslim Adet",
    
    -- Ciro
    (SELECT COALESCE(SUM(
        CASE 
            WHEN kredi_limiti IS NULL THEN 0
            WHEN kredi_limiti::text ~ '^[0-9]+$' THEN kredi_limiti::numeric
            ELSE CAST(REGEXP_REPLACE(kredi_limiti::text, '[^0-9,.-]', '', 'g') AS numeric)
        END
    ), 0) FROM leads 
     WHERE (durum = 'Teslim edildi' OR durum = 'Satış yapıldı/Tamamlandı' OR durum = 'Satış Yapıldı')
       AND COALESCE(sahip, sahip_email, assigned_to) = p.personel
       AND teslim_tarihi >= '2026-02-01T00:00:00Z' 
       AND teslim_tarihi <= '2026-02-06T23:59:59Z') as "Ciro"

FROM personel_list p
WHERE p.personel NOT ILIKE '%sistem%'
  AND p.personel NOT ILIKE '%admin%'
  AND p.personel NOT ILIKE '%ibrahim%'
ORDER BY "Ciro" DESC;
