-- PERSONEL PERFORMANS RAPORU - SQL DOĞRULAMA
-- Test tarihleri: 2026-02-01 ile 2026-02-06 arası

-- Değişkenler (manuel değiştir)
-- startDate: '2026-02-01'
-- endDate: '2026-02-06'

-- 1. ARAMA SAYISI (activity_logs - PULL_LEAD)
SELECT 
    performed_by as "Personel",
    COUNT(*) as "Arama Sayısı"
FROM activity_logs
WHERE action = 'PULL_LEAD'
  AND created_at >= '2026-02-01T00:00:00Z'
  AND created_at <= '2026-02-06T23:59:59Z'
  AND performed_by IS NOT NULL
  AND performed_by NOT ILIKE '%sistem%'
  AND performed_by NOT ILIKE '%admin%'
  AND performed_by NOT ILIKE '%ibrahim%'
GROUP BY performed_by
ORDER BY COUNT(*) DESC;

-- 2. SMS SAYISI
SELECT 
    performed_by as "Personel",
    COUNT(*) as "SMS Sayısı"
FROM activity_logs
WHERE (action = 'SEND_SMS' OR action = 'CLICK_SMS')
  AND created_at >= '2026-02-01T00:00:00Z'
  AND created_at <= '2026-02-06T23:59:59Z'
  AND performed_by IS NOT NULL
  AND performed_by NOT ILIKE '%sistem%'
  AND performed_by NOT ILIKE '%admin%'
  AND performed_by NOT ILIKE '%ibrahim%'
GROUP BY performed_by
ORDER BY COUNT(*) DESC;

-- 3. WHATSAPP SAYISI
SELECT 
    performed_by as "Personel",
    COUNT(*) as "WhatsApp Sayısı"
FROM activity_logs
WHERE (action = 'SEND_WHATSAPP' OR action = 'CLICK_WHATSAPP')
  AND created_at >= '2026-02-01T00:00:00Z'
  AND created_at <= '2026-02-06T23:59:59Z'
  AND performed_by IS NOT NULL
  AND performed_by NOT ILIKE '%sistem%'
  AND performed_by NOT ILIKE '%admin%'
  AND performed_by NOT ILIKE '%ibrahim%'
GROUP BY performed_by
ORDER BY COUNT(*) DESC;

-- 4. BAŞVURU SAYISI
SELECT 
    performed_by as "Personel",
    COUNT(*) as "Başvuru Sayısı"
FROM activity_logs
WHERE (action = 'UPDATE_STATUS' OR action = 'CREATED')
  AND (
    LOWER(new_value) LIKE '%başvuru alındı%' OR
    LOWER(new_value) LIKE '%onaya gönderildi%' OR
    LOWER(new_value) LIKE '%onay bekleniyor%' OR
    LOWER(new_value) LIKE '%eksik evrak bekleniyor%'
  )
  AND created_at >= '2026-02-01T00:00:00Z'
  AND created_at <= '2026-02-06T23:59:59Z'
  AND performed_by IS NOT NULL
  AND performed_by NOT ILIKE '%sistem%'
  AND performed_by NOT ILIKE '%admin%'
  AND performed_by NOT ILIKE '%ibrahim%'
GROUP BY performed_by
ORDER BY COUNT(*) DESC;

-- 5. AVUKAT SORGU (attorney_status_history)
SELECT 
    changed_by as "Personel",
    COUNT(*) as "Avukat Sorgu Sayısı"
FROM attorney_status_history
WHERE created_at >= '2026-02-01T00:00:00Z'
  AND created_at <= '2026-02-06T23:59:59Z'
  AND changed_by IS NOT NULL
  AND changed_by NOT ILIKE '%sistem%'
  AND changed_by NOT ILIKE '%admin%'
  AND changed_by NOT ILIKE '%ibrahim%'
  AND (
    LOWER(new_status) NOT LIKE '%temiz%' AND
    LOWER(new_status) NOT LIKE '%riskli%' AND
    LOWER(new_status) NOT LIKE '%sorunlu%' AND
    LOWER(new_status) NOT LIKE '%icralık%'
  )
