-- Check if sahip_email exists and has values
SELECT 
    COUNT(*) as total_leads,
    COUNT(sahip_email) as with_sahip_email,
    COUNT(assigned_to) as with_assigned_to,
    COUNT(CASE WHEN sahip_email IS NOT NULL OR assigned_to IS NOT NULL THEN 1 END) as with_any_owner
FROM leads
WHERE id IN (
    SELECT DISTINCT lead_id 
    FROM attorney_status_history 
    WHERE created_at >= '2026-02-01T00:00:00Z' 
      AND created_at <= '2026-02-06T23:59:59Z'
);

-- Sample leads with attorney history
SELECT 
    l.id,
    l.sahip_email,
    l.assigned_to,
    l.ad_soyad,
    ah.new_status,
    ah.created_at
FROM attorney_status_history ah
JOIN leads l ON ah.lead_id = l.id
WHERE ah.created_at >= '2026-02-01T00:00:00Z' 
  AND ah.created_at <= '2026-02-06T23:59:59Z'
LIMIT 10;
