'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email');

    let message = 'Bir hata oluştu.';

    if (error === 'AccessDenied') {
        message = `Erişim reddedildi. "${email}" adresi "Users" tablosunda tanımlı değil veya yetkiniz yok.`;
    } else if (error === 'Configuration') {
        message = 'Sunucu yapılandırma hatası.';
    } else if (error === 'Verification') {
        message = 'Doğrulama hatası.';
    }

    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center max-w-md w-full">
            <div className="flex justify-center mb-6">
                <div className="p-4 bg-red-50 rounded-full">
                    <AlertCircle className="w-12 h-12 text-red-600" />
                </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Giriş Başarısız</h1>
            <p className="text-red-600 font-medium mb-4">{message}</p>

            <p className="text-sm text-gray-500 mb-8">
                Google Sheet dosyasındaki <strong>Users</strong> sekmesinde mail adresinizin (Role: ADMIN veya SALES_REP) ekli olduğundan emin olun.
            </p>

            <Link href="/">
                <Button className="w-full">
                    Giriş Sayfasına Dön
                </Button>
            </Link>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Suspense fallback={<div>Yükleniyor...</div>}>
                <ErrorContent />
            </Suspense>
        </div>
    );
}