GROUP BY changed_by
ORDER BY COUNT(*) DESC;

-- 6. TEMİZ (attorney_status_history)
SELECT 
    changed_by as "Personel",
    COUNT(*) as "Temiz Sayısı"
FROM attorney_status_history
WHERE created_at >= '2026-02-01T00:00:00Z'
  AND created_at <= '2026-02-06T23:59:59Z'
  AND changed_by IS NOT NULL
  AND changed_by NOT ILIKE '%sistem%'
  AND changed_by NOT ILIKE '%admin%'
  AND changed_by NOT ILIKE '%ibrahim%'
  AND LOWER(new_status) LIKE '%temiz%'
GROUP BY changed_by
ORDER BY COUNT(*) DESC;

-- 7. RİSKLİ (attorney_status_history)
SELECT 
    changed_by as "Personel",
    COUNT(*) as "Riskli Sayısı"
FROM attorney_status_history
WHERE created_at >= '2026-02-01T00:00:00Z'
  AND created_at <= '2026-02-06T23:59:59Z'
  AND changed_by IS NOT NULL
  AND changed_by NOT ILIKE '%sistem%'
  AND changed_by NOT ILIKE '%admin%'
  AND changed_by NOT ILIKE '%ibrahim%'
  AND (
    LOWER(new_status) LIKE '%riskli%' OR
    LOWER(new_status) LIKE '%sorunlu%' OR
    LOWER(new_status) LIKE '%icralık%'
  )
GROUP BY changed_by
ORDER BY COUNT(*) DESC;

-- 8. ONAYLANAN (leads - onay_durumu = 'Onaylandı' + onay_tarihi aralıkta)
SELECT 
    COALESCE(sahip, sahip_email, assigned_to) as "Personel",
    COUNT(*) as "Onaylı Adet",
    SUM(
        CASE 
            WHEN kredi_limiti IS NULL THEN 0
            WHEN kredi_limiti::text ~ '^[0-9]+$' THEN kredi_limiti::numeric
            ELSE CAST(REGEXP_REPLACE(kredi_limiti::text, '[^0-9,.-]', '', 'g') AS numeric)
        END
    ) as "Onaylı Limit (₺)"
FROM leads
WHERE onay_durumu = 'Onaylandı'
  AND onay_tarihi >= '2026-02-01T00:00:00Z'
  AND onay_tarihi <= '2026-02-06T23:59:59Z'
  AND COALESCE(sahip, sahip_email, assigned_to) IS NOT NULL
  AND COALESCE(sahip, sahip_email, assigned_to) NOT ILIKE '%sistem%'
  AND COALESCE(sahip, sahip_email, assigned_to) NOT ILIKE '%admin%'
  AND COALESCE(sahip, sahip_email, assigned_to) NOT ILIKE '%ibrahim%'
GROUP BY COALESCE(sahip, sahip_email, assigned_to)
ORDER BY SUM(
    CASE 
        WHEN kredi_limiti IS NULL THEN 0
        WHEN kredi_limiti::text ~ '^[0-9]+$' THEN kredi_limiti::numeric
        ELSE CAST(REGEXP_REPLACE(kredi_limiti::text, '[^0-9,.-]', '', 'g') AS numeric)
    END
) DESC;

-- 9. TESLİM EDİLEN (leads - durum + teslim_tarihi aralıkta)
-- NOT: satilan_urunler array içindeki her item için satis_tarihi kontrol edilmeli
-- Ama SQL'de bu karmaşık, önce basit versiyonu görelim
SELECT 
    COALESCE(sahip, sahip_email, assigned_to) as "Personel",
    COUNT(*) as "Teslim Adet",
    SUM(
        CASE 
            WHEN kredi_limiti IS NULL THEN 0
            WHEN kredi_limiti::text ~ '^[0-9]+$' THEN kredi_limiti::numeric
            ELSE CAST(REGEXP_REPLACE(kredi_limiti::text, '[^0-9,.-]', '', 'g') AS numeric)
        END
    ) as "Ciro (₺)"
