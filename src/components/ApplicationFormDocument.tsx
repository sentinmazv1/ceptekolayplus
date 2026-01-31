'use client';

import React from 'react';
import { Customer } from '@/lib/types';

export function ApplicationFormDocument({ customer }: { customer: Customer }) {
    // Current Date for signature
    const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    // Parse product if possible
    let productDetails = {
        name: customer.talep_edilen_urun || customer.model || 'Belirtilmemiş',
        price: customer.talep_edilen_tutar || (customer.kredi_limiti ? parseFloat(customer.kredi_limiti) : 0) || 0
    };

    return (
        <div className="bg-white p-12 max-w-[210mm] mx-auto min-h-[297mm] text-base leading-relaxed font-serif text-black relative">

            {/* LOGO Header */}
            <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold uppercase tracking-widest">CEPTE KOLAY<br />ÖN BAŞVURU FORMU</h1>
                </div>
                <div className="text-right text-xs">
                    <div className="font-bold text-lg">CEPTE KOLAY</div>
                    <div>Mobil Teknolojileri</div>
                    <div>Tarih: {today}</div>
                </div>
            </div>

            {/* 1. Personal Information */}
            <section className="mb-6">
                <h3 className="bg-gray-200 px-3 py-1 font-bold border border-black mb-3">1. KİMLİK & İLETİŞİM BİLGİLERİ</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 px-2">
                    <div className="flex border-b border-dotted border-gray-400 pb-1">
                        <span className="font-bold w-32 shrink-0">Adı Soyadı:</span>
                        <span className="uppercase">{customer.ad_soyad}</span>
                    </div>
                    <div className="flex border-b border-dotted border-gray-400 pb-1">
                        <span className="font-bold w-32 shrink-0">TC Kimlik No:</span>
                        <span>{customer.tc_kimlik || '................................'}</span>
                    </div>
                    <div className="flex border-b border-dotted border-gray-400 pb-1">
                        <span className="font-bold w-32 shrink-0">Telefon:</span>
                        <span>{customer.telefon}</span>
                    </div>
                    <div className="flex border-b border-dotted border-gray-400 pb-1">
                        <span className="font-bold w-32 shrink-0">Doğum Tarihi:</span>
                        <span>{customer.dogum_tarihi || '................................'}</span>
                    </div>
                    <div className="col-span-2 flex border-b border-dotted border-gray-400 pb-1">
                        <span className="font-bold w-32 shrink-0">Ev Adresi:</span>
                        <span className="uppercase flex-1">{customer.ev_adresi || '................................................................................................................................'}</span>
                    </div>
                    <div className="col-span-2 flex border-b border-dotted border-gray-400 pb-1">
                        <span className="font-bold w-32 shrink-0">Mülkiyet Durumu:</span>
                        <span className="uppercase flex-1">{customer.mulkiyet_durumu || '..........................................'}</span>
                    </div>
                </div>
            </section>

            {/* 2. Job Information */}
            <section className="mb-6">
                <h3 className="bg-gray-200 px-3 py-1 font-bold border border-black mb-3">2. ÇALIŞMA BİLGİLERİ</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 px-2">
                    <div className="col-span-2 flex border-b border-dotted border-gray-400 pb-1">
                        <span className="font-bold w-32 shrink-0">Meslek:</span>
                        <span className="uppercase flex-1">{customer.meslek || customer.meslek_is || '................................'}</span>
                    </div>
                    <div className="col-span-2 flex border-b border-dotted border-gray-400 pb-1">
                        <span className="font-bold w-32 shrink-0">İş Yeri Adı:</span>
                        <span className="uppercase flex-1">{customer.is_yeri_unvani || '................................................................................'}</span>
                    </div>
                </div>
            </section>

            {/* 3. Product Request */}
            <section className="mb-8">
                <h3 className="bg-gray-200 px-3 py-1 font-bold border border-black mb-3">3. TALEP EDİLEN CİHAZ</h3>
                <div className="border border-black p-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold">Marka / Model:</span>
                        <span className="text-xl font-bold border-b-2 border-dashed border-black min-w-[300px] text-center">
                            {productDetails.name}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-bold">Öngörülen Tutar:</span>
                        <span className="text-lg font-mono border-b-2 border-dashed border-black min-w-[300px] text-center">
                            {productDetails.price > 0 ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(productDetails.price) : '..........................'}
                        </span>
                    </div>
                </div>
            </section>

            {/* 4. Declaration */}
            <section className="mb-12 mt-8">
                <h3 className="font-bold border-b border-black mb-2 pb-1">BEYAN VE TAAHHÜT</h3>
                <p className="text-justify text-sm leading-6 mb-4">
                    Yukarıda beyan ettiğim kişisel, iletişim ve gelir bilgilerinin tamamen doğru olduğunu, eksik veya yanıltıcı bilgi vermediğimi kabul ve taahhüt ederim.
                    Şahsıma yapılacak olan istihbarat ve finansal sorgulamalara (KKB, Findeks, e-Devlet vb.) açık rızam ile onay veriyorum.
                    İşbu başvuru formunun bir sözleşme niteliği taşımadığını, yalnızca ön değerlendirme amacı taşıdığını, başvurumun onaylanması durumunda ayrıca "Satış Sözleşmesi" imzalanacağını biliyorum.
                    Başvurumun olumlu sonuçlanması halinde, talep ettiğim cihazı teslim alacağımı beyan ederim.
                </p>
                <div className="flex items-start gap-2 text-sm">
                    <div className="w-5 h-5 border border-black mt-0.5 inline-block shrink-0"></div>
                    <p>KVKK Aydınlatma Metni'ni okudum, kişisel verilerimin işlenmesine onay veriyorum.</p>
                </div>
            </section>

            {/* Signatures */}
            <section className="flex justify-between mt-20 px-8">
                <div className="text-center">
                    <h4 className="font-bold mb-12">YETKİLİ PERSONEL</h4>
                    <div className="border-t border-black w-48 pt-1">
                        CEPTE KOLAY<br />
                        <span className="text-xs">Kaşe / İmza</span>
                    </div>
                </div>

                <div className="text-center">
                    <h4 className="font-bold mb-12">MÜŞTERİ (BAŞVURU SAHİBİ)</h4>
                    <div className="border-t border-black w-48 pt-1">
                        <span className="uppercase font-bold block mb-1">{customer.ad_soyad}</span>
                        <span className="text-xs">İmza</span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <div className="absolute bottom-8 left-0 right-0 text-center text-[10px] text-gray-500 border-t pt-2 mx-12">
                Bu form {today} tarihinde dijital olarak oluşturulmuştur. | Sistem Kayıt No: #{customer.id.substring(0, 8)}
            </div>

        </div>
    );
}
