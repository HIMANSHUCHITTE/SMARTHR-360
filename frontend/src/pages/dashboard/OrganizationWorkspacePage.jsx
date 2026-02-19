import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Building2,
    Users,
    Shield,
    DollarSign,
    BrainCircuit,
    Network,
    TrendingUp,
    Loader2,
    Wallet,
    CalendarDays,
} from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

const moduleCards = [
    { label: 'Employees', path: '/owner/employees', icon: Users, description: 'Add employees and manage salary/profile details.' },
    { label: 'Roles', path: '/owner/roles', icon: Shield, description: 'Type-based hierarchy levels and position powers.' },
    { label: 'Payroll', path: '/owner/payroll', icon: DollarSign, description: 'Track total paid, pending payroll and payout status.' },
    { label: 'Recruitment', path: '/owner/recruitment', icon: BrainCircuit, description: 'Hiring pipeline and AI-backed candidate evaluation.' },
    { label: 'Org Chart', path: '/owner/org-chart', icon: Network, description: 'Reporting structure linked to this organization.' },
    { label: 'Performance', path: '/owner/performance', icon: TrendingUp, description: 'Performance and appraisal readiness monitoring.' },
];

const OrganizationWorkspacePage = () => {
    const { organizationId } = useParams();
    const navigate = useNavigate();
    const { organization, setOrganization, setToken } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [hierarchy, setHierarchy] = useState(null);
    const [kpis, setKpis] = useState(null);
    const [roles, setRoles] = useState([]);
    const [orgTemplates, setOrgTemplates] = useState([]);
    const [error, setError] = useState('');

    const ensureOrganizationContext = async () => {
        if (!organizationId) return;

        const activeId = String(organization?.id || organization?._id || '');
        if (activeId !== String(organizationId)) {
            const { data: switchData } = await api.post('/auth/switch-organization', { organizationId });
            if (switchData?.accessToken) setToken(switchData.accessToken);
        }

        const { data: orgData } = await api.get('/organization');
        setOrganization(orgData);
    };

    const loadWorkspace = async () => {
        setLoading(true);
        setError('');
        try {
            await ensureOrganizationContext();
            const [hierarchyResp, kpiResp, roleResp, typeResp] = await Promise.all([
                api.get('/organization/hierarchy'),
                api.get('/owner/strategic-dashboard'),
                api.get('/roles'),
                api.get('/auth/organization-types'),
            ]);
            setHierarchy(hierarchyResp.data || null);
            setKpis(kpiResp.data || null);
            setRoles(Array.isArray(roleResp.data) ? roleResp.data : []);
            setOrgTemplates(Array.isArray(typeResp.data?.organizationTypes) ? typeResp.data.organizationTypes : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to open organization workspace');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWorkspace();
    }, [organizationId]);

    const hierarchyLevels = useMemo(() => {
        const configuredLevels = hierarchy?.hierarchyConfig?.customLevels;
        if (Array.isArray(configuredLevels) && configuredLevels.length) return configuredLevels;

        const type = hierarchy?.organizationType || organization?.organizationType;
        const template = orgTemplates.find((item) => item.type === type);
        return Array.isArray(template?.levels) ? template.levels : [];
    }, [hierarchy, organization, orgTemplates]);

    const sortedRoles = useMemo(
        () => [...roles].sort((a, b) => Number(a.level || 999) - Number(b.level || 999)),
        [roles]
    );

    if (loading) {
        return <div className="flex h-80 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Organization Workspace</h1>
                        <p className="text-muted-foreground">Type-based employee structure and powers are controlled in this selected organization context.</p>
                    </div>
                    <Button variant="outline" onClick={() => navigate('/owner/organization')}>Back to Organizations</Button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard label="Organization" value={organization?.name || 'N/A'} />
                    <MetricCard label="Type" value={hierarchy?.organizationType || organization?.organizationType || 'N/A'} />
                    <MetricCard label="Employees" value={kpis?.totalEmployees ?? 0} />
                    <MetricCard label="Monthly Payroll" value={kpis?.monthlyPayrollCost ?? 0} />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard label="Pending Payroll Amount" value={kpis?.payrollPendingAmount ?? 0} icon={<Wallet className="h-4 w-4 text-amber-600" />} />
                    <MetricCard label="Pending Payroll Count" value={kpis?.payrollPendingCount ?? 0} icon={<Wallet className="h-4 w-4 text-amber-600" />} />
                    <MetricCard label="Attendance Records" value={kpis?.attendanceTotalRecords ?? 0} icon={<CalendarDays className="h-4 w-4 text-primary" />} />
                    <MetricCard label="Attendance Present %" value={`${kpis?.attendancePresentRate ?? 0}%`} icon={<CalendarDays className="h-4 w-4 text-primary" />} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {moduleCards.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="rounded-xl border bg-background/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <item.icon className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold">{item.label}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                    </button>
                ))}
            </div>

            <div className="rounded-xl border bg-card p-5">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Building2 className="h-5 w-5 text-primary" />
                    Type Structure Preview
                </h2>
                {hierarchyLevels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hierarchy configured yet for this organization type.</p>
                ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {hierarchyLevels.map((level, idx) => (
                            <div key={`${level}-${idx}`} className="rounded-md border bg-background/60 px-3 py-2 text-sm">
                                <span className="text-xs text-muted-foreground">Level {idx + 1}</span>
                                <p className="font-medium">{level}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="rounded-xl border bg-card p-5">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Shield className="h-5 w-5 text-primary" />
                    Role Power Matrix
                </h2>
                {sortedRoles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No roles found.</p>
                ) : (
                    <div className="space-y-2">
                        {sortedRoles.map((role) => (
                            <div key={role._id} className="rounded-md border bg-background/60 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold">{role.name}</p>
                                    <span className="rounded-full border px-2 py-0.5 text-xs">Level {role.level || '-'}</span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Powers: {Array.isArray(role.permissions) && role.permissions.length > 0 ? role.permissions.join(', ') : 'No explicit permissions'}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Limits:
                                    {' '}Users/Role={role?.limits?.maxUsersPerRole ?? 'No limit'},
                                    {' '}Direct Reports={role?.limits?.maxDirectReports ?? 'No limit'},
                                    {' '}Monthly Approvals={role?.limits?.maxMonthlyApprovals ?? 'No limit'},
                                    {' '}Payroll Approval Amount={role?.limits?.maxPayrollApprovalAmount ?? 'No limit'}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="rounded-xl border bg-card p-5">
                <h2 className="mb-3 text-lg font-semibold">Pending Salary Details</h2>
                {!Array.isArray(kpis?.payrollPendingEmployees) || kpis.payrollPendingEmployees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending salary records for current period.</p>
                ) : (
                    <div className="space-y-2">
                        {kpis.payrollPendingEmployees.map((row) => (
                            <div key={row.payrollRecordId} className="rounded-md border bg-background/60 px-3 py-2 text-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold">{row.employeeName}</p>
                                    <span className="rounded-full border px-2 py-0.5 text-xs">{row.status}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{row.designation || '-'} | {row.department || '-'}</p>
                                <p className="text-xs text-muted-foreground">Pending Amount: {row.netPayable}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {error && (
                <div className="rounded-md border bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                </div>
            )}
        </div>
    );
};

const MetricCard = ({ label, value, icon = null }) => (
    <div className="rounded-lg border bg-background/70 p-3">
        <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {icon}
        </div>
        <p className="font-semibold">{value}</p>
    </div>
);

export default OrganizationWorkspacePage;
