'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Lock } from 'lucide-react';

export default function Home() {
    const { status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'authenticated') {
            router.push('/dashboard');
        }
    }, [status, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError('Giriş başarısız. Bilgilerinizi kontrol edin.');
            } else {
                router.push('/dashboard');
            }
        } catch (err) {
            setError('Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-indigo-50 rounded-full">
                        <Lock className="w-8 h-8 text-indigo-600" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Satış Yönetim Paneli <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">v3.1 Connected</span>
                </h1>
                <p className="text-gray-500 mb-8">Devam etmek için kurumsal bilgilerinizle giriş yapın.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="text-left">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Adresi</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                            placeholder="ornek@sirket.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="text-left">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                            placeholder="******"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        isLoading={loading}
                    >
                        Giriş Yap
                    </Button>
                </form>

                <p className="mt-6 text-xs text-gray-400">
                    Sadece yetkili personel giriş yapabilir.
                    <br />Erişim sorunu için yöneticinize başvurun.
                </p>
            </div>
        </div>
    );
}
