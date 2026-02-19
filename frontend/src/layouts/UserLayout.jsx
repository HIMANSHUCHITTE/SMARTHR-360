import React from 'react';
import { LayoutDashboard, User, Rss, Users, Settings, LifeBuoy, Briefcase, MessageCircle } from 'lucide-react';
import PanelShell from './PanelShell';

const menuItems = [
    { label: 'Dashboard', path: '/user/dashboard', icon: LayoutDashboard },
    { label: 'Profile', path: '/user/profile', icon: User },
    { label: 'Jobs', path: '/user/jobs', icon: Briefcase },
    { label: 'Feed', path: '/user/feed', icon: Rss },
    { label: 'Network', path: '/user/network', icon: Users },
    { label: 'Chat', path: '/user/chat', icon: MessageCircle },
    { label: 'Help', path: '/user/help', icon: LifeBuoy },
    { label: 'Settings', path: '/user/settings', icon: Settings },
];

const UserLayout = () => (
    <PanelShell
        panelName="User Panel"
        brand="SMARTHR-360"
        subtitle="Personal Work Dashboard"
        menuItems={menuItems}
    />
);

export default UserLayout;
