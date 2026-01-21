
-- SALARY HISTORY SCHEMA UPDATE
-- Adds 6 monthly salary columns and an average column to the leads table

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS maas_1 TEXT,
ADD COLUMN IF NOT EXISTS maas_2 TEXT,
ADD COLUMN IF NOT EXISTS maas_3 TEXT,
ADD COLUMN IF NOT EXISTS maas_4 TEXT,
ADD COLUMN IF NOT EXISTS maas_5 TEXT,
ADD COLUMN IF NOT EXISTS maas_6 TEXT,
ADD COLUMN IF NOT EXISTS maas_ortalama TEXT;

COMMENT ON COLUMN leads.maas_1 IS 'Salary for the evaluation month 1';
COMMENT ON COLUMN leads.maas_2 IS 'Salary for the evaluation month 2';
COMMENT ON COLUMN leads.maas_3 IS 'Salary for the evaluation month 3';
COMMENT ON COLUMN leads.maas_4 IS 'Salary for the evaluation month 4';
COMMENT ON COLUMN leads.maas_5 IS 'Salary for the evaluation month 5';
COMMENT ON COLUMN leads.maas_6 IS 'Salary for the evaluation month 6';
COMMENT ON COLUMN leads.maas_ortalama IS 'Calculated 6-month average salary';
