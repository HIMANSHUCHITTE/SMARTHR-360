import React, { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    Briefcase,
    CheckCircle2,
    MessageSquare,
    Users,
} from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';

const emptyRequestForm = {
    organizationName: '',
    industryType: '',
    organizationType: 'CORPORATE_IT',
    companySize: '',
    description: '',
};

const DashboardHome = () => {
    const {
        user,
        panel,
        organization,
        organizationRequestStatus,
        setOrganizationRequestStatus,
    } = useAuthStore();
    const [ownerRequestState, setOwnerRequestState] = useState(organizationRequestStatus || null);
    const [orgTypeOptions, setOrgTypeOptions] = useState([]);
    const [requestForm, setRequestForm] = useState(emptyRequestForm);
    const [loadingRequestState, setLoadingRequestState] = useState(false);
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    const [requestError, setRequestError] = useState('');

    const firstName = user?.profile?.firstName || 'User';
    const activePanel = panel || (user?.isSuperAdmin ? 'SUPERADMIN' : organization ? 'SUBADMIN' : 'USER');
    const needsOwnerOnboarding = activePanel === 'OWNER' && !organization?.id && !organization?._id;

    useEffect(() => {
        if (!needsOwnerOnboarding) return;

        const loadOwnerState = async () => {
            setLoadingRequestState(true);
            setRequestError('');
            try {
                const [stateResp, typesResp] = await Promise.all([
                    api.get('/auth/organization-request/me'),
                    api.get('/auth/organization-types'),
                ]);

                const stateData = stateResp.data || null;
                setOwnerRequestState(stateData);
                setOrganizationRequestStatus(stateData?.request || null);

                const options = Array.isArray(typesResp.data?.organizationTypes)
                    ? typesResp.data.organizationTypes
                    : [];
                setOrgTypeOptions(options);

                if (stateData?.request) {
                    setRequestForm({
                        organizationName: stateData.request.organizationName || '',
                        industryType: stateData.request.industryType || '',
                        organizationType: stateData.request.organizationType || options?.[0]?.type || 'CORPORATE_IT',
                        companySize: stateData.request.companySize || '',
                        description: stateData.request.description || '',
                    });
                } else if (options.length > 0) {
                    setRequestForm((prev) => ({
                        ...prev,
                        organizationType: prev.organizationType || options[0].type,
                    }));
                }
            } catch (error) {
                setRequestError(error.response?.data?.message || 'Failed to load organization request state');
            } finally {
                setLoadingRequestState(false);
            }
        };

        loadOwnerState();
    }, [needsOwnerOnboarding, setOrganizationRequestStatus]);

    const submitOrganizationRequest = async () => {
        setRequestError('');
        const required = ['organizationName', 'industryType', 'organizationType', 'companySize'];
        const hasMissing = required.some((field) => !String(requestForm[field] || '').trim());
        if (hasMissing) {
            setRequestError('Please fill all required organization request fields.');
            return;
        }

        try {
            setRequestSubmitting(true);
            const { data } = await api.post('/auth/organization-request', requestForm);
            const request = data?.request;
            const nextState = {
                state: 'PENDING',
                modulesUnlocked: false,
                request: request ? {
                    id: request._id,
                    organizationName: request.organizationName,
                    organizationType: request.organizationType,
                    industryType: request.industryType,
                    companySize: request.companySize,
                    description: request.description,
                    status: request.status,
                    rejectionReason: '',
                    revision: request.revision,
                    createdAt: request.createdAt,
                } : null,
            };
            setOwnerRequestState(nextState);
            setOrganizationRequestStatus(nextState.request);
        } catch (error) {
            setRequestError(error.response?.data?.message || 'Failed to submit organization request');
        } finally {
            setRequestSubmitting(false);
        }
    };

    const stats = [
        { label: 'Open Tasks', value: '0', icon: CheckCircle2, color: 'from-blue-500 to-cyan-500' },
        { label: 'Unread Messages', value: '0', icon: MessageSquare, color: 'from-amber-500 to-orange-500' },
        { label: 'Team Members', value: ['OWNER'].includes(activePanel) ? '0' : '-', icon: Users, color: 'from-pink-500 to-rose-500' },
        { label: 'Employments', value: user?.employment?.status === 'ACTIVE' ? '1' : '0', icon: Briefcase, color: 'from-violet-500 to-purple-500' },
    ];

    const activities = [
        { action: 'No recent activity yet', time: 'Start by updating profile/settings', color: 'bg-emerald-500' },
    ];

    const requestBanner = useMemo(() => {
        if (!ownerRequestState) return null;
        if (ownerRequestState.state === 'PENDING') {
            return {
                title: 'Organization request is under review',
                description: 'SuperAdmin approval pending. HR modules will unlock after approval.',
                tone: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
            };
        }
        if (ownerRequestState.state === 'REJECTED') {
            return {
                title: 'Organization request was rejected',
                description: ownerRequestState.request?.rejectionReason || 'Please update details and re-apply.',
                tone: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200',
            };
        }
        return null;
    }, [ownerRequestState]);

    const pageContainerClass = 'mx-auto w-full max-w-4xl space-y-6 xl:max-w-6xl 2xl:max-w-7xl';

    if (needsOwnerOnboarding) {
        return (
            <div className={pageContainerClass}>
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-6">
                    <h1 className="text-2xl font-bold">Owner Onboarding</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Welcome {firstName}. Submit organization details for SuperAdmin approval.
                    </p>
                </div>

                {loadingRequestState ? (
                    <div className="rounded-xl border p-4 text-sm text-muted-foreground">Loading organization request state...</div>
                ) : (
                    <>
                        {requestBanner && (
                            <div className={`rounded-xl border p-4 text-sm ${requestBanner.tone}`}>
                                <p className="font-semibold">{requestBanner.title}</p>
                                <p className="mt-1">{requestBanner.description}</p>
                            </div>
                        )}

                        {(ownerRequestState?.state === 'NO_REQUEST' || ownerRequestState?.state === 'REJECTED' || !ownerRequestState) && (
                            <div className="space-y-3 rounded-2xl border bg-card p-5">
                                <h2 className="text-lg font-semibold">
                                    {ownerRequestState?.state === 'REJECTED' ? 'Re-Apply Organization Request' : 'Create Organization Request'}
                                </h2>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="grid gap-1">
                                        <Label>Organization Name</Label>
                                        <Input
                                            value={requestForm.organizationName}
                                            onChange={(e) => setRequestForm((s) => ({ ...s, organizationName: e.target.value }))}
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label>Industry Type</Label>
                                        <Input
                                            value={requestForm.industryType}
                                            onChange={(e) => setRequestForm((s) => ({ ...s, industryType: e.target.value }))}
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label>Organization Type</Label>
                                        <select
                                            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                                            value={requestForm.organizationType}
                                            onChange={(e) => setRequestForm((s) => ({ ...s, organizationType: e.target.value }))}
                                        >
                                            {orgTypeOptions.map((item) => (
                                                <option key={item.type} value={item.type}>{item.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid gap-1">
                                        <Label>Company Size</Label>
                                        <Input
                                            value={requestForm.companySize}
                                            onChange={(e) => setRequestForm((s) => ({ ...s, companySize: e.target.value }))}
                                            placeholder="1-10, 11-50..."
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-1">
                                    <Label>Description</Label>
                                    <textarea
                                        className="min-h-[90px] rounded-md border border-border bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground"
                                        value={requestForm.description}
                                        onChange={(e) => setRequestForm((s) => ({ ...s, description: e.target.value }))}
                                    />
                                </div>
                                {requestError && <p className="text-sm text-red-600 dark:text-red-300">{requestError}</p>}
                                <Button onClick={submitOrganizationRequest} isLoading={requestSubmitting} disabled={requestSubmitting}>
                                    Submit For Approval
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }

    return (
        <div className={pageContainerClass}>
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-foreground shadow-sm">
                <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900/40 dark:to-blue-900/30"></div>
                <div className="relative z-10">
                    <h1 className="mb-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
                        Welcome, <span className="bg-gradient-to-r from-blue-700 to-slate-700 bg-clip-text text-transparent dark:from-blue-300 dark:to-slate-200">{firstName}</span>
                    </h1>
                    <p className="max-w-2xl text-lg text-muted-foreground">
                        New account ke liye koi dummy details nahi rakhi gayi hain. Apni details manually profile aur settings se add karein.
                    </p>
                </div>
                <div className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-blue-100/70 blur-3xl dark:bg-blue-500/20"></div>
            </div>

            <div className="stagger-children grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:scale-[1.01] hover:shadow-md">
                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-[0.06] transition-opacity group-hover:opacity-[0.1]`}></div>
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h3 className="text-sm font-medium tracking-tight text-muted-foreground">{stat.label}</h3>
                            <stat.icon className="h-6 w-6 text-foreground opacity-90 transition-transform group-hover:scale-110" />
                        </div>
                        <div className="pt-2">
                            <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                            <p className="mt-1 text-xs text-muted-foreground">Live value</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
                    <Activity className="h-5 w-5 text-primary" />
                    Recent Activity
                </h3>
                <div className="space-y-6">
                    {activities.map((item, index) => (
                        <div key={index} className="group flex items-center gap-4">
                            <div className={`h-3 w-3 ${item.color} rounded-full ring-4 ring-slate-100 transition-all group-hover:ring-slate-200 dark:ring-slate-700/40 dark:group-hover:ring-slate-600/50`}></div>
                            <div>
                                <p className="text-sm font-medium text-foreground">{item.action}</p>
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
