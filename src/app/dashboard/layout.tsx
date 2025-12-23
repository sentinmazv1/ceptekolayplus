'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, LogOut, PlusCircle, Search, User, UserCircle, BarChart2, FileSearch, Package, Loader2, LayoutDashboard, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { LiveActivityTicker } from '@/components/LiveActivityTicker';
import { useState, useEffect } from 'react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [stats, setStats] = useState<{ pending_approval: number } | null>(null);

    useEffect(() => {
        if (session?.user?.role === 'ADMIN') {
            fetch('/api/leads/stats').then(res => res.json()).then(setStats).catch(() => { });
        }
    }, [pathname, session]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (status === 'unauthenticated') {
        router.push('/');
        return null;
    }

    const isActive = (path: string) => pathname === path;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Persistent Header */}
            <header className="bg-white shadow-sm sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="h-16 flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            {/* Logo / Title */}
                            <div className="flex items-center gap-4">
                                <h1 className="text-xl font-bold text-gray-900 tracking-tight">CepteKolay+</h1>
                                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full border border-indigo-100 hidden sm:inline-block">
                                    {session?.user?.email}
                                </span>
                            </div>

                            {/* Global Navigation - Desktop */}
                            <nav className="hidden md:flex gap-1 overflow-x-auto">
                                <Link href="/dashboard">
                                    <Button
                                        variant={isActive('/dashboard') ? 'primary' : 'ghost'}
                                        size="sm"
                                        className={isActive('/dashboard') ? '' : 'text-gray-600 hover:text-gray-900'}
                                    >
                                        <LayoutDashboard className="w-4 h-4 mr-2" />
                                        Panel
                                    </Button>
                                </Link>

                                <Link href="/dashboard/my-leads">
                                    <Button
                                        variant={isActive('/dashboard/my-leads') ? 'primary' : 'ghost'}
                                        size="sm"
                                        className={isActive('/dashboard/my-leads') ? '' : 'text-gray-600 hover:text-gray-900'}
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Müşterilerim
                                    </Button>
                                </Link>

                                {session?.user?.role === 'ADMIN' && (
                                    <>
                                        <Link href="/dashboard/approvals">
                                            <Button
                                                variant={isActive('/dashboard/approvals') ? 'primary' : 'ghost'}
                                                size="sm"
                                                className={isActive('/dashboard/approvals') ? '' : 'text-gray-600 hover:text-gray-900'}
                                            >
                                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                                Onay
                                            </Button>
                                        </Link>

                                        <Link href="/dashboard/reports">
                                            <Button
                                                variant={isActive('/dashboard/reports') ? 'primary' : 'ghost'}
                                                size="sm"
                                                className={isActive('/dashboard/reports') ? '' : 'text-gray-600 hover:text-gray-900'}
                                            >
                                                <BarChart2 className="w-4 h-4 mr-2" />
                                                Raporlar
                                            </Button>
                                        </Link>

                                        <Link href="/dashboard/inventory">
                                            <Button
                                                variant={isActive('/dashboard/inventory') ? 'primary' : 'ghost'}
                                                size="sm"
                                                className={isActive('/dashboard/inventory') ? '' : 'text-gray-600 hover:text-gray-900'}
                                            >
                                                <Package className="w-4 h-4 mr-2" />
                                                Stok
                                            </Button>
                                        </Link>

                                        <Link href="/dashboard/search">
                                            <Button
                                                variant={isActive('/dashboard/search') ? 'primary' : 'ghost'}
                                                size="sm"
                                                className={isActive('/dashboard/search') ? '' : 'text-gray-600 hover:text-gray-900'}
                                            >
                                                <Search className="w-4 h-4 mr-2" />
                                                Sorgula
                                            </Button>
                                        </Link>

                                        <Link href="/dashboard/add">
                                            <Button
                                                variant={isActive('/dashboard/add') ? 'primary' : 'ghost'}
                                                size="sm"
                                                className={isActive('/dashboard/add') ? '' : 'text-gray-600 hover:text-gray-900'}
                                            >
                                                <PlusCircle className="w-4 h-4 mr-2" />
                                                Ekle
                                            </Button>
                                        </Link>
                                    </>
                                )}
                            </nav>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Mobile Menu Button could go here */}
                            <Button variant="secondary" onClick={() => signOut()} size="sm" className="hidden sm:flex">
                                <LogOut className="w-4 h-4 mr-2" />
                                Çıkış
                            </Button>
                        </div>
                    </div>

                    {/* Mobile Navigation Row (Horizontal Scroll) */}
                    <div className="md:hidden overflow-x-auto py-2 flex gap-2 border-t border-gray-100 no-scrollbar">
                        <Link href="/dashboard">
                            <Button variant={isActive('/dashboard') ? 'primary' : 'outline'} size="sm" className="whitespace-nowrap">
                                Panel
                            </Button>
                        </Link>
                        {session?.user?.role === 'ADMIN' && (
                            <>
                                <Link href="/dashboard/reports">
                                    <Button variant={isActive('/dashboard/reports') ? 'primary' : 'outline'} size="sm" className="whitespace-nowrap">
                                        Raporlar
                                    </Button>
                                </Link>
                                <Link href="/dashboard/inventory">
                                    <Button variant={isActive('/dashboard/inventory') ? 'primary' : 'outline'} size="sm" className="whitespace-nowrap">
                                        Stok
                                    </Button>
                                </Link>
                                <Link href="/dashboard/search">
                                    <Button variant={isActive('/dashboard/search') ? 'primary' : 'outline'} size="sm" className="whitespace-nowrap">
                                        Sorgula
                                    </Button>
                                </Link>
                                <Link href="/dashboard/add">
                                    <Button variant={isActive('/dashboard/add') ? 'primary' : 'outline'} size="sm" className="whitespace-nowrap">
                                        Ekle
                                    </Button>
                                </Link>
                            </>
                        )}
                        <Button variant="secondary" onClick={() => signOut()} size="sm" className="whitespace-nowrap ml-auto">
                            Çıkış
                        </Button>
                    </div>
                </div>
            </header>

            {/* 🎉 Live Activity Ticker - Gamification! */}
            <LiveActivityTicker />

            {/* Page Content */}
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {children}
            </main>
        </div>
    );
}
