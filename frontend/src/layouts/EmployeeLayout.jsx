import React from 'react';
import { LayoutDashboard, User, Clock, Calendar, FileText, Rss, Users, Settings, LifeBuoy, MessageCircle } from 'lucide-react';
import PanelShell from './PanelShell';

const menuItems = [
    { label: 'Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
    { label: 'Profile', path: '/employee/profile', icon: User },
    { label: 'Attendance', path: '/employee/attendance', icon: Clock },
    { label: 'Leaves', path: '/employee/leaves', icon: Calendar },
    { label: 'Documents', path: '/employee/documents', icon: FileText },
    { label: 'Feed', path: '/employee/feed', icon: Rss },
    { label: 'Network', path: '/employee/network', icon: Users },
    { label: 'Chat', path: '/employee/chat', icon: MessageCircle },
    { label: 'Help', path: '/employee/help', icon: LifeBuoy },
    { label: 'Settings', path: '/employee/settings', icon: Settings },
];

const EmployeeLayout = () => (
    <PanelShell
        panelName="Employee Panel"
        brand="SMARTHR-360"
        subtitle="Organization Work Dashboard"
        menuItems={menuItems}
    />
);

export default EmployeeLayout;
