import React from 'react';
import { useAuthStore } from '../../store/authStore';
import {
    Briefcase,
    CheckCircle2,
    MessageSquare,
    Users,
    Activity,
} from 'lucide-react';

const DashboardHome = () => {
    const { user, panel, organization } = useAuthStore();

    const firstName = user?.profile?.firstName || 'User';
    const activePanel = panel || (user?.isSuperAdmin ? 'SUPERADMIN' : organization ? 'SUBADMIN' : 'USER');

    const stats = [
        { label: 'Open Tasks', value: '0', icon: CheckCircle2, color: 'from-blue-500 to-cyan-500' },
        { label: 'Unread Messages', value: '0', icon: MessageSquare, color: 'from-amber-500 to-orange-500' },
        { label: 'Team Members', value: ['OWNER'].includes(activePanel) ? '0' : '-', icon: Users, color: 'from-pink-500 to-rose-500' },
        { label: 'Employments', value: user?.employment?.status === 'ACTIVE' ? '1' : '0', icon: Briefcase, color: 'from-violet-500 to-purple-500' },
    ];

    const activities = [
        { action: 'No recent activity yet', time: 'Start by updating profile/settings', color: 'bg-emerald-500' },
    ];

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl glass-card p-8 text-white shadow-2xl">
                <div className="absolute inset-0 z-0 bg-gradient-to-r from-violet-600/50 to-rose-600/50"></div>
                <div className="relative z-10">
                    <h1 className="mb-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
                        Welcome, <span className="bg-gradient-to-r from-violet-200 to-rose-200 bg-clip-text text-transparent">{firstName}</span>
                    </h1>
                    <p className="max-w-2xl text-lg text-violet-100">
                        New account ke liye koi dummy details nahi rakhi gayi hain. Apni details manually profile aur settings se add karein.
                    </p>
                </div>
                <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
            </div>

            <div className="stagger-children grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="group relative overflow-hidden rounded-2xl glass-card p-6 transition-all hover:scale-[1.02] hover:shadow-xl">
                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 transition-opacity group-hover:opacity-10`}></div>
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h3 className="text-sm font-medium tracking-tight text-muted-foreground">{stat.label}</h3>
                            <stat.icon className="h-6 w-6 opacity-80 transition-transform group-hover:scale-110" />
                        </div>
                        <div className="pt-2">
                            <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                            <p className="mt-1 text-xs text-muted-foreground">Live value</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl glass-card p-6">
                    <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
                        <Activity className="h-5 w-5 text-primary" />
                        Recent Activity
                    </h3>
                    <div className="space-y-6">
                        {activities.map((item, index) => (
                            <div key={index} className="group flex items-center gap-4">
                                <div className={`h-3 w-3 ${item.color} rounded-full ring-4 ring-white/10 transition-all group-hover:ring-white/20`}></div>
                                <div>
                                    <p className="text-sm font-medium">{item.action}</p>
                                    <p className="text-xs text-muted-foreground">{item.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
            </div>
        </div>
    );
};

export default DashboardHome;
