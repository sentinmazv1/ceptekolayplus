'use client';

import { Package } from 'lucide-react';

interface DeliveredProduct {
    ad_soyad: string;
    meslek: string;
    satilan_urunler: any;
    kredi_limiti: string;
    teslim_tarihi: string;
    sahip_email: string;
}

interface DeliveredProductsTableProps {
    products: DeliveredProduct[];
    loading?: boolean;
}

export function DeliveredProductsTable({ products, loading }: DeliveredProductsTableProps) {
    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">Teslim Edilen Ürünler</h3>
                </div>
                <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
            </div>
        );
    }

    if (!products || products.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">Teslim Edilen Ürünler</h3>
                </div>
                <div className="text-center py-8 text-gray-500">Bu tarih aralığında teslim edilen ürün bulunamadı.</div>
            </div>
        );
    }

    const formatCurrency = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num || 0);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('tr-TR');
    };

    const getProductNames = (products: any) => {
        if (!products) return '-';
        if (typeof products === 'string') {
            try {
                products = JSON.parse(products);
            } catch {
                return products;
            }
        }
        if (Array.isArray(products)) {
            return products.map(p => p.marka || p.model || 'Ürün').join(', ');
        }
        return '-';
    };

    const getProductAmount = (products: any) => {
        if (!products) return 0;
        if (typeof products === 'string') {
            try {
                products = JSON.parse(products);
            } catch {
                return 0;
            }
        }
        if (Array.isArray(products)) {
            return products.reduce((total, p) => {
                const tutar = typeof p.tutar === 'string' ? parseFloat(p.tutar.replace(/[^0-9.-]/g, '')) : (p.tutar || 0);
                return total + tutar;
            }, 0);
        }
        return 0;
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">Teslim Edilen Müşteriler</h3>
                    <span className="ml-auto text-sm text-gray-500">{products.length} müşteri</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Müşteri İsmi
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Meslek
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Teslim Tarihi
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{product.ad_soyad || '-'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-600">{product.meslek || '-'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-600">{formatDate(product.teslim_tarihi || product.updated_at)}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
