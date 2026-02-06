-- Tarih aralığında attorney history detayları

-- gzdgunusenturk için
SELECT 
    created_at,
    changed_by,
    new_status,
    lead_id
FROM attorney_status_history
WHERE changed_by = 'gzdgunusenturk@gmail.com'
  AND created_at >= '2026-02-01T00:00:00Z' 
  AND created_at <= '2026-02-06T23:59:59Z'
ORDER BY created_at DESC;

-- funda için
SELECT 
    created_at,
    changed_by,
    new_status,
    lead_id
FROM attorney_status_history
WHERE changed_by = 'funda@ceptekolay.com'
  AND created_at >= '2026-02-01T00:00:00Z' 
  AND created_at <= '2026-02-06T23:59:59Z'
ORDER BY created_at DESC;
