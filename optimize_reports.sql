
-- Performance Optimization: Move aggregation to DB
-- Function 1: Get User Performance Stats
-- Counts Logs and Sales efficiently

CREATE OR REPLACE FUNCTION get_performance_report_v1(start_date timestamptz, end_date timestamptz)
RETURNS TABLE (
    user_email text,
    pulled_count bigint,
    call_count bigint,
    sms_count bigint,
    whatsapp_count bigint,
    sales_count bigint, -- Items sold
    sales_volume numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH log_range AS (
        SELECT user_email, action, new_value
        FROM activity_logs
        WHERE timestamp >= start_date AND timestamp <= end_date
    ),
    user_logs AS (
        SELECT 
            user_email,
            COUNT(*) FILTER (WHERE action = 'PULL_LEAD') as pulled,
            COUNT(*) FILTER (WHERE action IN ('PULL_LEAD', 'CLICK_CALL') OR (action = 'UPDATE_STATUS' AND new_value != 'Aranacak')) as calls,
            COUNT(*) FILTER (WHERE action IN ('SEND_SMS', 'CLICK_SMS')) as sms,
            COUNT(*) FILTER (WHERE action IN ('SEND_WHATSAPP', 'CLICK_WHATSAPP')) as whatsapp
        FROM log_range
        GROUP BY user_email
    ),
    sales_data AS (
        SELECT 
            sahip_email,
            count(*) as lead_count
            -- Note: Item count is harder in SQL if stored as JSON string. 
            -- For V1 performance, we count 1 lead = 1 sale if type is 'text' and we can't parse easily.
            -- If jsonb, we can sum array length.
            -- Let's assume 1 Sale per delivered lead for high-speed reporting, OR try to cast.
        FROM leads 
        WHERE (durum = 'Teslim edildi' OR durum = 'Satış yapıldı/Tamamlandı')
          AND teslim_tarihi >= start_date AND teslim_tarihi <= end_date
        GROUP BY sahip_email
    )
    SELECT 
        COALESCE(l.user_email, s.sahip_email) as user_email,
        COALESCE(l.pulled, 0),
        COALESCE(l.calls, 0),
        COALESCE(l.sms, 0),
        COALESCE(l.whatsapp, 0),
        COALESCE(s.lead_count, 0) as sales_count,
        0::numeric as sales_volume -- Placeholder for safely optimizing volume later
    FROM user_logs l
    FULL OUTER JOIN sales_data s ON l.user_email = s.sahip_email;
END;
$$;

-- Function 2: Dashboard General Stats (Funnel)
CREATE OR REPLACE FUNCTION get_dashboard_stats_v1(start_date timestamptz, end_date timestamptz)
RETURNS TABLE (
    metric text,
    value bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 'unique_called'::text, COUNT(*)::bigint 
    FROM leads WHERE son_arama_zamani >= start_date AND son_arama_zamani <= end_date
    UNION ALL
    SELECT 'applications', COUNT(*) 
    FROM leads 
    WHERE created_at >= start_date AND created_at <= end_date 
      AND (durum IN ('Başvuru alındı', 'Kefil bekleniyor', 'Onaylandı', 'Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Kefil İstendi', 'Reddedildi') OR onay_durumu = 'Onaylandı')
    UNION ALL
    SELECT 'approved', COUNT(*)
    FROM leads
    WHERE onay_durumu = 'Onaylandı' AND (onay_tarihi >= start_date AND onay_tarihi <= end_date)
    UNION ALL
    SELECT 'delivered', COUNT(*)
    FROM leads
    WHERE (durum = 'Teslim edildi' OR durum = 'Satış yapıldı/Tamamlandı') AND (teslim_tarihi >= start_date AND teslim_tarihi <= end_date);
END;
$$;
