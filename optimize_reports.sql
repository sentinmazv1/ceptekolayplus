
-- Performance Optimization: Move aggregation to DB
-- Function 1: Get User Performance Stats
CREATE OR REPLACE FUNCTION get_performance_report_v1(start_date timestamptz, end_date timestamptz)
RETURNS TABLE (
    user_email text,
    pulled_count bigint,
    call_count bigint,
    sms_count bigint,
    whatsapp_count bigint,
    sales_count bigint, 
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
        0::numeric as sales_volume
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

-- Function 3: Dashboard Cards / Action Center (Complex Logic)
-- Replaces getLeadStats 10x Queries
CREATE OR REPLACE FUNCTION get_dashboard_cards_stats(
    p_user_email text, 
    p_role text, 
    today_str text,
    two_hours_ago timestamptz, 
    filter_role boolean DEFAULT false
)
RETURNS TABLE (
    available bigint,
    waiting_new bigint,
    waiting_scheduled bigint,
    total_scheduled bigint,
    waiting_retry bigint,
    pending_approval bigint,
    waiting_guarantor bigint,
    delivered bigint,
    approved bigint,
    today_called bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_sales_rep boolean;
BEGIN
    is_sales_rep := (p_role = 'SALES_REP');

    RETURN QUERY
    SELECT
        -- AVAILABLE (New + Sched[Ripe] + Retry[Ripe])
        (
            -- Wait New
            (SELECT COUNT(*) FROM leads WHERE sahip_email IS NULL AND (durum = 'Yeni' OR durum IS NULL OR durum = '')) +
            -- Wait Sched
            (SELECT COUNT(*) FROM leads WHERE sahip_email IS NULL AND durum = 'Daha sonra aranmak istiyor' AND sonraki_arama_zamani <= NOW()) +
            -- Wait Retry
            (SELECT COUNT(*) FROM leads WHERE sahip_email IS NULL AND durum IN ('Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok') AND (son_arama_zamani < two_hours_ago OR son_arama_zamani IS NULL))
        ) as available,
        
        -- Waiting New
        (SELECT COUNT(*) FROM leads WHERE sahip_email IS NULL AND (durum = 'Yeni' OR durum IS NULL OR durum = '')),

        -- Waiting Sched
        (SELECT COUNT(*) FROM leads WHERE sahip_email IS NULL AND durum = 'Daha sonra aranmak istiyor' AND sonraki_arama_zamani <= NOW()),

        -- Total Scheduled (User Specific or All?) - Original was User Specific
        (SELECT COUNT(*) FROM leads WHERE durum = 'Daha sonra aranmak istiyor' AND (CASE WHEN is_sales_rep THEN sahip_email = p_user_email ELSE true END)),

        -- Waiting Retry
        (SELECT COUNT(*) FROM leads WHERE sahip_email IS NULL AND durum IN ('Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok') AND (son_arama_zamani < two_hours_ago OR son_arama_zamani IS NULL)),

        -- Pending Approval
        (SELECT COUNT(*) FROM leads WHERE durum = 'Başvuru alındı' AND (CASE WHEN is_sales_rep THEN sahip_email = p_user_email ELSE true END)),

        -- Guarantor
        (SELECT COUNT(*) FROM leads WHERE durum = 'Kefil bekleniyor' AND (CASE WHEN is_sales_rep THEN sahip_email = p_user_email ELSE true END)),
        
        -- My Delivered (Total)
        (SELECT COUNT(*) FROM leads WHERE (durum = 'Teslim edildi' OR durum = 'Satış yapıldı/Tamamlandı') AND (CASE WHEN is_sales_rep THEN sahip_email = p_user_email ELSE true END)),

        -- My Approved (Total)
        (SELECT COUNT(*) FROM leads WHERE durum = 'Onaylandı' AND (CASE WHEN is_sales_rep THEN sahip_email = p_user_email ELSE true END)),

        -- Today Called
        (SELECT COUNT(*) FROM leads WHERE son_arama_zamani::text LIKE (today_str || '%') AND (CASE WHEN is_sales_rep THEN sahip_email = p_user_email ELSE true END));
END;
$$;