FROM leads
WHERE (durum = 'Teslim edildi' OR durum = 'Satış yapıldı/Tamamlandı' OR durum = 'Satış Yapıldı')
  AND teslim_tarihi >= '2026-02-01T00:00:00Z'
  AND teslim_tarihi <= '2026-02-06T23:59:59Z'
  AND COALESCE(sahip, sahip_email, assigned_to) IS NOT NULL
  AND COALESCE(sahip, sahip_email, assigned_to) NOT ILIKE '%sistem%'
  AND COALESCE(sahip, sahip_email, assigned_to) NOT ILIKE '%admin%'
  AND COALESCE(sahip, sahip_email, assigned_to) NOT ILIKE '%ibrahim%'
GROUP BY COALESCE(sahip, sahip_email, assigned_to)
ORDER BY SUM(
    CASE 
        WHEN kredi_limiti IS NULL THEN 0
        WHEN kredi_limiti::text ~ '^[0-9]+$' THEN kredi_limiti::numeric
        ELSE CAST(REGEXP_REPLACE(kredi_limiti::text, '[^0-9,.-]', '', 'g') AS numeric)
    END
) DESC;

-- 10. TÜM VERİLER BİR ARADA (ÖZET)
-- Bu sorgu tüm metrikleri birleştiriyor
SELECT 
    personel,
    COALESCE(arama, 0) as "Arama",
    COALESCE(sms, 0) as "SMS",
    COALESCE(wp, 0) as "WP",
    COALESCE(basvuru, 0) as "Başvuru",
    COALESCE(avukat_sorgu, 0) as "Avukat Sorgu",
    COALESCE(temiz, 0) as "Temiz",
    COALESCE(riskli, 0) as "Riskli",
    COALESCE(onayli_adet, 0) as "Onaylı Adet",
    COALESCE(onayli_limit, 0) as "Onaylı Limit",
    COALESCE(teslim_adet, 0) as "Teslim Adet",
    COALESCE(ciro, 0) as "Ciro"
