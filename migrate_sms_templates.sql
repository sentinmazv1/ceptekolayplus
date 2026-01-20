-- SMS Templates Migration - Fixed
-- First, ensure the table has all necessary columns

-- Check and add missing columns if needed
DO $$ 
BEGIN
    -- Add type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sms_templates' AND column_name='type') THEN
        ALTER TABLE sms_templates ADD COLUMN type VARCHAR(20) DEFAULT 'SMS';
    END IF;
    
    -- Add tags column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sms_templates' AND column_name='tags') THEN
        ALTER TABLE sms_templates ADD COLUMN tags TEXT;
    END IF;
END $$;

-- Now insert the templates
INSERT INTO sms_templates (title, content, type, tags) VALUES
('Ulaşılamadı Bildirimi', 
 'Sayın {name}, başvurunuzla ilgili size ulaşmaya çalıştık ancak ulaşamadık. Müsait olduğunuzda 0551 349 6735 numaramızdan veya WhatsApp hattımızdan bize dönüş yapmanızı rica ederiz. CEPTE KOLAY',
 'SMS',
 'unreachable,quick_message,status_change'),

('Kefil Gerekli',
 'Değerli Müşterimiz {name}, başvurunuzun olumlu sonuçlanabilmesi için kefil desteğine ihtiyaç duyulmuştur. Detaylı bilgi için 0551 349 6735 numaralı hattımızdan bize ulaşabilir veya mağazamızı ziyaret edebilirsiniz. CEPTE KOLAY',
 'SMS',
 'guarantor,quick_message,status_change'),

('Başvuru Onaylandı',
 'Müjde! {name}, başvurunuz {limit} TL limit ile ONAYLANMIŞTIR! Ürününüzü teslim almak için sizi en kısa sürede mağazamıza bekliyoruz. Şimdiden iyi günlerde kullanın. CEPTE KOLAY',
 'SMS',
 'approved,quick_message,status_change'),

('Eksik Evrak',
 'Sayın {name}, başvurunuzu tamamlayabilmemiz için bazı eksik evraklarınız bulunmaktadır. 0551 349 6735 WhatsApp hattımızdan bilgi alarak işlemlerinizi hızlandırabilirsiniz. CEPTE KOLAY',
 'SMS',
 'missing_docs,quick_message,status_change'),

('Başvuru İptal',
 'Sayın {name}, başvurunuzla ilgili işlemler durdurulmuş ve kaydınız iptal edilmiştir. İhtiyaçlarınız için kapımız size her zaman açık. CEPTE KOLAY',
 'SMS',
 'cancelled,quick_message,status_change'),

('Ürün Teslim Edildi',
 'Sayın {name}, {product} ürününüz teslim edilmiştir. IMEI: {imei}, Seri No: {serial}. İyi günlerde kullanmanızı dileriz. CEPTE KOLAY',
 'SMS',
 'delivered,quick_message'),

('Mağaza Konumu',
 'Mağaza Konumumuz: https://maps.app.goo.gl/VTBYugiDdTCAbnwB6 CEPTE KOLAY',
 'SMS',
 'location,info'),

('IBAN Bilgisi',
 'Ödeme yapabileceğiniz IBAN bilgimiz: TR58 0001 0008 0498 1915 2750 01 - Alıcı: Cepte Kolay. CEPTE KOLAY',
 'SMS',
 'iban,payment,info'),

('Başvuru Alındı',
 'Sayın {name}, paylaştığınız bilgiler için teşekkür ederiz. Başvurunuz değerlendirme aşamasında olup, en kısa sürede size dönüş yapılacaktır. İlginiz için teşekkürler. CEPTE KOLAY',
 'SMS',
 'application_received,quick_message')
ON CONFLICT DO NOTHING;

-- Verify
SELECT COUNT(*) as total_templates FROM sms_templates;
SELECT id, title, type, substring(tags, 1, 30) as tags_preview FROM sms_templates ORDER BY created_at DESC;
