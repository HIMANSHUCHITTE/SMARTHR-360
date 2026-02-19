import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

const AuthLayout = () => {
    return (
        <div className="relative min-h-screen overflow-hidden bg-[#dbe8f3] text-slate-900">
            <div className="absolute left-4 top-4 z-30 sm:left-6 sm:top-6">
                <Link to="/">
                    <Button
                        variant="outline"
                        className="rounded-full border-white/80 bg-white/85 px-4 text-slate-700 shadow-[8px_8px_18px_rgba(133,151,176,0.28),-6px_-6px_14px_rgba(255,255,255,0.72)] backdrop-blur-sm hover:bg-white"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Home
                    </Button>
                </Link>
            </div>

            <div className="container relative z-10 flex min-h-screen items-center py-20">
                <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[34px] border border-white/70 bg-[#e8eff7] p-6 shadow-[18px_18px_38px_rgba(121,142,170,0.26),-12px_-12px_28px_rgba(255,255,255,0.75)] sm:p-9">
                    <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-bl-[84px] bg-[#f2ae49]" />
                    <div className="pointer-events-none absolute -bottom-6 -left-6 h-44 w-44 rounded-tr-[84px] bg-gradient-to-br from-[#3cc6e5] to-[#4f86e9]" />
                    <div className="relative z-10">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
