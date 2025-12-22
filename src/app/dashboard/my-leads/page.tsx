'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MyLeadsList } from '@/components/MyLeadsList';
import { CustomerCard } from '@/components/CustomerCard';
import { Button } from '@/components/ui/Button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Customer } from '@/lib/types';

export default function MyLeadsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

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

    // Detail View
    if (selectedCustomer) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                <div className="mb-6">
                    <Button
                        variant="outline"
                        onClick={() => setSelectedCustomer(null)}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Listeye Dön
                    </Button>
                </div>
                <CustomerCard
                    initialData={selectedCustomer}
                    onSave={(updated) => setSelectedCustomer(updated)}
                />
            </div>
        );
    }

    // List View
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Müşteri Portföyüm</h1>
            <MyLeadsList
                userEmail={session.user.email}
                onSelectLead={(customer) => setSelectedCustomer(customer)}
            />
        </div>
    );
}
