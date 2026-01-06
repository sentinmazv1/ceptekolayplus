export const WHATSAPP_TEMPLATES = {
    // 1. Karşılama
    WELCOME: (name: string) =>
        `Merhaba *${name}*,\nInstagram üzerinden bıraktığınız bilgi talebi elimize ulaştı.\n\nSize net ve doğru bilgi verebilmemiz için WhatsApp üzerinden devam ediyoruz.\n\nUygunsanız süreci kısaca anlatayım.`,

    // 2. Süreç Anlatımı
    PROCESS_INFO: () =>
        `Kısaca nasıl ilerliyoruz:\n\n• Önce kısa bir sistem kontrolü yapıyoruz\n• Herkes için sonuç farklı çıkıyor\n• Kontrol ortalama 5 dakika sürüyor\n• Tüm süreç 60 dakikayı geçmez\n\nKontrol yapılmadan rakam paylaşılmıyor.`,

    // 3. Kritik Uyarı
    CRITICAL_WARNING: () =>
        `⚠️ *Bilgilendirme*\n\nBu kontrol resmi sistem üzerinden yapılır.\nBu nedenle TC kimlik numarası ve e-Devlet şifresi gerekir.\n\n• Bilgiler kaydedilmez\n• Sadece kontrol için kullanılır\n• Sonucu görüp devam etmek zorunda değilsiniz\n\nUygunsa başlatabiliriz.`,

    // 4. Onay Alma
    CONFIRMATION: () =>
        `Devam etmemizi ister misiniz?\nUygun değilse daha sonra da yazabilirsiniz.`,

    // 5. e-Devlet & TC İsteme
    REQUEST_ID_PASS: () =>
        `O halde kontrolü başlatıyorum.\n\nLütfen aşağıya:\n• TC Kimlik Numaranızı\n• e-Devlet şifrenizi\nyazın.\n\n⏱️ Ortalama sonuç süresi: 5 dakika`,

    // 6. Kontrol Başladı
    CHECK_STARTED: () =>
        `Kontrol başlatıldı 👍\n\nŞu an sistemde işlemde.\nEn geç 5–10 dakika içinde sonucu yazacağım.`,

    // 7. Olumlu Sonuç
    POSITIVE_RESULT: (name: string, limit: string) =>
        `Kontrol tamamlandı.\n\n*${name}*, adınıza tanımlanabilecek maksimum limit: *${limit || '...'} TL*\n\nDilerseniz:\n• Mağazadan teslim\n• WhatsApp’tan devam\n• Kısa bir arama ile netleştirme\n\nHangisini tercih edersiniz?`,

    // 8. Arayabilir miyiz?
    CALL_PERMISSION: () =>
        `İsterseniz 2 dakikalık kısa bir arama ile detayları netleştirebiliriz.\nUygun olur mu?`,

    // 9. e-Devlet Vermek İstemeyenler
    REFUSED_TO_GIVE_INFO: () =>
        `Anlıyorum.\n\nBu bilgiler olmadan maalesef net limit paylaşamıyoruz.\nYanlış yönlendirme yapmamak için bu şekilde ilerliyoruz.\n\nDilerseniz daha sonra tekrar yazabilirsiniz.`,

    // 10. Cevap Gelmeyenler (24 saat)
    NO_RESPONSE_24H: (name: string) =>
        `Merhaba *${name}*,\nInstagram’daki bilgi talebiniz için yazmıştık.\n\nUygun değilseniz sorun değil,\nUygun olduğunuzda buradan devam edebiliriz`,

    // 11. Arama Sonrası Ulaşılamayan
    UNREACHABLE_AFTER_CALL: () =>
        `Az önce ulaşmaya çalıştık ancak görüşemedik.\n\nUygun olduğunuzda buradan yazabilirsiniz,\nSüreci WhatsApp üzerinden ilerletiyoruz.`,

    // --- EK ŞABLONLAR ---

    // 12. Olumsuz Sonuç
    NEGATIVE_RESULT: () =>
        `Kontrol tamamlandı.\n\nMaalesef şu an için sistemden olumlu dönüş alamadık.\nİlerleyen dönemlerde tekrar değerlendirebiliriz.\nİlginiz için teşekkürler.`,

    // 13. Konum
    LOCATION: () =>
        `Magaza Konumumuz: https://maps.app.goo.gl/VTBYugiDdTCAbnwB6 *CEPTE KOLAY*`,

    // 14. IBAN
    IBAN: () =>
        `Odeme yapabileceginiz IBAN bilgimiz: TR58 0001 0008 0498 1915 2750 01 - Alici: Cepte Kolay. *CEPTE KOLAY*`,

    // 15. Teslim Edildi
    DELIVERED: (name: string, product: string, imei: string, serial: string) =>
        `Sayın *${name}*, *${product}* urununuz teslim edilmistir. IMEI: ${imei}, Seri No: ${serial}. Iyi gunlerde kullanmanizi dileriz. *CEPTE KOLAY*`
};
