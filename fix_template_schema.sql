-- Fix SMS Templates Schema
-- Add missing 'type' and 'tags' columns safely

DO $$ 
BEGIN
    -- 1. Add 'type' column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sms_templates' AND column_name='type') THEN
        ALTER TABLE sms_templates ADD COLUMN type VARCHAR(20) DEFAULT 'SMS';
        -- Update existing rows to have type='SMS'
        UPDATE sms_templates SET type = 'SMS' WHERE type IS NULL;
    END IF;

    -- 2. Add 'tags' column if missing (as Array)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sms_templates' AND column_name='tags') THEN
        ALTER TABLE sms_templates ADD COLUMN tags TEXT[];
    END IF;

    -- 3. Update tags for known templates (so they work with auto-sms logic later)
    UPDATE sms_templates SET tags = '{unreachable,quick_message,status_change}' WHERE title = 'Ulaşılamadı Bildirimi';
    UPDATE sms_templates SET tags = '{guarantor,quick_message,status_change}' WHERE title = 'Kefil Gerekli';
    UPDATE sms_templates SET tags = '{approved,quick_message,status_change}' WHERE title = 'Başvuru Onaylandı';
    UPDATE sms_templates SET tags = '{missing_docs,quick_message,status_change}' WHERE title = 'Eksik Evrak';
    UPDATE sms_templates SET tags = '{cancelled,quick_message,status_change}' WHERE title = 'Başvuru İptal';
    UPDATE sms_templates SET tags = '{delivered,quick_message}' WHERE title = 'Ürün Teslim Edildi';
    UPDATE sms_templates SET tags = '{location,info}' WHERE title = 'Mağaza Konumu';
    UPDATE sms_templates SET tags = '{iban,payment,info}' WHERE title = 'IBAN Bilgisi';
    UPDATE sms_templates SET tags = '{application_received,quick_message}' WHERE title = 'Başvuru Alındı';

END $$;

-- Verify
SELECT * FROM sms_templates LIMIT 5;
