import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const AuthLayout = () => {
    return (
        <div className="container relative grid h-screen items-center lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col overflow-hidden p-10 text-white lg:flex">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0f697b] via-[#1896ad] to-[#f07d4a]" />
                <div className="absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
                <div className="absolute -right-10 top-10 h-56 w-56 rounded-full bg-black/20 blur-3xl" />
                <div className="relative z-20 flex items-center text-lg font-semibold">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="rounded-full bg-white/20 p-1">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-6 w-6 text-white"
                            >
                                <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                            </svg>
                        </div>
                        SMARTHR-360
                    </Link>
                </div>
                <div className="relative z-20 mt-10 rounded-xl border border-white/20 bg-white/10 p-4 text-sm">
                    <p className="font-semibold">What you can do here</p>
                    <ul className="mt-2 space-y-1 text-white/95">
                        <li>Multi-step secure onboarding</li>
                        <li>Email and mobile OTP verification</li>
                        <li>Role-based panel routing</li>
                    </ul>
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg font-medium">
                            &ldquo;Identity-first HR stack with secure access and role-based control.&rdquo;
                        </p>
                    </blockquote>
                </div>
            </div>
            <div className="flex items-center justify-center lg:p-8">
                <div className="glass-card mx-auto flex w-full flex-col justify-center space-y-6 rounded-2xl p-8 sm:w-[520px]">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
