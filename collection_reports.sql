-- Collection Report Functions

-- 1. City Breakdown (Unreachable vs Promises)
-- Returns: city, total_assigned, unreachable_count, promise_count, promise_kept_count
CREATE OR REPLACE FUNCTION get_collection_city_stats_v1(
  start_date text,
  end_date text
)
RETURNS TABLE (
  city text,
  total_files bigint,
  unreachable_count bigint,
  promise_count bigint,
  promise_kept_count bigint,
  phones_off_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.sehir as city,
    COUNT(*) as total_files,
    COUNT(*) FILTER (WHERE l.durum IN ('Ulaşılamadı', 'Cevap Yok')) as unreachable_count,
    COUNT(*) FILTER (WHERE l.tahsilat_durumu = 'Ödeme Sözü') as promise_count,
    COUNT(*) FILTER (WHERE l.durum = 'Teslim edildi' AND l.tahsilat_durumu = 'Ödeme Yapıldı') as promise_kept_count,
    COUNT(*) FILTER (WHERE l.durum = 'Meşgul/Hattı kapalı') as phones_off_count
  FROM leads l
  WHERE l.sinif = 'Gecikme'
  -- Optional date filter (if we want to see activity in this range, OR files assigned in this range)
  -- For now, let's assume "Snapshot" of current state of Gecikme files
  -- But usually reports are time-bound.
  -- Let's filter by updated_at for activity? 
  -- Or just show ALL current Gecikme Stats.
  -- Updated Plan: Show ALL stats for current files.
  GROUP BY l.sehir
  ORDER BY total_files DESC;
END;
$$;

-- 2. Daily Call Performance (For Collection Team)
-- Returns: date, called_count, unreachable_count, promise_count
CREATE OR REPLACE FUNCTION get_collection_daily_stats_v1(
  start_date text,
  end_date text
)
RETURNS TABLE (
  log_date text,
  total_actions bigint,
  reached bigint,
  unreachable bigint,
  promises bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_char(al.created_at, 'YYYY-MM-DD') as log_date,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE al.new_value NOT IN ('Ulaşılamadı', 'Cevap Yok', 'Meşgul/Hattı kapalı')) as reached,
    COUNT(*) FILTER (WHERE al.new_value IN ('Ulaşılamadı', 'Cevap Yok')) as unreachable,
    COUNT(*) FILTER (WHERE al.new_value = 'Ödeme Sözü' OR al.note ILIKE '%ödeme sözü%') as promises
  FROM activity_logs al
  JOIN leads l ON l.id = al.lead_id
  WHERE l.sinif = 'Gecikme'
    AND al.created_at >= start_date::timestamp
    AND al.created_at <= end_date::timestamp
  GROUP BY log_date
  ORDER BY log_date DESC;
END;
$$;
