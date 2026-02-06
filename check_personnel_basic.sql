-- PERSONEL PERFORMANS - EN BASİT VERSİYON
-- Sadece activity_logs ve attorney_status_history kullan

-- 1. Activity logs'dan personel listesi
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

-- 2. Attorney history'den avukat sorguları
SELECT 
    changed_by as "Personel",
    COUNT(*) FILTER (WHERE LOWER(new_status) NOT LIKE '%temiz%' 
                      AND LOWER(new_status) NOT LIKE '%riskli%' 
                      AND LOWER(new_status) NOT LIKE '%sorunlu%' 
                      AND LOWER(new_status) NOT LIKE '%icralık%') as "Avukat Sorgu",
    COUNT(*) FILTER (WHERE LOWER(new_status) LIKE '%temiz%') as "Temiz",
    COUNT(*) FILTER (WHERE LOWER(new_status) LIKE '%riskli%' 
                      OR LOWER(new_status) LIKE '%sorunlu%' 
                      OR LOWER(new_status) LIKE '%icralık%') as "Riskli"
FROM attorney_status_history
WHERE created_at >= '2026-02-01T00:00:00Z' 
  AND created_at <= '2026-02-06T23:59:59Z'
  AND changed_by IS NOT NULL
  AND changed_by NOT ILIKE '%sistem%'
  AND changed_by NOT ILIKE '%admin%'
  AND changed_by NOT ILIKE '%ibrahim%'
GROUP BY changed_by
ORDER BY "Avukat Sorgu" DESC;

-- 3. Leads tablosundan sütun isimlerini kontrol et
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
  AND column_name ILIKE '%sahip%' OR column_name ILIKE '%assigned%' OR column_name ILIKE '%owner%'
ORDER BY column_name;
