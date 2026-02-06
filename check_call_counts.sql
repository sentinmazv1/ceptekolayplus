-- Arama Sayıları Kontrolü - Tarih Aralığına Göre

-- 1. Hangi action'lar arama olarak sayılıyor?
SELECT 
    user_email as "Personel",
    COUNT(*) FILTER (WHERE action = 'PULL_LEAD') as "Müşteri Çek (PULL_LEAD)",
    COUNT(*) FILTER (WHERE action = 'CALL') as "Arama (CALL)",
    COUNT(*) FILTER (WHERE action LIKE '%CALL%') as "Tüm Call Action'ları",
    COUNT(*) as "Toplam Action"
FROM activity_logs
WHERE created_at >= '2026-02-01T00:00:00Z' 
  AND created_at <= '2026-02-06T23:59:59Z'
  AND user_email IS NOT NULL
  AND user_email NOT ILIKE '%sistem%'
  AND user_email NOT ILIKE '%admin%'
  AND user_email NOT ILIKE '%ibrahim%'
GROUP BY user_email
ORDER BY "Müşteri Çek (PULL_LEAD)" DESC;

-- 2. Detaylı action listesi - hangi action'lar var?
SELECT DISTINCT action, COUNT(*) as count
FROM activity_logs
WHERE created_at >= '2026-02-01T00:00:00Z' 
  AND created_at <= '2026-02-06T23:59:59Z'
GROUP BY action
ORDER BY count DESC;
