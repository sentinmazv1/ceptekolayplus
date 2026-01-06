export const WHATSAPP_TEMPLATES = {
    APPLICATION_RECEIVED: (name: string) =>
        `Sayın *${name}*, paylaştığınız bilgiler için teşekkür ederiz. Başvurunuz değerlendirme aşamasında olup, en kısa sürede size dönüş yapılacaktır. İlginiz için teşekkürler. *CEPTE KOLAY*`,

    APPROVED: (name: string, limit: string) =>
        `Müjde! *${name}*, başvurunuz *${limit || 'belirlenen'} TL limit ile ONAYLANMISTIR!* Urununuzu teslim almak icin sizi en kisa surede magazamiza bekliyoruz. Simdiden iyi gunlerde kullanin. *CEPTE KOLAY*`,

    GUARANTOR_REQUIRED: (name: string) =>
        `Değerli Müşterimiz *${name}*, başvurunuzun olumlu sonuçlanabilmesi için kefil desteğine ihtiyaç duyulmuştur. Detaylı bilgi için *0551 349 6735* numaralı hattımızdan bize ulaşabilir veya mağazamızı ziyaret edebilirsiniz. *CEPTE KOLAY*`,

    UNREACHABLE: (name: string) =>
        `Sayın *${name}*, başvurunuzla ilgili size ulaşmaya çalıştık ancak ulaşamadık. Müsait olduğunuzda *0551 349 6735* numaramızdan veya WhatsApp hattımızdan bize dönüş yapmanızı rica ederiz. *CEPTE KOLAY*`,

    MISSING_DOCS: (name: string) =>
        `Sayın *${name}*, başvurunuzu tamamlayabilmemiz için bazı eksik evraklarınız bulunmaktadır. *0551 349 6735* WhatsApp hattımızdan bilgi alarak işlemlerinizi hızlandırabilirsiniz. *CEPTE KOLAY*`,

    CANCELLED: (name: string) =>
        `Sayın *${name}*, başvurunuzla ilgili işlemler durdurulmuş ve kaydınız iptal edilmiştir. İhtiyaçlarınız için kapımız size her zaman açık. *CEPTE KOLAY*`,

    DELIVERED: (name: string, product: string, imei: string, serial: string) =>
        `Sayın *${name}*, *${product}* urununuz teslim edilmistir. IMEI: ${imei}, Seri No: ${serial}. Iyi gunlerde kullanmanizi dileriz. *CEPTE KOLAY*`,

    LOCATION: () =>
        `Magaza Konumumuz: https://maps.app.goo.gl/VTBYugiDdTCAbnwB6 *CEPTE KOLAY*`,

    IBAN: () =>
        `Odeme yapabileceginiz IBAN bilgimiz: TR58 0001 0008 0498 1915 2750 01 - Alici: Cepte Kolay. *CEPTE KOLAY*`
};
