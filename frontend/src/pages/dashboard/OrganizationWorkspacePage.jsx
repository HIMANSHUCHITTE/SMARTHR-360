import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    Sparkles,
    ArrowUpRight,
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

const containerVariants = {
    hidden: { opacity: 0, y: 12 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
            staggerChildren: 0.08,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.985 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
    },
};

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
        localStorage.setItem('owner-active-organization-id', String(organizationId));
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
        <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
            <motion.div variants={itemVariants} className="owner-hero relative overflow-hidden rounded-2xl border p-4 sm:p-6">
                <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
                <div className="pointer-events-none absolute -left-14 bottom-0 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Organization Workspace</h1>
                        <p className="text-muted-foreground">Type-based employee structure and powers are controlled in this selected organization context.</p>
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1 text-xs">
                            <Sparkles className="h-3.5 w-3.5 text-accent" />
                            Strategic Overview
                        </div>
                    </div>
                    <Button className="w-full sm:w-auto" variant="outline" onClick={() => navigate('/owner/organization')}>Back to Organizations</Button>
                </div>

                <motion.div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" variants={containerVariants} initial="hidden" animate="show">
                    <MetricCard label="Organization" value={organization?.name || 'N/A'} />
                    <MetricCard label="Type" value={hierarchy?.organizationType || organization?.organizationType || 'N/A'} />
                    <MetricCard label="Employees" value={kpis?.totalEmployees ?? 0} />
                    <MetricCard label="Monthly Payroll" value={kpis?.monthlyPayrollCost ?? 0} />
                </motion.div>

                <motion.div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" variants={containerVariants} initial="hidden" animate="show">
                    <MetricCard label="Pending Payroll Amount" value={kpis?.payrollPendingAmount ?? 0} icon={<Wallet className="h-4 w-4 text-amber-600" />} />
                    <MetricCard label="Pending Payroll Count" value={kpis?.payrollPendingCount ?? 0} icon={<Wallet className="h-4 w-4 text-amber-600" />} />
                    <MetricCard label="Attendance Records" value={kpis?.attendanceTotalRecords ?? 0} icon={<CalendarDays className="h-4 w-4 text-primary" />} />
                    <MetricCard label="Attendance Present %" value={`${kpis?.attendancePresentRate ?? 0}%`} icon={<CalendarDays className="h-4 w-4 text-primary" />} />
                </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {moduleCards.map((item) => (
                    <motion.button
                        key={item.path}
                        variants={itemVariants}
                        whileHover={{ y: -5, scale: 1.01 }}
                        whileTap={{ scale: 0.995 }}
                        onClick={() => {
                            const target = organizationId
                                ? `${item.path}?orgId=${encodeURIComponent(String(organizationId))}`
                                : item.path;
                            navigate(target);
                        }}
                        className="interactive-card rounded-xl border bg-background/75 p-4 text-left shadow-sm transition hover:border-primary/50"
                    >
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <item.icon className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold">{item.label}</h3>
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-primary/80" />
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                    </motion.button>
                ))}
            </motion.div>

            <motion.div variants={itemVariants} className="glass-card rounded-xl p-4 sm:p-5">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Building2 className="h-5 w-5 text-primary" />
                    Type Structure Preview
                </h2>
                {hierarchyLevels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hierarchy configured yet for this organization type.</p>
                ) : (
                    <motion.div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" variants={containerVariants} initial="hidden" animate="show">
                        {hierarchyLevels.map((level, idx) => (
                            <motion.div key={`${level}-${idx}`} variants={itemVariants} className="rounded-md border bg-background/70 px-3 py-2 text-sm">
                                <span className="text-xs text-muted-foreground">Level {idx + 1}</span>
                                <p className="font-medium">{level}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </motion.div>

            <motion.div variants={itemVariants} className="glass-card rounded-xl p-4 sm:p-5">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Shield className="h-5 w-5 text-primary" />
                    Role Power Matrix
                </h2>
                {sortedRoles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No roles found.</p>
                ) : (
                    <motion.div className="space-y-2" variants={containerVariants} initial="hidden" animate="show">
                        {sortedRoles.map((role) => (
                            <motion.div key={role._id} variants={itemVariants} className="rounded-md border bg-background/70 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold">{role.name}</p>
                                    <span className="rounded-full border px-2 py-0.5 text-xs">Level {role.level || '-'}</span>
                                </div>
                                <p className="mt-1 break-words text-xs text-muted-foreground">
                                    Powers: {Array.isArray(role.permissions) && role.permissions.length > 0 ? role.permissions.join(', ') : 'No explicit permissions'}
                                </p>
                                <p className="mt-1 break-words text-xs text-muted-foreground">
                                    Limits:
                                    {' '}Users/Role={role?.limits?.maxUsersPerRole ?? 'No limit'},
                                    {' '}Direct Reports={role?.limits?.maxDirectReports ?? 'No limit'},
                                    {' '}Monthly Approvals={role?.limits?.maxMonthlyApprovals ?? 'No limit'},
                                    {' '}Payroll Approval Amount={role?.limits?.maxPayrollApprovalAmount ?? 'No limit'}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </motion.div>

            <motion.div variants={itemVariants} className="glass-card rounded-xl p-4 sm:p-5">
                <h2 className="mb-3 text-lg font-semibold">Pending Salary Details</h2>
                {!Array.isArray(kpis?.payrollPendingEmployees) || kpis.payrollPendingEmployees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending salary records for current period.</p>
                ) : (
                    <motion.div className="space-y-2" variants={containerVariants} initial="hidden" animate="show">
                        {kpis.payrollPendingEmployees.map((row) => (
                            <motion.div key={row.payrollRecordId} variants={itemVariants} className="rounded-md border bg-background/70 px-3 py-2 text-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold">{row.employeeName}</p>
                                    <span className="rounded-full border px-2 py-0.5 text-xs">{row.status}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{row.designation || '-'} | {row.department || '-'}</p>
                                <p className="text-xs text-muted-foreground">Pending Amount: {row.netPayable}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </motion.div>

            {error && (
                <motion.div variants={itemVariants} className="rounded-md border bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                </motion.div>
            )}
        </motion.div>
    );
};

const MetricCard = ({ label, value, icon = null }) => (
    <motion.div variants={itemVariants} className="rounded-lg border bg-background/80 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {icon}
        </div>
        <p className="font-semibold">{value}</p>
    </motion.div>
);

export default OrganizationWorkspacePage;
