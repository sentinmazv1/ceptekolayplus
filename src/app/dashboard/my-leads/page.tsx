'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MyLeadsList } from '@/components/MyLeadsList';
import { Loader2 } from 'lucide-react';

export default function MyLeadsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    if (status === 'loading') {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (status === 'unauthenticated' || !session?.user?.email) {
        router.push('/');
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Müşteri Portföyüm</h1>
            <MyLeadsList userEmail={session.user.email} />
        </div>
    );
}
