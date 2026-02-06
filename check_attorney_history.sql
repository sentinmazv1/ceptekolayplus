-- Attorney Status History Kontrolü

-- 1. Toplam kayıt sayısı
SELECT COUNT(*) as "Toplam Kayıt"
FROM attorney_status_history;

-- 2. Tarih aralığında kayıt var mı?
SELECT COUNT(*) as "Tarih Aralığında Kayıt"
FROM attorney_status_history
WHERE created_at >= '2026-02-01T00:00:00Z' 
  AND created_at <= '2026-02-06T23:59:59Z';

-- 3. Son 10 kayıt
SELECT 
    created_at,
    changed_by,
    new_status,
    lead_id
FROM attorney_status_history
ORDER BY created_at DESC
LIMIT 10;

-- 4. changed_by değerleri
SELECT 
    changed_by,
    COUNT(*) as "Kayıt Sayısı"
FROM attorney_status_history
GROUP BY changed_by
ORDER BY COUNT(*) DESC;

-- 5. new_status değerleri
SELECT 
    new_status,
    COUNT(*) as "Kayıt Sayısı"
FROM attorney_status_history
GROUP BY new_status
ORDER BY COUNT(*) DESC;
