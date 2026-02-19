import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut, Search, Bell, Moon, Sun, User, ArrowLeft, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import api from '../services/api';

const PanelShell = ({ panelName, brand, menuItems, subtitle }) => {
    const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1280 : true));
    const [query, setQuery] = useState('');
    const [theme, setTheme] = useState(localStorage.getItem('ui-theme') || 'light');
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, organization, logout, panel } = useAuthStore();

    useEffect(() => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('ui-theme', theme);
    }, [theme]);

    useEffect(() => {
        const onResize = () => {
            const desktop = window.innerWidth >= 1024;
            setIsDesktop(desktop);
            if (!desktop) setIsSidebarOpen(false);
            if (desktop && window.innerWidth >= 1280) setIsSidebarOpen(true);
        };
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        let mounted = true;
        const loadNotifications = async () => {
            try {
                const { data } = await api.get('/notifications');
                if (mounted) setNotifications(Array.isArray(data) ? data : []);
            } catch {
                if (mounted) setNotifications([]);
            }
        };
        loadNotifications();
        const timer = setInterval(loadNotifications, 30000);
        return () => {
            mounted = false;
            clearInterval(timer);
        };
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/auth/login');
    };

    const profilePath = useMemo(() => {
        if (panel === 'OWNER') return '/owner/profile';
        if (panel === 'SUBADMIN') return '/subadmin/profile';
        if (panel === 'EMPLOYEE') return '/subadmin/profile';
        if (panel === 'SUPERADMIN') return '/superadmin/settings';
        return '/user/profile';
    }, [panel]);

    const networkPath = useMemo(() => {
        if (panel === 'OWNER') return '/owner/network';
        if (panel === 'SUBADMIN') return '/subadmin/network';
        if (panel === 'EMPLOYEE') return '/subadmin/network';
        return '/user/network';
    }, [panel]);

    const settingsPath = useMemo(() => {
        if (panel === 'OWNER') return '/owner/settings';
        if (panel === 'SUBADMIN') return '/subadmin/settings';
        if (panel === 'EMPLOYEE') return '/subadmin/settings';
        if (panel === 'SUPERADMIN') return '/superadmin/settings';
        return '/user/settings';
    }, [panel]);
    const isPanelMainPage = location.pathname.endsWith('/dashboard');
    const showMenuText = isDesktop ? isSidebarOpen : true;

    const unreadCount = notifications.filter((item) => !item.isRead).length;

    const markRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications((prev) => prev.map((item) => (
                item._id === id ? { ...item, isRead: true } : item
            )));
        } catch (error) {
            console.error(error);
        }
    };

    const runSearch = () => {
        const q = query.trim();
        if (!q) return;
        if (panel === 'SUPERADMIN') {
            navigate('/superadmin/dashboard');
            return;
        }
        navigate(`${networkPath}?q=${encodeURIComponent(q)}`);
    };

    return (
        <div className="relative flex min-h-screen overflow-hidden">
            {!isDesktop && isSidebarOpen && (
                <button
                    type="button"
                    aria-label="Close sidebar"
                    className="fixed inset-0 z-40 bg-black/35"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside
                className={cn(
                    'z-50 flex flex-col border-r bg-card/95 backdrop-blur-xl transition-all duration-300',
                    'fixed inset-y-0 left-0 w-72 -translate-x-full lg:static lg:inset-auto lg:translate-x-0',
                    isSidebarOpen && 'translate-x-0',
                    isDesktop && (isSidebarOpen ? 'lg:w-64' : 'lg:w-16'),
                )}
            >
                <div className={cn('flex h-16 items-center border-b px-4', showMenuText ? 'justify-between' : 'justify-center')}>
                    {showMenuText ? (
                        <div>
                            <p className="text-sm font-bold text-primary">{brand}</p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{panelName}</p>
                        </div>
                    ) : (
                        <span className="text-sm font-bold text-primary">{brand.slice(0, 1)}</span>
                    )}
                    {!isDesktop && (
                        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} title="Close menu">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <nav className="flex-1 space-y-1 p-2">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => {
                                if (!isDesktop) setIsSidebarOpen(false);
                            }}
                            className={({ isActive }) => cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0',
                                isActive ? 'bg-gradient-to-r from-primary/20 via-accent/15 to-transparent text-primary shadow-sm' : 'text-muted-foreground hover:bg-secondary/55 hover:text-foreground'
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {showMenuText && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="border-t p-4">
                    {showMenuText && (
                        <div className="mb-3 text-xs">
                            <p className="font-medium">{user?.profile?.firstName} {user?.profile?.surname || user?.profile?.lastName}</p>
                            <p className="text-muted-foreground">{user?.email}</p>
                        </div>
                    )}
                    <Button
                        variant="outline"
                        className={cn('w-full', showMenuText ? 'justify-start' : 'justify-center px-0')}
                        onClick={handleLogout}
                    >
                        <LogOut className={cn('h-4 w-4', showMenuText && 'mr-2')} />
                        {showMenuText && 'Logout'}
                    </Button>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="relative z-30 flex h-16 items-center justify-between border-b bg-card/80 px-3 backdrop-blur-xl sm:px-4 lg:px-6">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        {!isPanelMainPage && (
                            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} title="Go Back">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen((v) => !v)}>
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold md:text-base">{subtitle}</h2>
                            <p className="hidden max-w-[220px] truncate text-xs text-muted-foreground sm:block md:max-w-none">{organization?.name || 'Personal Workspace'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="relative hidden xl:block">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                                placeholder="Search people, skill, company..."
                                className="h-9 w-64 rounded-md border bg-background pl-8 pr-3 text-sm"
                            />
                        </div>
                        <Button variant="ghost" size="icon" onClick={runSearch}>
                            <Search className="h-4 w-4" />
                        </Button>
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                title="Notifications"
                                onClick={() => setShowNotifications((v) => !v)}
                            >
                                <Bell className="h-4 w-4" />
                                {unreadCount > 0 && (
                                    <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </Button>
                            {showNotifications && (
                                <div className="absolute right-0 z-[90] mt-2 w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-border bg-white p-2 text-slate-900 shadow-2xl sm:w-80">
                                    <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Notifications</p>
                                    {notifications.length === 0 ? (
                                        <p className="px-2 py-3 text-xs text-muted-foreground">No notifications yet.</p>
                                    ) : (
                                        <div className="max-h-[60vh] space-y-1 overflow-auto">
                                            {notifications.slice(0, 10).map((item) => (
                                                <button
                                                    key={item._id}
                                                    onClick={() => {
                                                        if (!item.isRead) markRead(item._id);
                                                        if (item.actionLink) navigate(item.actionLink);
                                                        setShowNotifications(false);
                                                    }}
                                                    className={cn(
                                                        'w-full rounded-md px-2 py-2 text-left text-xs transition hover:bg-muted',
                                                        item.isRead ? 'bg-white' : 'bg-primary/10'
                                                    )}
                                                >
                                                    <p className="font-semibold">{item.title || 'Update'}</p>
                                                    <p className="text-slate-600">{item.message || 'New activity available.'}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <Button
                                        variant="outline"
                                        className="mt-2 w-full"
                                        onClick={() => {
                                            setShowNotifications(false);
                                            navigate(settingsPath);
                                        }}
                                    >
                                        Notification Settings
                                    </Button>
                                </div>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Toggle theme"
                            onClick={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')}
                        >
                            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn('sm:hidden', location.pathname === profilePath ? 'border-primary text-primary' : '')}
                            onClick={() => navigate(profilePath)}
                            title="Profile"
                        >
                            <User className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn('hidden sm:inline-flex', location.pathname === profilePath ? 'border-primary text-primary' : '')}
                            onClick={() => navigate(profilePath)}
                        >
                            <User className="mr-2 h-4 w-4" />
                            Profile
                        </Button>
                    </div>
                </header>
                <main className="animate-page-in flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default PanelShell;
