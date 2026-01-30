SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'inventory';

SELECT id, marka, model, imei, created_at 
FROM inventory 
ORDER BY created_at DESC 
LIMIT 5;
