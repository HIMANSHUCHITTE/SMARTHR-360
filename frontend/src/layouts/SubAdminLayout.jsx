import React from 'react';
import {
    LayoutDashboard, Clock, Calendar, FileText, Rss, User, Settings, LifeBuoy, MessageCircle, Users,
} from 'lucide-react';
import PanelShell from './PanelShell';

const menuItems = [
    { label: 'Dashboard', path: '/subadmin/dashboard', icon: LayoutDashboard },
    { label: 'Profile', path: '/subadmin/profile', icon: User },
    { label: 'Attendance', path: '/subadmin/attendance', icon: Clock },
    { label: 'Leaves', path: '/subadmin/leaves', icon: Calendar },
    { label: 'Documents', path: '/subadmin/documents', icon: FileText },
    { label: 'Feed', path: '/subadmin/feed', icon: Rss },
    { label: 'Network', path: '/subadmin/network', icon: Users },
    { label: 'Chat', path: '/subadmin/chat', icon: MessageCircle },
    { label: 'Help', path: '/subadmin/help', icon: LifeBuoy },
    { label: 'Settings', path: '/subadmin/settings', icon: Settings },
];

const SubAdminLayout = () => (
    <PanelShell
        panelName="Employee Panel"
        brand="SMARTHR-360"
        subtitle="Organization Work Dashboard"
        menuItems={menuItems}
    />
);

export default SubAdminLayout;