FROM (
    SELECT DISTINCT performed_by as personel FROM activity_logs
    WHERE created_at >= '2026-02-01T00:00:00Z' AND created_at <= '2026-02-06T23:59:59Z'
    UNION
    SELECT DISTINCT changed_by FROM attorney_status_history
    WHERE created_at >= '2026-02-01T00:00:00Z' AND created_at <= '2026-02-06T23:59:59Z'
    UNION
    SELECT DISTINCT COALESCE(sahip, sahip_email, assigned_to) FROM leads
    WHERE (onay_tarihi >= '2026-02-01T00:00:00Z' AND onay_tarihi <= '2026-02-06T23:59:59Z')
       OR (teslim_tarihi >= '2026-02-01T00:00:00Z' AND teslim_tarihi <= '2026-02-06T23:59:59Z')
) p
LEFT JOIN (
    SELECT performed_by as personel_key, COUNT(*) as arama FROM activity_logs
    WHERE action = 'PULL_LEAD' AND created_at >= '2026-02-01T00:00:00Z' AND created_at <= '2026-02-06T23:59:59Z'
    GROUP BY performed_by
) a ON p.personel = a.personel_key
LEFT JOIN (
    SELECT performed_by as personel_key, COUNT(*) as sms FROM activity_logs
    WHERE (action = 'SEND_SMS' OR action = 'CLICK_SMS') AND created_at >= '2026-02-01T00:00:00Z' AND created_at <= '2026-02-06T23:59:59Z'
    GROUP BY performed_by
) s ON p.personel = s.personel_key
LEFT JOIN (
    SELECT performed_by as personel_key, COUNT(*) as wp FROM activity_logs
    WHERE (action = 'SEND_WHATSAPP' OR action = 'CLICK_WHATSAPP') AND created_at >= '2026-02-01T00:00:00Z' AND created_at <= '2026-02-06T23:59:59Z'
    GROUP BY performed_by
) w ON p.personel = w.personel_key
LEFT JOIN (
    SELECT performed_by as personel_key, COUNT(*) as basvuru FROM activity_logs
    WHERE (action = 'UPDATE_STATUS' OR action = 'CREATED')
      AND (LOWER(new_value) LIKE '%başvuru alındı%' OR LOWER(new_value) LIKE '%onaya gönderildi%' OR LOWER(new_value) LIKE '%onay bekleniyor%' OR LOWER(new_value) LIKE '%eksik evrak bekleniyor%')
      AND created_at >= '2026-02-01T00:00:00Z' AND created_at <= '2026-02-06T23:59:59Z'
    GROUP BY performed_by
) b ON p.personel = b.personel_key
LEFT JOIN (
    SELECT changed_by as personel_key, COUNT(*) as avukat_sorgu FROM attorney_status_history
    WHERE created_at >= '2026-02-01T00:00:00Z' AND created_at <= '2026-02-06T23:59:59Z'
      AND (LOWER(new_status) NOT LIKE '%temiz%' AND LOWER(new_status) NOT LIKE '%riskli%' AND LOWER(new_status) NOT LIKE '%sorunlu%' AND LOWER(new_status) NOT LIKE '%icralık%')
    GROUP BY changed_by
) asq ON p.personel = asq.personel_key
LEFT JOIN (
    SELECT changed_by as personel_key, COUNT(*) as temiz FROM attorney_status_history
    WHERE created_at >= '2026-02-01T00:00:00Z' AND created_at <= '2026-02-06T23:59:59Z'
      AND LOWER(new_status) LIKE '%temiz%'
    GROUP BY changed_by
) t ON p.personel = t.personel_key
LEFT JOIN (
    SELECT changed_by as personel_key, COUNT(*) as riskli FROM attorney_status_history
    WHERE created_at >= '2026-02-01T00:00:00Z' AND created_at <= '2026-02-06T23:59:59Z'
      AND (LOWER(new_status) LIKE '%riskli%' OR LOWER(new_status) LIKE '%sorunlu%' OR LOWER(new_status) LIKE '%icralık%')
    GROUP BY changed_by
) r ON p.personel = r.personel_key
LEFT JOIN (
    SELECT COALESCE(sahip, sahip_email, assigned_to) as personel_key, COUNT(*) as onayli_adet,
           SUM(CASE WHEN kredi_limiti IS NULL THEN 0 WHEN kredi_limiti::text ~ '^[0-9]+$' THEN kredi_limiti::numeric ELSE CAST(REGEXP_REPLACE(kredi_limiti::text, '[^0-9,.-]', '', 'g') AS numeric) END) as onayli_limit
    FROM leads
    WHERE onay_durumu = 'Onaylandı' AND onay_tarihi >= '2026-02-01T00:00:00Z' AND onay_tarihi <= '2026-02-06T23:59:59Z'
    GROUP BY COALESCE(sahip, sahip_email, assigned_to)
) o ON p.personel = o.personel_key
LEFT JOIN (
    SELECT COALESCE(sahip, sahip_email, assigned_to) as personel_key, COUNT(*) as teslim_adet,
           SUM(CASE WHEN kredi_limiti IS NULL THEN 0 WHEN kredi_limiti::text ~ '^[0-9]+$' THEN kredi_limiti::numeric ELSE CAST(REGEXP_REPLACE(kredi_limiti::text, '[^0-9,.-]', '', 'g') AS numeric) END) as ciro
    FROM leads
    WHERE (durum = 'Teslim edildi' OR durum = 'Satış yapıldı/Tamamlandı' OR durum = 'Satış Yapıldı')
      AND teslim_tarihi >= '2026-02-01T00:00:00Z' AND teslim_tarihi <= '2026-02-06T23:59:59Z'
    GROUP BY COALESCE(sahip, sahip_email, assigned_to)
) d ON p.personel = d.personel_key
WHERE p.personel IS NOT NULL
  AND p.personel NOT ILIKE '%sistem%'
  AND p.personel NOT ILIKE '%admin%'
  AND p.personel NOT ILIKE '%ibrahim%'
ORDER BY COALESCE(ciro, 0) DESC;
