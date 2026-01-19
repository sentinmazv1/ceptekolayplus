-- Add type column
ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'SMS';

-- Function/Trigger to ensure type is set? No, simplified.

-- Insert WhatsApp Templates
INSERT INTO sms_templates (title, content, tags, type) VALUES
('Karşılama', 'Merhaba *{name}*,\nInstagram üzerinden bıraktığınız bilgi talebi elimize ulaştı.\n\nSize net ve doğru bilgi verebilmemiz için WhatsApp üzerinden devam ediyoruz.\n\nUygunsanız süreci kısaca anlatayım.', ARRAY['karşılama'], 'WHATSAPP'),

('Süreç Anlatımı', 'Kısaca nasıl ilerliyoruz:\n\n• Önce kısa bir sistem kontrolü yapıyoruz\n• Herkes için sonuç farklı çıkıyor\n• Kontrol ortalama 5 dakika sürüyor\n• Tüm süreç 60 dakikayı geçmez\n\nKontrol yapılmadan rakam paylaşılmıyor.', ARRAY['bilgi'], 'WHATSAPP'),

('Kritik Uyarı (TC/e-Devlet)', '⚠️ *Bilgilendirme*\n\nBu kontrol resmi sistem üzerinden yapılır.\nBu nedenle TC kimlik numarası ve e-Devlet şifresi gerekir.\n\n• Bilgiler kaydedilmez\n• Sadece kontrol için kullanılır\n• Sonucu görüp devam etmek zorunda değilsiniz\n\nUygunsa başlatabiliriz.', ARRAY['uyarı', 'tc'], 'WHATSAPP'),

('Onay Alma', 'Devam etmemizi ister misiniz?\nUygun değilse daha sonra da yazabilirsiniz.', ARRAY['onay'], 'WHATSAPP'),

('Kimlik Bilgileri İsteme', 'O halde kontrolü başlatıyorum.\n\nLütfen aşağıya:\n• TC Kimlik Numaranızı\n• e-Devlet şifrenizi\nyazın.\n\n⏱️ Ortalama sonuç süresi: 5 dakika', ARRAY['bilgi_isteme'], 'WHATSAPP'),

('Kontrol Başladı', 'Kontrol başlatıldı 👍\n\nŞu an sistemde işlemde.\nEn geç 5–10 dakika içinde sonucu yazacağım.', ARRAY['durum'], 'WHATSAPP'),

('Olumlu Sonuç', 'Kontrol tamamlandı.\n\n*{name}*, adınıza tanımlanabilecek maksimum limit: *{limit} TL*\n\nDilerseniz:\n• Mağazadan teslim\n• WhatsApp’tan devam\n• Kısa bir arama ile netleştirme\n\nHangisini tercih edersiniz?', ARRAY['sonuç', 'olumlu'], 'WHATSAPP'),

('Arama İzni', 'İsterseniz 2 dakikalık kısa bir arama ile detayları netleştirebiliriz.\nUygun olur mu?', ARRAY['arama'], 'WHATSAPP'),

('Bilgi Vermeyenler', 'Anlıyorum.\n\nBu bilgiler olmadan maalesef net limit paylaşamıyoruz.\nYanlış yönlendirme yapmamak için bu şekilde ilerliyoruz.\n\nDilerseniz daha sonra tekrar yazabilirsiniz.', ARRAY['red'], 'WHATSAPP'),

('Cevap Vermeyen (24s)', 'Merhaba *{name}*,\nInstagram’daki bilgi talebiniz için yazmıştık.\n\nUygun değilseniz sorun değil,\nUygun olduğunuzda buradan devam edebiliriz', ARRAY['takip'], 'WHATSAPP'),

('Ulaşılamayan (Arama Sonrası)', 'Az önce ulaşmaya çalıştık ancak görüşemedik.\n\nUygun olduğunuzda buradan yazabilirsiniz,\nSüreci WhatsApp üzerinden ilerletiyoruz.', ARRAY['ulaşılamadı'], 'WHATSAPP'),

('Olumsuz Sonuç', 'Kontrol tamamlandı.\n\nMaalesef şu an için sistemden olumlu dönüş alamadık.\nİlerleyen dönemlerde tekrar değerlendirebiliriz.\nİlginiz için teşekkürler.', ARRAY['sonuç', 'olumsuz'], 'WHATSAPP'),

('Konum', 'Magaza Konumumuz: https://maps.app.goo.gl/VTBYugiDdTCAbnwB6 *CEPTE KOLAY*', ARRAY['konum'], 'WHATSAPP'),

('IBAN', 'Odeme yapabileceginiz IBAN bilgimiz: TR58 0001 0008 0498 1915 2750 01 - Alici: Cepte Kolay. *CEPTE KOLAY*', ARRAY['ödeme', 'iban'], 'WHATSAPP'),

('Teslim Mesajı', 'Sayın *{name}*, *{product}* urununuz teslim edilmistir. IMEI: {imei}, Seri No: {serial}. Iyi gunlerde kullanmanizi dileriz. *CEPTE KOLAY*', ARRAY['teslim'], 'WHATSAPP');
