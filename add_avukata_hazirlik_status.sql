-- Add "Avukata Hazırlık Aşaması" collection status
-- Run this in Supabase SQL Editor

INSERT INTO collection_statuses (label, color, sort_order)
SELECT 'Avukata Hazırlık Aşaması', 'orange', 4 
WHERE NOT EXISTS (
    SELECT 1 FROM collection_statuses 
    WHERE label = 'Avukata Hazırlık Aşaması'
);

-- Verify the insertion
SELECT * FROM collection_statuses ORDER BY sort_order;
