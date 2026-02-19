import React from 'react';
import { LayoutDashboard, Settings, LifeBuoy } from 'lucide-react';
import PanelShell from './PanelShell';

const menuItems = [
    { label: 'Dashboard', path: '/superadmin/dashboard', icon: LayoutDashboard },
    { label: 'Help', path: '/superadmin/help', icon: LifeBuoy },
    { label: 'Settings', path: '/superadmin/settings', icon: Settings },
];

const SuperAdminLayout = () => (
    <PanelShell
        panelName="SuperAdmin Panel"
        brand="SMARTHR-360"
        subtitle="Platform Governance"
        menuItems={menuItems}
    />
);

export default SuperAdminLayout;
