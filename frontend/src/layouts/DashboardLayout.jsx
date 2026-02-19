import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';
import {
    Users,
    Building2,
    LayoutDashboard,
    User as UserIcon,
    LogOut,
    Settings,
    Briefcase,
    FileText,
    DollarSign,
    Shield,
    BrainCircuit,
    Clock,
    Calendar,
    Network,
    TrendingUp,
    Rss
} from 'lucide-react';
import { Button } from '../components/ui/Button';

const DashboardLayout = () => {
    const { user, logout, organization } = useAuthStore();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const handleLogout = () => {
        logout();
        navigate('/auth/login');
    };

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['*'] },
        { name: 'My Profile', icon: UserIcon, path: '/profile', roles: ['*'] },
        { name: 'Organization', icon: Building2, path: '/organization', roles: ['Owner', 'Admin'] },
        { name: 'Employees', icon: Users, path: '/organization/employees', roles: ['admin', 'manager'] },
        { name: 'Org Chart', icon: Network, path: '/organization/chart', roles: ['admin', 'manager', 'employee'] },
        { name: 'Performance', icon: TrendingUp, path: '/dashboard/performance', roles: ['Owner', 'Admin', 'Manager'] },
        { name: 'Attendance', icon: Clock, path: '/dashboard/attendance', roles: ['admin', 'manager', 'employee'] },
        { name: 'Leaves', icon: Calendar, path: '/dashboard/leaves', roles: ['admin', 'manager', 'employee'] },
        { name: 'Roles & Permissions', icon: Shield, path: '/dashboard/roles', roles: ['admin'] },
        { name: 'Payroll', icon: DollarSign, path: '/dashboard/payroll', roles: ['Owner', 'Admin'] },
        { name: 'Recruitment (AI)', icon: BrainCircuit, path: '/dashboard/recruitment', roles: ['Owner', 'Admin', 'HR Manager'] },
        { name: 'Documents', icon: FileText, path: '/documents', roles: ['Employee', 'Owner'] },
        { name: 'Feed', icon: Rss, path: '/network/feed', roles: ['*'] },
        { name: 'Network', icon: Users, path: '/network/connections', roles: ['*'] },
        { name: 'Settings', icon: Settings, path: '/dashboard/settings', roles: ['admin'] },
    ];

    // Filter menu items based on role (Mock logic for now, refine with RBAC)
    // user.isSuperAdmin ? Allow All : check user.role in organization
    // Since user.role is not strictly in user object but implied by current org context.
    // We need to use `organization` context or `user.isSuperAdmin`.

    const filteredItems = menuItems.filter(item => {
        if (user?.isSuperAdmin) return true;
        if (item.roles.includes('*')) return true;
        // If we are in an org context, check permissions
        // For now, show all valid for 'User' if no org, else show Org specific
        return true; // Simplified for UI demo
    });

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside
                className={cn(
                    "flex flex-col border-r glass transition-all duration-300",
                    isSidebarOpen ? "w-64" : "w-16"
                )}
            >
                <div className="flex h-16 items-center justify-center border-b border-white/10 px-4">
                    {isSidebarOpen ? <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">SMARTHR</span> : <span className="font-bold text-primary">S</span>}
                </div>

                <nav className="flex-1 space-y-2 p-2">
                    {filteredItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                        >
                            <item.icon className="h-5 w-5" />
                            {isSidebarOpen && <span>{item.name}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="border-t border-white/10 p-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-accent"></div>
                        {isSidebarOpen && (
                            <div className="overflow-hidden">
                                <p className="truncate text-sm font-medium">{user?.profile?.firstName} {user?.profile?.lastName}</p>
                                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                            </div>
                        )}
                    </div>
                    <Button variant="outline" className="w-full justify-start border-white/20 hover:bg-white/10" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        {isSidebarOpen && "Logout"}
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 items-center justify-between border-b border-white/10 glass px-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <Briefcase className="h-5 w-5" />
                        </Button>
                        <h2 className="text-lg font-semibold">
                            {organization ? organization.name : 'Personal Dashboard'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Notifications & Theme Toggle would go here */}
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
