'use client';

import React from 'react';
import { Customer } from '@/lib/types';

export function ApplicationFormDocument({ customer }: { customer: Customer }) {
    // Current Date for signature
    const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    // Parse product if possible
    // Parse product if possible
    const rawPrice = customer.kredi_limiti ? parseFloat(customer.kredi_limiti.toString()) : 0;
    const installments = customer.taksit_sayisi || 0;
    const monthlyPayment = installments > 0 ? rawPrice / installments : 0;

    let productDetails = {
        name: customer.talep_edilen_urun || customer.model || 'Belirtilmemiş',
        price: rawPrice,
        installments: installments,
        monthly: monthlyPayment
    };

    return (
        <div className="bg-white p-6 max-w-[210mm] mx-auto min-h-[297mm] text-base leading-relaxed font-serif text-black relative">

            {/* LOGO Header */}
            <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest leading-tight">CEPTE KOLAY<br />ÖN BAŞVURU FORMU</h1>
                </div>
                <div className="text-right text-[10px]">
                    <div className="font-bold text-base">CEPTE KOLAY</div>
                    <div>Mobil Teknolojileri</div>
                    <div>Tarih: {today}</div>
                </div>
            </div>

            {/* 1. Personal Information */}
            <section className="mb-4">
                <h3 className="bg-gray-200 px-2 py-0.5 font-bold border border-black mb-2 text-xs">1. KİMLİK & İLETİŞİM BİLGİLERİ</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-1 text-sm">
                    <div className="flex border-b border-dotted border-gray-400 pb-0.5">
                        <span className="font-bold w-28 shrink-0">Adı Soyadı:</span>
                        <span className="uppercase truncate">{customer.ad_soyad}</span>
                    </div>
                    <div className="flex border-b border-dotted border-gray-400 pb-0.5">
                        <span className="font-bold w-28 shrink-0">TC Kimlik No:</span>
                        <span>{customer.tc_kimlik || '................................'}</span>
                    </div>
                    <div className="flex border-b border-dotted border-gray-400 pb-0.5">
                        <span className="font-bold w-28 shrink-0">Telefon:</span>
                        <span>{customer.telefon}</span>
                    </div>
                    <div className="flex border-b border-dotted border-gray-400 pb-0.5">
                        <span className="font-bold w-28 shrink-0">Doğum Tarihi:</span>
                        <span>{customer.dogum_tarihi || '................................'}</span>
                    </div>
                    <div className="col-span-2 flex border-b border-dotted border-gray-400 pb-0.5">
                        <span className="font-bold w-28 shrink-0">Ev Adresi:</span>
                        <span className="uppercase flex-1 truncate">{customer.ev_adresi || '................................................................................................................................'}</span>
                    </div>
                    <div className="col-span-2 flex border-b border-dotted border-gray-400 pb-0.5">
                        <span className="font-bold w-28 shrink-0">Mülkiyet Durumu:</span>
                        <span className="uppercase flex-1">{customer.mulkiyet_durumu || '..........................................'}</span>
                    </div>
                </div>
            </section>

            {/* 2. Job Information */}
            <section className="mb-4">
                <h3 className="bg-gray-200 px-2 py-0.5 font-bold border border-black mb-2 text-xs">2. ÇALIŞMA BİLGİLERİ</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-1 text-sm">
                    <div className="col-span-2 flex border-b border-dotted border-gray-400 pb-0.5">
                        <span className="font-bold w-28 shrink-0">Meslek:</span>
                        <span className="uppercase flex-1">{customer.meslek || customer.meslek_is || '................................'}</span>
                    </div>
                    <div className="col-span-2 flex border-b border-dotted border-gray-400 pb-0.5">
                        <span className="font-bold w-28 shrink-0">İş Yeri Adı:</span>
                        <span className="uppercase flex-1">{customer.is_yeri_unvani || '................................................................................'}</span>
                    </div>
                </div>
            </section>

            {/* 3. Product Request */}
            <section className="mb-4">
                <h3 className="bg-gray-200 px-2 py-0.5 font-bold border border-black mb-2 text-xs">3. TALEP EDİLEN CİHAZ</h3>
                <div className="border border-black p-3 text-sm">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold">Marka / Model:</span>
                        <span className="text-lg font-bold border-b-2 border-dashed border-black min-w-[200px] text-center">
                            {productDetails.name}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-bold">Toplam Tutar:</span>
                        <span className="text-lg font-mono border-b-2 border-dashed border-black min-w-[200px] text-center">
                            {productDetails.price > 0 ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(productDetails.price) : '..........................'}
                        </span>
                    </div>
                </div>
                {productDetails.installments > 0 && (
                    <div className="flex justify-between items-center mt-2 px-3 text-sm font-bold bg-gray-50 border border-black border-t-0 py-1">
                        <span>{productDetails.installments} Taksit</span>
                        <span>Aylık: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(productDetails.monthly)}</span>
                    </div>
                )}
            </section>

            {/* 4. Declaration */}
            <section className="mb-8 mt-4">
                <h3 className="font-bold border-b border-black mb-1 pb-0.5 text-xs">4. BEYAN VE TAAHHÜT</h3>
                <p className="text-justify text-[11px] leading-5 mb-2 font-medium">
                    {productDetails.installments > 0
                        ? `Yukarıda özellikleri belirtilen cihazı, ${productDetails.installments} taksit ile, aylık ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(productDetails.monthly)} ödeme planıyla, toplam ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(productDetails.price)} bedel karşılığında satın almayı talep ediyorum.`
                        : `Yukarıda özellikleri belirtilen cihazı, toplam ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(productDetails.price)} bedel karşılığında satın almayı talep ediyorum.`
                    }
                    <br /><br />
                    Yukarıda beyan ettiğim kişisel, iletişim ve gelir bilgilerinin tamamen doğru olduğunu, eksik veya yanıltıcı bilgi vermediğimi kabul ve taahhüt ederim.
                    Şahsıma yapılacak olan istihbarat ve finansal sorgulamalara (KKB, Findeks, e-Devlet vb.) açık rızam ile onay veriyorum.
                    İşbu başvuru formunun bir sözleşme niteliği taşımadığını, yalnızca ön değerlendirme amacı taşıdığını, başvurumun onaylanması durumunda ayrıca "Satış Sözleşmesi" imzalanacağını biliyorum.
                </p>
            </section>

            {/* Signatures */}
            <section className="flex justify-end mt-16 px-8 text-sm">
                <div className="text-center">
                    <h4 className="font-bold mb-8 text-xs">MÜŞTERİ (BAŞVURU SAHİBİ)</h4>
                    <div className="border-t border-black w-40 pt-1">
                        <span className="uppercase font-bold block mb-1 text-xs">{customer.ad_soyad}</span>
                        <span className="text-[10px]">İmza</span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-[9px] text-gray-400 border-t pt-1 mx-8">
                Bu form {today} tarihinde dijital olarak oluşturulmuştur. | Sistem Kayıt No: #{customer.id.substring(0, 8)}
            </div>

        </div>
    );
}
