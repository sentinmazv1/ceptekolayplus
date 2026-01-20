'use client';

import React from 'react';
import { Customer } from '@/lib/types';

interface ContractDocumentProps {
    customer: Customer;
}

export function ContractDocument({ customer }: ContractDocumentProps) {
    const today = new Date().toLocaleDateString('tr-TR');

    // Helper to get safe string
    const val = (v: any, fallback = '...........................................') => v || fallback;
    const emptyLine = '...........................................';

    // Parse Sold Products
    let products: any[] = [];
    try {
        if (customer.satilan_urunler) {
            const parsed = typeof customer.satilan_urunler === 'string' ? JSON.parse(customer.satilan_urunler) : customer.satilan_urunler;
            if (Array.isArray(parsed)) {
                products = parsed.map(item => ({
                    name: `${item.marka || ''} ${item.model || ''} ${item.imei ? `(IMEI: ${item.imei})` : ''}`,
                    price: item.fiyat || 0
                }));
            }
        }
        // Fallback or Addition? If strictly sold_products is empty but requested exists
        if (products.length === 0 && customer.talep_edilen_urun) {
            products.push({
                name: customer.talep_edilen_urun,
                price: customer.talep_edilen_tutar || 0
            });
        }
    } catch (e) {
        console.error('Product parse error:', e);
        // Fallback text if error
        if (customer.talep_edilen_urun) {
            products.push({ name: customer.talep_edilen_urun, price: 0 });
        }
    }

    // Ensure at least one empty row if absolutely nothing
    if (products.length === 0) products.push({ name: '...................................................', price: 0 });

    // Price Logic: Use Credit Limit as the main "Amount" per user request
    const limit = parseFloat(customer.kredi_limiti || '0');
    const priceStr = limit > 0
        ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(limit)
        : '...................... TL';

    return (
        <div className="bg-white text-black p-8 max-w-[210mm] mx-auto text-[10px] leading-tight font-serif" style={{ minHeight: '297mm' }}>

            {/* --- HEADER --- */}
            <div className="flex justify-between items-start mb-4 border-b pb-2">
                <div className="w-1/2">
                    <h1 className="text-3xl font-extrabold text-orange-500 tracking-tighter mb-1">ceptekolay</h1>
                    <p className="font-bold text-xs text-gray-700">Elektronik Ticaret Limited Şirketi</p>
                </div>
                <div className="w-1/2 text-right text-[9px] text-gray-600 space-y-0.5">
                    <p>İnönü Caddesi No.709/K Poligon Karabağlar İZMİR</p>
                    <p>Tel: 0 232 323 30 03</p>
                    <p>Konak Vergi Dairesi No. 206 162 5605</p>
                    <p>Mersis No. 0206162560500001</p>
                    <p>Tic. Sic. No. 268561</p>
                </div>
            </div>

            <div className="flex justify-between text-xs font-bold mb-4">
                <div></div>
                <div className="text-right">
                    <p>Tarih: {today}</p>
                    <p>Müşteri No: {val(customer.winner_musteri_no)}</p>
                    <p>Fatura No: .................................</p>
                </div>
            </div>

            <h2 className="text-center text-lg font-bold border-b-2 border-black mb-1">SATIŞ MUKAVELESİ</h2>

            <h3 className="text-center text-sm font-bold bg-gray-200 py-1 mb-2 border border-black">ALICI BORÇLU VE MÜŞTEREK BORÇLULAR</h3>

            {/* --- BORROWER INFO TABLE --- */}
            <table className="w-full border-collapse border border-black mb-4 text-[10px]">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-1 w-1/2 text-left pl-2">BORÇLU BİLGİLERİ (ALICI)</th>
                        <th className="border border-black p-1 w-1/2 text-left pl-2">MÜŞTEREK BORÇLU BİLGİLERİ (KEFİL)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border border-black p-2 align-top h-40">
                            <div className="grid grid-cols-[80px_1fr] gap-1">
                                <span className="font-bold">ADI SOYADI:</span> <span>{val(customer.ad_soyad)}</span>
                                <span className="font-bold">TC KİMLİK NO:</span> <span>{val(customer.tc_kimlik)}</span>
                                <span className="font-bold">EV ADRESİ:</span> <span>{val(customer.ev_adresi)} <br />{emptyLine}</span>
                                <span className="font-bold">MÜLKİYET:</span> <span>{val(customer.mulkiyet_durumu)}</span>
                                <span className="font-bold">TELEFON NO:</span> <span>{val(customer.telefon)}</span>
                                <span className="font-bold">İŞ ADRESİ:</span> <span>{val(customer.is_adresi, emptyLine)} <br />{emptyLine}</span>
                                <span className="font-bold">İŞ YERİ ÜNVANI:</span> <span>{val(customer.is_yeri_unvani || customer.meslek_is, emptyLine)}</span>
                            </div>
                        </td>
                        <td className="border border-black p-2 align-top h-40">
                            <div className="grid grid-cols-[80px_1fr] gap-1">
                                <span className="font-bold">ADI SOYADI:</span> <span>{val(customer.kefil_ad_soyad)}</span>
                                <span className="font-bold">TC KİMLİK NO:</span> <span>{val(customer.kefil_tc_kimlik)}</span>
                                <span className="font-bold">ADRESİ:</span> <span>{val(customer.kefil_ikametgah_varmi, emptyLine)} <br />{emptyLine}</span>
                                <span className="font-bold">MÜLKİYET:</span> <span>{val(customer.kefil_mulkiyet_durumu)}</span>
                                <span className="font-bold">TELEFON NO:</span> <span>{val(customer.kefil_telefon)}</span>
                                <span className="font-bold">İŞ ADRESİ:</span> <span>{val(customer.kefil_meslek_is, emptyLine)} <br />{emptyLine}</span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="text-[9px] text-justify mb-2 leading-tight">
                ***YUKARIDA BELİRTİLEN BORÇLU VE KEFİLLERE İLİŞKİN BİLGİLER KENDİLERİ TARAFINDAN VERİLMİŞ OLUP BİLGİLERİN DOĞRULUĞU YİNE KENDİLERİ TARAFINDAN KABUL VE BEYAN OLUNUR. SÖZLEŞME EKİNDE BORÇLULARIN İMZALI KİMLİK BELGELERİ SURETİ ALINMIŞTIR.
            </div>

            {/* --- LEGAL TEXT (Compact) --- */}
            <ol className="list-decimal list-outside ml-4 space-y-0.5 text-[9px] mb-4 text-justify">
                <li>İki nüsha olarak tanzim edilen ve taraflarca imzalanan iş bu taksitli satış sözleşmesinin bir nüshası satıcıya birer nüshası da alıcı borçlu ve müteselsil borçlulara verilmiştir.</li>
                <li>Malın vergiler dahil peşin fiyatı <strong>{priceStr}</strong>'dir. Malın peşin satış fiyatına göre alıcı borçlu tarafından ödenmesi gereken peşinat tutarı ......................TL.'dir. Peşinat tutarının alıcı borçlu tarafından en geç sözleşme konusu malların teslimi anında ödenmesi, işbu sözleşme kurulurken satıcı tarafından talep olunmuştur. Alıcı borçlu peşinatı ödemede temerrüde düşerse satıcı, sadece peşinatı isteyebilir veya sözleşmeden dönebilir.</li>
                <li>Satılan malın faizlerle birlikte toplam satış miktarı <strong>{priceStr}</strong> dir.</li>
                <li>Vadelere göre faiz miktarı toplam ......................TL. olup faiz oranı yıllık %...., aylık %......dir.</li>
                <li>İş bu vadeli satış .../.../..........tarihinde başlamak ve .../../..........tarihinde bitmek üzere yukarıda yazılı tarih ve miktarlardaki taksitlerle ödenecektir.</li>
                <li>Alıcı borçlu, kalan borcun en az onda birini oluşturan ve birbirini izleyen en az iki taksidi veya kalan borcun en az dörtte birini oluşturan bir taksiti ödemede temerrüde düşmesi halinde satıcı, alıcıya en az otuz gün süre vererek yazılı olarak muacceliyet uyarısında bulunduktan sonra muaccel olmuş taksitlerin veya geri kalan satış bedelinin tamamının bir defada ödenmesini isteyebilir ya da sözleşmeden dönebilir.</li>
                <li>Alıcı borçlu ve müteselsil borçlular, muacceliyet kesbeden bakiye borcun tamamı için ödenmeyen ilk taksit tarihinden itibaren yıllık %...... oranında gecikme faizi ödemeyi kabul ve taahhüt eder. Satıcının sözleşmeden dönme hakkını kullanması halinde, alıcı borçlu aldığını iade etmekle yükümlü olduğu gibi, ayrıca hakkaniyete uygun bir kullanım bedelini ve bu nedenle satıcının uğradığı zararları tazmin ile mükelleftir. Bu yükümlülüklerin edasından müteselsil borçlular da aynı alıcı borçlu gibi sorumludurlar.</li>
                <li>Satıcıyı bu madde kapsamındaki haklarını kullanmak durumunda bırakan alıcı borçlu ve müteselsil borçlular, bu madde ile belirlenen sorumluluklarına ilave olarak TBK 164 hükmü uyarınca satıcının avukatına ödeyeceği vekalet ücret alacağı ile diğer zararları için alacağının %.... oranında cezai şart tutarını satıcıya ödemekle yükümlüdürler.</li>
                <li>Yasal muacceliyet şartı gerçekleşmemiş olsa bile alıcı borçlu ve müteselsil borçlular, vadesinde ödenmeyen taksitler için ayrıca hiçbir ihtara gerek kalmaksızın, taksit tutarından başka satıcıya yıllık %..... oranında gecikme faizi ödeyecektir.</li>
                <li>Satılan mallar aşağıda cins ve nitelikleri yazılı mallardır.</li>
                <li>İş bu sözleşme .../.../........ tarihinde, İzmir'de düzenlenmiş olup alıcı borçlu ve müteselsil borçluların borcunu ifa yeri İzmir'dir.</li>
                <li>Müteselsil borçlular, alıcı borçlunun işbu sözleşme hükümleri uyarınca borçlarının tamamen edasını, borcun tamamından sorumlu olmayı kabul ettiklerini, satıcıya taahhüt ve beyan ederler.</li>
                <li>Satılan mal alıcıya teslim edildikten sonra onun üzerinde üçüncü şahıslar tarafından herhangi bir hak iddia edilirse alıcı durumu derhal satıcıya ihbar etmekle mükelleftir.</li>
                <li>Satılan ürünün ambalajında, etiketinde, tanıtma ve kullanma kılavuzunda ya da reklam ve ilanlarında yer almayan veya standartındaki, teknik düzenlemesindeki nitelik ve niceliği ile ilgilisi bulunmayan maddi, hukuki veya ekonomik beklenti ve talepler, satıcıya karşı ayıp olarak ileri sürülemez.</li>
                <li>İşbu sözleşme tarihinde sözleşmenin bir nüshasını teslim alan alıcı borçlu, bu tarihten itibaren 7 gün içinde sözleşme yapma konusundaki irade açıklamasını, satıcıya yazılı olarak bildirmek suretiyle geri alabilir.</li>
                <li>Satıcı, bankalardaki hesap numaraları ve posta çeki hesap numaralarına ödeme yapılmasını isteme hakkına sahip olduğu gibi, satıcı işbu sözleşmeden doğan satış bedeli alacağını devredebilir.</li>
                <li>Alıcı borçlu ve müteselsil borçluların sözleşme düzenlenirken beyan ettiği adres ve iletişim vasıtalarına, satıcı tarafından yapılacak her türlü tebligat ve bildirim, borçluların kendisine yapılmış sayılır.</li>
                <li>İşbu sözleşmeden doğacak ihtilaflarda Tüketici Mahkemesi veya Tüketici Hakem Heyetleri görevlidir.</li>
            </ol>

            {/* --- PRODUCT & PAYMENT TABLE --- */}
            <table className="w-full border-collapse border border-black mb-4 text-[9px]">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-1">MİKTAR</th>
                        <th className="border border-black p-1">SATILAN MALIN CİNSİ</th>
                        <th className="border border-black p-1">FİYAT/TL</th>
                        <th className="border border-black p-1">TUTAR/TL</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((p, i) => (
                        <tr key={i}>
                            <td className="border border-black p-2 text-center">1</td>
                            <td className="border border-black p-2">{p.name}</td>
                            <td className="border border-black p-2 text-right">
                                {p.price > 0
                                    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(p.price)
                                    : '......................'}
                            </td>
                            <td className="border border-black p-2 text-right">
                                {p.price > 0
                                    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(p.price)
                                    : '......................'}
                            </td>
                        </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 3 - products.length) }).map((_, i) => (
                        <tr key={`empty-${i}`}>
                            <td className="border border-black p-2 text-center">-</td>
                            <td className="border border-black p-2"></td>
                            <td className="border border-black p-2"></td>
                            <td className="border border-black p-2"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* --- INSTALLMENT SCHEDULE --- */}
            <h4 className="font-bold text-xs mb-1 border-b border-black inline-block">BORCUN TAKSİT DURUMU</h4>
            <div className="flex gap-4 mb-4">
                <table className="w-1/2 border-collapse border border-black text-[9px]">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-black p-1">TAK</th>
                            <th className="border border-black p-1">VADE TARİHİ</th>
                            <th className="border border-black p-1">TUTAR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                            <tr key={i} className="h-6">
                                <td className="border border-black text-center">{i}</td>
                                <td className="border border-black"></td>
                                <td className="border border-black"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <table className="w-1/2 border-collapse border border-black text-[9px]">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-black p-1">TAK</th>
                            <th className="border border-black p-1">VADE TARİHİ</th>
                            <th className="border border-black p-1">TUTAR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(i => (
                            <tr key={i} className="h-6">
                                <td className="border border-black text-center">{i}</td>
                                <td className="border border-black"></td>
                                <td className="border border-black"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-end font-bold text-xs mb-8">
                <div>Satış Elemanı: {customer.created_by?.split('@')[0] || '...............'}</div>
                <div className="text-right">
                    <p>TOPLAM: {priceStr}</p>
                    <p>PEŞİN ÖDENEN: ....................... TL</p>
                    <p>KALAN BORÇ: ....................... TL</p>
                </div>
            </div>

            <div className="text-[10px] italic text-center mb-6">
                YUKARIDA YAZILI TÜM MADDELER SATICI VE ALICI/MÜTESELSİL KEFİLLERLE BİRLİKTE MÜZAKERE EDİLEREK İMZA ALTINA ALINMIŞTIR.
            </div>

            {/* --- SIGNATURES --- */}
            <div className="flex justify-between text-xs font-bold text-center mt-12 w-full">
                <div className="w-1/4 text-left pl-4">
                    <p className="mb-1 text-[10px] text-gray-600">SATICI</p>
                    <p className="font-extrabold text-[11px]">Ceptekolay Elektronik Ticaret Ltd. Şti.</p>
                </div>

                <div className="w-1/4">
                    <p className="mb-8">BORÇLU</p>
                    <p>İMZA</p>
                    <div className="h-8"></div>
                </div>

                <div className="w-1/4">
                    <p className="mb-8">1. MÜŞTEREK BORÇLU</p>
                    <p>İMZA</p>
                    <div className="h-8"></div>
                </div>
            </div>

            {/* Print Styling Helper */}
            <style jsx global>{`
                @media print {
                    @page { margin: 10mm; size: A4; }
                    body { background: white; }
                    .no-print { display: none; }
                }
            `}</style>
        </div>
    );
}
