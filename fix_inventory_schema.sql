
-- Add 'alis_fiyati' column to 'inventory' table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'alis_fiyati') THEN
        ALTER TABLE inventory ADD COLUMN alis_fiyati NUMERIC;
    END IF;
END $$;
