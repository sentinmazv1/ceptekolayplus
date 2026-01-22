'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Home, LogOut, PlusCircle, Search, User, UserCircle, BarChart2, FileSearch, Package, Loader2, LayoutDashboard, UserPlus, Menu, X, Calendar, Database } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
// import { LiveActivityTicker } from '@/components/LiveActivityTicker';
// import { ActiveNotifications } from '@/components/ActiveNotifications';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [stats, setStats] = useState<{ pending_approval: number } | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Close sidebar on route change
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (['ADMIN', 'Admin'].includes(session?.user?.role || '')) {
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

                            {/* Mobile Hamburger Button */}
                            <div className="md:hidden flex items-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="text-gray-600 hover:text-gray-900"
                                >
                                    <Menu className="w-6 h-6" />
                                </Button>
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

                                <Link href="/dashboard/calendar">
                                    <Button
                                        variant={isActive('/dashboard/calendar') ? 'primary' : 'ghost'}
                                        size="sm"
                                        className={isActive('/dashboard/calendar') ? '' : 'text-gray-600 hover:text-gray-900'}
                                    >
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Takvim
                                    </Button>
                                </Link>

                                {['ADMIN', 'Admin'].includes(session?.user?.role || '') && (
                                    <>
                                        <Link href="/dashboard/approvals">
                                            <Button
                                                variant={isActive('/dashboard/approvals') ? 'primary' : 'ghost'}
                                                size="sm"
                                                className={isActive('/dashboard/approvals') ? '' : 'text-gray-600 hover:text-gray-900'}
                                            >
                                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                                Onay {stats?.pending_approval ? `(${stats.pending_approval})` : ''}
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

                                        <div className="w-px h-6 bg-gray-200 mx-2" />

                                        <Link href="/dashboard/settings">
                                            <Button
                                                variant={isActive('/dashboard/settings') ? 'primary' : 'ghost'}
                                                size="sm"
                                                className={isActive('/dashboard/settings') ? '' : 'text-gray-600 hover:text-gray-900'}
                                            >
                                                <Database className="w-4 h-4 mr-2" />
                                                Ayarlar (Yönetim)
                                            </Button>
                                        </Link>
                                    </>
                                ) // End Admin Check
                                }



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

                </div>

                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && (
                    <div className="fixed inset-0 z-50 flex">
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                            onClick={() => setIsSidebarOpen(false)}
                        />

                        {/* Sidebar Panel */}
                        <div className="relative bg-white w-64 h-full shadow-xl flex flex-col p-6 animate-in slide-in-from-left duration-300">
                            {/* Close Button */}
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-bold text-gray-900">Menü</h2>
                                <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(false)}>
                                    <X className="w-6 h-6 text-gray-500" />
                                </Button>
                            </div>

                            {/* Navigation Links */}
                            <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
                                <Link href="/dashboard">
                                    <Button
                                        variant={isActive('/dashboard') ? 'primary' : 'ghost'}
                                        className="w-full justify-start text-sm"
                                    >
                                        <LayoutDashboard className="w-4 h-4 mr-3" />
                                        Panel
                                    </Button>
                                </Link>

                                <Link href="/dashboard/my-leads">
                                    <Button
                                        variant={isActive('/dashboard/my-leads') ? 'primary' : 'ghost'}
                                        className="w-full justify-start text-sm"
                                    >
                                        <UserPlus className="w-4 h-4 mr-3" />
                                        Müşterilerim
                                    </Button>
                                </Link>

                                <Link href="/dashboard/calendar">
                                    <Button
                                        variant={isActive('/dashboard/calendar') ? 'primary' : 'ghost'}
                                        className="w-full justify-start text-sm"
                                    >
                                        <Calendar className="w-4 h-4 mr-3" />
                                        Takvim
                                    </Button>
                                </Link>

                                {['ADMIN', 'Admin'].includes(session?.user?.role || '') && (
                                    <>
                                        <div className="my-2 border-t border-gray-100" />
                                        <p className="text-xs font-semibold text-gray-400 uppercase px-2 mb-2">Yönetici</p>

                                        <Link href="/dashboard/approvals">
                                            <Button
                                                variant={isActive('/dashboard/approvals') ? 'primary' : 'ghost'}
                                                className="w-full justify-start text-sm"
                                            >
                                                <LayoutDashboard className="w-4 h-4 mr-3" />
                                                Onay {stats?.pending_approval ? `(${stats.pending_approval})` : ''}
                                            </Button>
                                        </Link>

                                        <Link href="/dashboard/reports">
                                            <Button
                                                variant={isActive('/dashboard/reports') ? 'primary' : 'ghost'}
                                                className="w-full justify-start text-sm"
                                            >
                                                <BarChart2 className="w-4 h-4 mr-3" />
                                                Raporlar
                                            </Button>
                                        </Link>

                                        <Link href="/dashboard/inventory">
                                            <Button
                                                variant={isActive('/dashboard/inventory') ? 'primary' : 'ghost'}
                                                className="w-full justify-start text-sm"
                                            >
                                                <Package className="w-4 h-4 mr-3" />
                                                Stok
                                            </Button>
                                        </Link>



                                        <Link href="/dashboard/inventory">
                                            <Button
                                                variant={isActive('/dashboard/inventory') ? 'primary' : 'ghost'}
                                                className="w-full justify-start text-sm"
                                            >
                                                <Package className="w-4 h-4 mr-3" />
                                                Stok
                                            </Button>
                                        </Link>

                                        <Link href="/dashboard/settings">
                                            <Button
                                                variant={isActive('/dashboard/settings') ? 'primary' : 'ghost'}
                                                className="w-full justify-start text-sm"
                                            >
                                                <Database className="w-4 h-4 mr-3" />
                                                Ayarlar (Yönetim)
                                            </Button>
                                        </Link>
                                    </>
                                )}



                                <Link href="/dashboard/add">
                                    <Button
                                        variant={isActive('/dashboard/add') ? 'primary' : 'ghost'}
                                        className="w-full justify-start text-sm"
                                    >
                                        <PlusCircle className="w-4 h-4 mr-3" />
                                        Ekle
                                    </Button>
                                </Link>
                            </nav>

                            {/* Bottom Actions */}
                            <div className="mt-auto pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-3 mb-4 px-2">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                        {session?.user?.name?.[0] || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.name}</p>
                                        <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="secondary"
                                    onClick={() => signOut()}
                                    className="w-full justify-center"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Çıkış Yap
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* 🎉 Live Activity Ticker REMOVED for Performance */}
            {/* <LiveActivityTicker /> */}

            {/* 🔔 Persistent Notifications REMOVED */}
            {/* <ActiveNotifications /> */}

            {/* Page Content */}
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {children}
            </main>
        </div>
    );
}
