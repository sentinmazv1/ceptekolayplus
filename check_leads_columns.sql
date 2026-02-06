-- LEADS TABLOSU SÜTUN KONTROLÜ

-- Tüm sütunları göster
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'leads'
ORDER BY ordinal_position;
