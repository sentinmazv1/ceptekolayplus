
'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, PieChart, Users, TrendingUp } from 'lucide-react';

export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

    const handleSubmit = async (e: React.FormEvent) => {
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
                router.push(callbackUrl);
                router.refresh();
            }
        } catch (err) {
            setError('Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>
                <div className="absolute bottom-0 left-[20%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[80px]"></div>
            </div>

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden rounded-3xl shadow-2xl bg-white/5 border border-white/10 backdrop-blur-xl relative z-10">

                {/* Left Side: Login Form */}
                <div className="p-8 md:p-12 flex flex-col justify-center relative">
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                                <ShieldCheck className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-2xl font-black tracking-tight text-white">
                                CepteKolay<span className="text-indigo-400">+</span>
                            </h1>
                        </div>
                        <p className="text-slate-400 text-sm font-medium">Yönetim Paneline Hoşgeldiniz</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">E-Posta</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                    placeholder="ornek@ceptekolay.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Şifre</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Giriş Yap
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-500 text-xs">
                            © 2026 Sentinmaz Teknoloji. Tüm hakları saklıdır.
                        </p>
                    </div>
                </div>

                {/* Right Side: Feature Showcase (Desktop Only) */}
                <div className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-indigo-900/40 to-slate-900/40 relative">
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>

                    <div className="relative z-10 space-y-8">
                        <div>
                            <h2 className="text-3xl font-black text-white mb-2 leading-tight">
                                İşinizin Kontrolü <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Parmaklarınızın Ucunda</span>
                            </h2>
                            <p className="text-slate-400 leading-relaxed">
                                Gelişmiş raporlama, müşteri takibi ve performans analizleri ile ekibinizi zirveye taşıyın.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <FeatureItem
                                icon={PieChart}
                                title="Detaylı Analizler"
                                desc="Satış hunisi ve dönüşüm oranlarını anlık takip edin."
                            />
                            <FeatureItem
                                icon={Users}
                                title="Ekip Performansı"
                                desc="Personel karne sistemi ile hedefleri yakalayın."
                            />
                            <FeatureItem
                                icon={TrendingUp}
                                title="Büyüme Odaklı"
                                desc="Veriye dayalı kararlarla cironuzu artırın."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ icon: Icon, title, desc }: any) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-default">
            <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-300">
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <h3 className="font-bold text-white text-sm mb-0.5">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
