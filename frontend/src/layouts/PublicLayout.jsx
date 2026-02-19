import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const PublicLayout = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Add shadow on scroll
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close menu on resize to desktop
    useEffect(() => {
        const onResize = () => { if (window.innerWidth > 768) setMenuOpen(false); };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return (
        <div className="app-shell">
            <header className={`site-header glass${scrolled ? ' site-header--scrolled' : ''}`}>
                <div className="container site-header-inner">
                    {/* Brand */}
                    <Link to="/" className="site-brand">SMARTHR-360</Link>

                    {/* Desktop nav links */}
                    <nav className="site-links site-links--desktop">
                        <a href="#features" className="site-link">Features</a>
                        <a href="#pricing" className="site-link">Pricing</a>
                        <a href="#about" className="site-link">About</a>
                    </nav>

                    {/* Desktop CTA buttons */}
                    <div className="site-cta site-cta--desktop">
                        <Link to="/auth/login" className="nav-btn nav-btn--ghost">Login</Link>
                        <Link to="/auth/register" className="nav-btn nav-btn--primary">Get Started</Link>
                    </div>

                    {/* Hamburger button (mobile only) */}
                    <button
                        className="site-hamburger"
                        onClick={() => setMenuOpen((o) => !o)}
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>

                {/* Mobile dropdown menu */}
                {menuOpen && (
                    <div className="site-mobile-menu" onClick={() => setMenuOpen(false)}>
                        <a href="#features" className="site-mobile-link">Features</a>
                        <a href="#pricing" className="site-mobile-link">Pricing</a>
                        <a href="#about" className="site-mobile-link">About</a>
                        <div className="site-mobile-cta">
                            <Link to="/auth/login" className="nav-btn nav-btn--ghost nav-btn--full">Login</Link>
                            <Link to="/auth/register" className="nav-btn nav-btn--primary nav-btn--full">Get Started</Link>
                        </div>
                    </div>
                )}
            </header>

            <main>
                <Outlet />
            </main>

            <footer className="site-footer">
                <div className="container">
                    <p>Built by SMARTHR Team. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default PublicLayout;
