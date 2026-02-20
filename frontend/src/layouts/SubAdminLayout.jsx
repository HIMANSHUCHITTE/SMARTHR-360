import React from 'react';
import {
    LayoutDashboard,
    Clock,
    Calendar,
    FileText,
    Rss,
    User,
    Settings,
    LifeBuoy,
    MessageCircle,
    Users,
    Bell,
    Upload,
    Building2,
    Shield,
    DollarSign,
    BrainCircuit,
    Network,
    TrendingUp,
} from 'lucide-react';
import PanelShell from './PanelShell';

const menuItems = [
    { label: 'Dashboard', path: '/subadmin/dashboard', icon: LayoutDashboard },
    { label: 'Profile', path: '/subadmin/profile', icon: User },
    { label: 'Organization', path: '/subadmin/organization', icon: Building2 },
    { label: 'Employees', path: '/subadmin/employees', icon: Users },
    { label: 'Roles', path: '/subadmin/roles', icon: Shield },
    { label: 'Payroll', path: '/subadmin/payroll', icon: DollarSign },
    { label: 'Recruitment', path: '/subadmin/recruitment', icon: BrainCircuit },
    { label: 'Org Chart', path: '/subadmin/org-chart', icon: Network },
    { label: 'Performance', path: '/subadmin/performance', icon: TrendingUp },
    { label: 'Attendance', path: '/subadmin/attendance', icon: Clock },
    { label: 'Leaves', path: '/subadmin/leaves', icon: Calendar },
    { label: 'Documents', path: '/subadmin/documents', icon: FileText },
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
