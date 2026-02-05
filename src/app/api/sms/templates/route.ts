import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const templates = [
        {
            id: 'odeme_hatirlatma',
            name: 'Ödeme Hatırlatma',
            message: 'Sayın {ad_soyad}, ödeme tarihiniz yaklaşmaktadır. Lütfen en kısa sürede ödemenizi gerçekleştiriniz. Bilgi: 0850 XXX XX XX'
        },
        {
            id: 'odeme_gecikme',
            name: 'Ödeme Gecikme Uyarısı',
            message: 'Sayın {ad_soyad}, ödemeniz gecikmiştir. Lütfen acilen iletişime geçiniz. Tel: 0850 XXX XX XX'
        },
        {
            id: 'odeme_tesekkur',
            name: 'Ödeme Teşekkür',
            message: 'Sayın {ad_soyad}, ödemeniz alınmıştır. Teşekkür ederiz.'
        },
        {
            id: 'iletisim_talebi',
            name: 'İletişim Talebi',
            message: 'Sayın {ad_soyad}, sizinle görüşmek istiyoruz. Lütfen en kısa sürede bizi arayınız. Tel: 0850 XXX XX XX'
        },
        {
            id: 'odeme_plani',
            name: 'Ödeme Planı Teklifi',
            message: 'Sayın {ad_soyad}, ödeme planı oluşturmak için sizinle görüşmek istiyoruz. Lütfen bizi arayınız.'
        }
    ];

    return NextResponse.json({ success: true, templates });
}
