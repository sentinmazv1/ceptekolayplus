'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AdminApprovalPanel } from '@/components/AdminApprovalPanel';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function ApprovalsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    if (status === 'loading') {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (status === 'unauthenticated') {
        router.push('/');
        return null;
    }

    if (session?.user?.role !== 'ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900">Yetkisiz Erişim</h1>
                <p className="text-gray-500 mt-2">Bu sayfayı görüntüleme yetkiniz yok.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Yönetici Onay Paneli</h1>
            <AdminApprovalPanel />
        </div>
    );
}
