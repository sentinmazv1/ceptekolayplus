'use client';

import { CustomerCard } from '@/components/CustomerCard';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Customer } from '@/lib/types';

export default function AddCustomerPage() {
    const router = useRouter();

    const emptyCustomer: Customer = {
        id: '',
        ad_soyad: '',
        telefon: '',
        tc_kimlik: '',
        durum: 'Yeni',
        created_at: '',
        created_by: '',
        updated_at: '',
        sahip: '',
        basvuru_kanali: 'Sosyal Medya' // Default
    };

    const handleSave = (savedCustomer: Customer) => {
        // Redirect to search or show success
        router.push('/dashboard/search');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <Button variant="outline" onClick={() => router.back()} className="text-gray-600">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Geri Dön
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">Yeni Müşteri Ekle</h1>
                </div>

                <CustomerCard
                    initialData={emptyCustomer}
                    isNew={true}
                    onSave={handleSave}
                />
            </div>
        </div>
    );
}
