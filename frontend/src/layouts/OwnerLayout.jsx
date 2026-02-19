import React from 'react';
import {
    LayoutDashboard, Building2, Users, Shield, DollarSign, BrainCircuit, Network, TrendingUp, Rss, User, Settings, LifeBuoy, MessageCircle,
} from 'lucide-react';
import PanelShell from './PanelShell';

const menuItems = [
    { label: 'Dashboard', path: '/owner/dashboard', icon: LayoutDashboard },
    { label: 'Profile', path: '/owner/profile', icon: User },
    { label: 'Organization', path: '/owner/organization', icon: Building2 },
    { label: 'Employees', path: '/owner/employees', icon: Users },
    { label: 'Roles', path: '/owner/roles', icon: Shield },
    { label: 'Payroll', path: '/owner/payroll', icon: DollarSign },
    { label: 'Recruitment', path: '/owner/recruitment', icon: BrainCircuit },
    { label: 'Org Chart', path: '/owner/org-chart', icon: Network },
    { label: 'Performance', path: '/owner/performance', icon: TrendingUp },
    { label: 'Feed', path: '/owner/feed', icon: Rss },
    { label: 'Network', path: '/owner/network', icon: Users },
    { label: 'Chat', path: '/owner/chat', icon: MessageCircle },
    { label: 'Help', path: '/owner/help', icon: LifeBuoy },
    { label: 'Settings', path: '/owner/settings', icon: Settings },
];

const OwnerLayout = () => (
    <PanelShell
        panelName="Owner Panel"
        brand="SMARTHR-360"
        subtitle="Company Control Center"
        menuItems={menuItems}
    />
);

export default OwnerLayout;
