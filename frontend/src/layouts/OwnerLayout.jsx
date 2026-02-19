import React, { useMemo } from 'react';
import {
    LayoutDashboard, Building2, Users, Rss, User, Settings, LifeBuoy, Bell, Upload,
} from 'lucide-react';
import PanelShell from './PanelShell';
import { useAuthStore } from '../store/authStore';

const fullMenuItems = [
    { label: 'Dashboard', path: '/owner/dashboard', icon: LayoutDashboard },
    { label: 'Profile', path: '/owner/profile', icon: User },
    { label: 'Organization', path: '/owner/organization', icon: Building2 },
    { label: 'Content Upload', path: '/owner/content-upload', icon: Upload },
    { label: 'Feed', path: '/owner/feed', icon: Rss },
    { label: 'Network', path: '/owner/network', icon: Users },
    { label: 'Notifications', path: '/owner/notifications', icon: Bell },
    { label: 'Help', path: '/owner/help', icon: LifeBuoy },
    { label: 'Settings', path: '/owner/settings', icon: Settings },
];

const onboardingMenuItems = [
    { label: 'Dashboard', path: '/owner/dashboard', icon: LayoutDashboard },
    { label: 'Profile', path: '/owner/profile', icon: User },
    { label: 'Content Upload', path: '/owner/content-upload', icon: Upload },
    { label: 'Feed', path: '/owner/feed', icon: Rss },
    { label: 'Notifications', path: '/owner/notifications', icon: Bell },
    { label: 'Help', path: '/owner/help', icon: LifeBuoy },
    { label: 'Settings', path: '/owner/settings', icon: Settings },
];

const OwnerLayout = () => {
    const organization = useAuthStore((state) => state.organization);
    const hasApprovedOrganization = Boolean(organization?.id || organization?._id);

    const menuItems = useMemo(
        () => (hasApprovedOrganization ? fullMenuItems : onboardingMenuItems),
        [hasApprovedOrganization]
    );

    return (
        <PanelShell
            panelName="Owner Panel"
            brand="SMARTHR-360"
            subtitle={hasApprovedOrganization ? 'Company Control Center' : 'Organization Approval Onboarding'}
            menuItems={menuItems}
        />
    );
};

export default OwnerLayout;
