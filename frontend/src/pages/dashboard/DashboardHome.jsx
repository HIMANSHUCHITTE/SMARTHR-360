import React, { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    Briefcase,
    CalendarCheck2,
    CheckCircle2,
    Clock3,
    MessageSquare,
    PieChart,
    Users,
    Wallet,
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

const clampPercent = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(100, num));
};

const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

const getRecentMonths = (count = 6) => {
    const months = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: d.toLocaleString('en-US', { month: 'short' }),
        });
    }
    return months;
};

const getAttendanceWeight = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'PRESENT' || normalized === 'LATE') return 1;
    if (normalized === 'HALF_DAY') return 0.5;
    return 0;
};

const getLeaveDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const ms = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
    const days = Math.floor(ms / 86400000) + 1;
    return days > 0 ? days : 0;
};

const formatCurrencyCompact = (value) => {
    const amount = toNumber(value);
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(amount);
};

const leaveTypeLabel = {
    CASUAL: 'Casual Leave',
    SICK: 'Sick Leave',
    EARNED: 'Earned Leave',
    UNPAID: 'Unpaid Leave',
};

const DashboardHome = () => {
    const {
        user,
        panel,
        organization,
        organizationRequestStatus,
        setOrganizationRequestStatus,
        setOrganization,
    } = useAuthStore();
    const [ownerRequestState, setOwnerRequestState] = useState(organizationRequestStatus || null);
    const [orgTypeOptions, setOrgTypeOptions] = useState([]);
    const [requestForm, setRequestForm] = useState(emptyRequestForm);
    const [loadingRequestState, setLoadingRequestState] = useState(false);
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    const [requestError, setRequestError] = useState('');
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState('');
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [leaveLogs, setLeaveLogs] = useState([]);
    const [payrollSummary, setPayrollSummary] = useState(null);

    const firstName = user?.profile?.firstName || 'User';
    const activePanel = panel || (user?.isSuperAdmin ? 'SUPERADMIN' : organization ? 'SUBADMIN' : 'USER');
    const hasActiveOrganization = Boolean(organization?.id || organization?._id);
    const needsOrganizationOnboarding = !hasActiveOrganization && activePanel === 'OWNER';
    const isUserPanel = activePanel === 'USER';

    useEffect(() => {
        if (!needsOrganizationOnboarding) return;

        const loadOwnerState = async ({ silent = false } = {}) => {
            if (!silent) {
                setLoadingRequestState(true);
            }
            setRequestError('');
            try {
                const [stateResp, typesResp] = await Promise.all([
                    api.get('/auth/organization-request/me'),
                    api.get('/auth/organization-types'),
                ]);

                const stateData = stateResp.data || null;
                setOwnerRequestState(stateData);
                setOrganizationRequestStatus(stateData?.request || null);
                if (stateData?.state === 'APPROVED' && stateData?.organization) {
                    setOrganization(stateData.organization);
                    if (typeof window !== 'undefined' && stateData.organization.id) {
                        localStorage.setItem('owner-active-organization-id', String(stateData.organization.id));
                    }
                }

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
                if (!silent) {
                    setLoadingRequestState(false);
                }
            }
        };

        loadOwnerState();
        const intervalId = setInterval(() => loadOwnerState({ silent: true }), 15000);
        return () => clearInterval(intervalId);
    }, [needsOrganizationOnboarding, setOrganization, setOrganizationRequestStatus]);

    useEffect(() => {
        if (!isUserPanel) return;
        if (!hasActiveOrganization) {
            setAttendanceLogs([]);
            setLeaveLogs([]);
            setPayrollSummary(null);
            setAnalyticsError('Organization context missing. Join or switch organization to view live analytics.');
            return;
        }

        const loadUserAnalytics = async () => {
            setAnalyticsLoading(true);
            setAnalyticsError('');
            try {
                const [attendanceResp, leavesResp, payrollResp] = await Promise.allSettled([
                    api.get('/attendance/me'),
                    api.get('/leaves/me'),
                    api.get('/payroll/me'),
                ]);

                setAttendanceLogs(
                    attendanceResp.status === 'fulfilled' && Array.isArray(attendanceResp.value.data)
                        ? attendanceResp.value.data
                        : []
                );
                setLeaveLogs(
                    leavesResp.status === 'fulfilled' && Array.isArray(leavesResp.value.data)
                        ? leavesResp.value.data
                        : []
                );
                setPayrollSummary(payrollResp.status === 'fulfilled' ? (payrollResp.value.data || null) : null);

                const allFailed =
                    attendanceResp.status === 'rejected' &&
                    leavesResp.status === 'rejected' &&
                    payrollResp.status === 'rejected';
                if (allFailed) {
                    setAnalyticsError('Unable to load analytics right now.');
                }
            } catch (error) {
                setAnalyticsError(error?.response?.data?.message || 'Unable to load analytics');
            } finally {
                setAnalyticsLoading(false);
            }
        };

        loadUserAnalytics();
    }, [isUserPanel, hasActiveOrganization]);

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

    const profileSummary = useMemo(() => {
        const profile = user?.profile || {};
        const employment = user?.employment || {};
        return [
            { label: 'Name', value: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Not added' },
            { label: 'Email', value: user?.email || 'Not added' },
            { label: 'Phone', value: profile.phone || 'Not added' },
            { label: 'Designation', value: payrollSummary?.employment?.designation || employment.designation || 'Pending update' },
            { label: 'Department', value: payrollSummary?.employment?.department || employment.department || 'Pending assignment' },
            { label: 'Location', value: employment.location || profile.location || 'Not added' },
        ];
    }, [user, payrollSummary]);

    const attendanceSeries = useMemo(() => {
        const months = getRecentMonths(6);
        const monthMap = new Map(months.map((month) => [month.key, { weighted: 0, total: 0 }]));

        attendanceLogs.forEach((log) => {
            const d = new Date(log.date);
            if (Number.isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthMap.has(key)) return;
            const entry = monthMap.get(key);
            entry.weighted += getAttendanceWeight(log.status);
            entry.total += 1;
        });

        return months.map((month) => {
            const bucket = monthMap.get(month.key);
            const rate = bucket.total > 0 ? Math.round((bucket.weighted / bucket.total) * 100) : 0;
            return {
                month: month.label,
                rate: clampPercent(rate),
                hasData: bucket.total > 0,
            };
        });
    }, [attendanceLogs]);

    const attendanceScore = useMemo(() => {
        const latest = attendanceSeries[attendanceSeries.length - 1];
        return latest?.rate || 0;
    }, [attendanceSeries]);

    const leaveUsage = useMemo(() => {
        const year = new Date().getFullYear();
        const tally = {
            CASUAL: 0,
            SICK: 0,
            EARNED: 0,
            UNPAID: 0,
        };

        leaveLogs.forEach((row) => {
            const type = String(row?.type || '').toUpperCase();
            if (!Object.prototype.hasOwnProperty.call(tally, type)) return;
            if (String(row?.status || '').toUpperCase() !== 'APPROVED') return;
            const start = new Date(row.startDate);
            if (Number.isNaN(start.getTime()) || start.getFullYear() !== year) return;
            tally[type] += getLeaveDays(row.startDate, row.endDate);
        });

        return Object.keys(tally).map((type) => ({
            type,
            label: leaveTypeLabel[type] || `${type} Leave`,
            usedDays: tally[type],
            colorClass:
                type === 'CASUAL'
                    ? 'bg-blue-500'
                    : type === 'SICK'
                        ? 'bg-emerald-500'
                        : type === 'EARNED'
                            ? 'bg-amber-500'
                            : 'bg-slate-500',
        }));
    }, [leaveLogs]);

    const maxLeaveUsageDays = useMemo(
        () => Math.max(...leaveUsage.map((row) => row.usedDays), 1),
        [leaveUsage]
    );

    const totalApprovedLeaveDays = useMemo(
        () => leaveUsage.reduce((sum, row) => sum + row.usedDays, 0),
        [leaveUsage]
    );

    const salaryBreakdown = useMemo(() => {
        const basic = toNumber(payrollSummary?.salaryBreakdown?.basicSalary);
        const allowances = toNumber(payrollSummary?.salaryBreakdown?.allowanceTotal);
        const deductions = toNumber(payrollSummary?.salaryBreakdown?.deductionTotal);
        const total = basic + allowances + deductions;

        const rows = [
            { label: 'Base', value: basic, color: '#2563eb' },
            { label: 'Allowances', value: allowances, color: '#16a34a' },
            { label: 'Deductions', value: deductions, color: '#dc2626' },
        ];

        return rows.map((row) => ({
            ...row,
            percent: total > 0 ? clampPercent((row.value / total) * 100) : 0,
        }));
    }, [payrollSummary]);

    const pieBackground = useMemo(() => {
        const totalPercent = salaryBreakdown.reduce((sum, slice) => sum + slice.percent, 0);
        if (totalPercent <= 0) {
            return 'conic-gradient(#e2e8f0 0deg 360deg)';
        }

        let currentStart = 0;
        const slices = salaryBreakdown.map((item) => {
            const next = currentStart + item.percent * 3.6;
            const slice = `${item.color} ${currentStart}deg ${next}deg`;
            currentStart = next;
            return slice;
        });
        return `conic-gradient(${slices.join(', ')})`;
    }, [salaryBreakdown]);

    if (isUserPanel) {
        return (
            <div className={pageContainerClass}>
                <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-100 dark:from-cyan-900/20 dark:via-sky-900/20 dark:to-blue-900/20"></div>
                    <div className="relative z-10 space-y-3">
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Welcome back, {firstName}</h1>
                        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                            Profile summary aur analytics ab live organization records se aa rahe hain.
                        </p>
                    </div>
                </div>

                {analyticsError && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                        {analyticsError}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-card p-5">
                        <p className="text-sm text-muted-foreground">Attendance Score</p>
                        <div className="mt-2 flex items-end justify-between">
                            <p className="text-3xl font-bold">{attendanceScore}%</p>
                            <CalendarCheck2 className="h-7 w-7 text-blue-600" />
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-5">
                        <p className="text-sm text-muted-foreground">Approved Leaves (YTD)</p>
                        <div className="mt-2 flex items-end justify-between">
                            <p className="text-3xl font-bold">{totalApprovedLeaveDays}</p>
                            <Clock3 className="h-7 w-7 text-emerald-600" />
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-5">
                        <p className="text-sm text-muted-foreground">Latest Net Pay</p>
                        <div className="mt-2 flex items-end justify-between">
                            <p className="text-3xl font-bold">{formatCurrencyCompact(payrollSummary?.salaryBreakdown?.netPayable)}</p>
                            <Wallet className="h-7 w-7 text-amber-600" />
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <section className="rounded-2xl border border-border bg-card p-6">
                        <h2 className="mb-4 text-lg font-semibold">Profile Summary</h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {profileSummary.map((item) => (
                                <div key={item.label} className="rounded-xl border border-border/70 bg-background/60 p-3">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                                    <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-6">
                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                            <Activity className="h-5 w-5 text-blue-600" /> Attendance Graph
                        </h2>
                        <div className="flex h-56 items-end justify-between gap-3">
                            {attendanceSeries.map((point) => (
                                <div key={point.month} className="flex flex-1 flex-col items-center gap-2">
                                    <div className="flex h-full w-full items-end rounded-full bg-slate-100 dark:bg-slate-800">
                                        <div
                                            className="w-full rounded-full bg-gradient-to-t from-blue-600 to-cyan-400"
                                            style={{ height: `${Math.max(point.rate, point.hasData ? 8 : 0)}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{point.month}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <section className="rounded-2xl border border-border bg-card p-6">
                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Leave Usage Chart
                        </h2>
                        <div className="space-y-4">
                            {leaveUsage.map((leave) => {
                                const usedPercent = clampPercent((leave.usedDays / maxLeaveUsageDays) * 100);
                                return (
                                    <div key={leave.type}>
                                        <div className="mb-1 flex items-center justify-between text-sm">
                                            <p className="font-medium">{leave.label}</p>
                                            <p className="text-muted-foreground">{leave.usedDays} day(s)</p>
                                        </div>
                                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div className={`h-full rounded-full ${leave.colorClass}`} style={{ width: `${usedPercent}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-6">
                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                            <PieChart className="h-5 w-5 text-amber-600" /> Salary Breakdown
                        </h2>
                        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-between">
                            <div
                                className="relative h-44 w-44 rounded-full"
                                style={{ background: pieBackground }}
                                aria-label="Salary breakdown pie chart"
                            >
                                <div className="absolute inset-8 rounded-full bg-card"></div>
                            </div>
                            <div className="w-full space-y-2 sm:max-w-[220px]">
                                {salaryBreakdown.map((slice) => (
                                    <div key={slice.label} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }}></span>
                                            <span>{slice.label}</span>
                                        </div>
                                        <span className="font-medium">
                                            {slice.percent ? `${slice.percent.toFixed(1)}%` : '0%'}
                                        </span>
                                    </div>
                                ))}
                                {!payrollSummary?.latestPayroll && (
                                    <p className="pt-1 text-xs text-muted-foreground">No payroll record found for this user.</p>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {analyticsLoading && (
                    <p className="text-sm text-muted-foreground">Loading live analytics...</p>
                )}
            </div>
        );
    }

    if (needsOrganizationOnboarding) {
        return (
            <div className={pageContainerClass}>
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-6">
                    <h1 className="text-2xl font-bold">Organization Onboarding</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Welcome {firstName}. Organization request submit karein, approval ke baad owner workspace unlock hoga.
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
                    {activities.map((item) => (
                        <div key={item.action} className="group flex items-center gap-4">
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
