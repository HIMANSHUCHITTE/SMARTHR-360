import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const PublicLayout = () => {
    return (
        <div className="app-shell flex min-h-screen flex-col">
            <header className="site-header glass">
                <div className="container site-header-inner">
                    <div className="flex items-center gap-3 sm:gap-7">
                        <Link to="/" className="site-brand">
                            SMARTHR-360
                        </Link>
                        <nav className="site-links hidden md:flex">
                            <a href="#features" className="site-link">Features</a>
                            <a href="#pricing" className="site-link">Pricing</a>
                            <a href="#about" className="site-link">About</a>
                        </nav>
                    </div>
                    <div className="flex items-center gap-2">
                        <nav className="flex items-center gap-2">
                            <Link to="/auth/login">
                                <Button variant="ghost" size="sm">
                                    Login
                                </Button>
                            </Link>
                            <Link to="/auth/register">
                                <Button size="sm" className="px-3 sm:px-4">Get Started</Button>
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>
            <main className="flex-1">
                <Outlet />
            </main>
            <footer className="site-footer">
                <div className="container">
                    <p>
                        Built by SMARTHR Team. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default PublicLayout;
