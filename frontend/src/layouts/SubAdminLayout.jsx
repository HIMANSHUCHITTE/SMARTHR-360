import React from 'react';
import {
    LayoutDashboard,
    LayoutGrid,
    Rss,
    User,
    Settings,
    LifeBuoy,
    MessageCircle,
    Users,
    Bell,
    Upload,
    Briefcase,
} from 'lucide-react';
import PanelShell from './PanelShell';

const menuItems = [
    { label: 'Dashboard', path: '/subadmin/dashboard', icon: LayoutDashboard },
    { label: 'Workarea', path: '/subadmin/workarea', icon: LayoutGrid },
    { label: 'Profile', path: '/subadmin/profile', icon: User },
    { label: 'Jobs', path: '/subadmin/jobs', icon: Briefcase },
    { label: 'Content Upload', path: '/subadmin/content-upload', icon: Upload },
    { label: 'Feed', path: '/subadmin/feed', icon: Rss },
    { label: 'Network', path: '/subadmin/network', icon: Users },
    { label: 'Notifications', path: '/subadmin/notifications', icon: Bell },
    { label: 'Chat', path: '/subadmin/chat', icon: MessageCircle },
    { label: 'Help', path: '/subadmin/help', icon: LifeBuoy },
    { label: 'Settings', path: '/subadmin/settings', icon: Settings },
];

const SubAdminLayout = () => (
    <PanelShell
        panelName="SubAdmin Panel"
        brand="SMARTHR-360"
        subtitle="HRMS Operations Dashboard"
        menuItems={menuItems}
    />
);

export default SubAdminLayout;
