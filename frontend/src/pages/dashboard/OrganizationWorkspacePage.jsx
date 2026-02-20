import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    Trash2,
    Save,
    UserCheck,
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

const toDateInput = (value) => {
    if (!value) return '';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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
    const [applications, setApplications] = useState([]);
    const [busyApplicationId, setBusyApplicationId] = useState('');
    const [savingOrganization, setSavingOrganization] = useState(false);
    const [deletingOrganization, setDeletingOrganization] = useState(false);
    const [orgEditForm, setOrgEditForm] = useState({
        name: '',
        organizationType: 'CORPORATE_IT',
    });
    const [error, setError] = useState('');

    const ensureOrganizationContext = useCallback(async () => {
        if (!organizationId) return;

        const activeId = String(organization?.id || organization?._id || '');
        if (activeId !== String(organizationId)) {
            const { data: switchData } = await api.post('/auth/switch-organization', { organizationId });
            if (switchData?.accessToken) setToken(switchData.accessToken);
        }

        const { data: orgData } = await api.get('/organization');
        setOrganization(orgData);
        localStorage.setItem('owner-active-organization-id', String(organizationId));
        return orgData;
    }, [organization?.id, organization?._id, organizationId, setOrganization, setToken]);

    const loadWorkspace = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const activeOrg = await ensureOrganizationContext();
            const [hierarchyResp, kpiResp, roleResp, typeResp, appResp] = await Promise.all([
                api.get('/organization/hierarchy'),
                api.get('/owner/strategic-dashboard'),
                api.get('/roles'),
                api.get('/auth/organization-types'),
                api.get('/recruitment/applications?limit=60'),
            ]);
            setHierarchy(hierarchyResp.data || null);
            setKpis(kpiResp.data || null);
            setRoles(Array.isArray(roleResp.data) ? roleResp.data : []);
            setOrgTemplates(Array.isArray(typeResp.data?.organizationTypes) ? typeResp.data.organizationTypes : []);
            setApplications(Array.isArray(appResp.data) ? appResp.data : []);
            setOrgEditForm({
                name: String(activeOrg?.name || organization?.name || '').trim(),
                organizationType: String(hierarchyResp.data?.organizationType || activeOrg?.organizationType || organization?.organizationType || 'CORPORATE_IT'),
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to open organization workspace');
        } finally {
            setLoading(false);
        }
    }, [ensureOrganizationContext, organization?.name, organization?.organizationType]);

    useEffect(() => {
        loadWorkspace();
    }, [loadWorkspace]);

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

    const saveOrganizationBasics = async () => {
        setSavingOrganization(true);
        setError('');
        try {
            const payload = {
                name: String(orgEditForm.name || '').trim(),
                organizationType: String(orgEditForm.organizationType || '').trim(),
            };
            const { data } = await api.patch('/organization', payload);
            setOrganization(data);
            await loadWorkspace();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update organization');
        } finally {
            setSavingOrganization(false);
        }
    };

    const deleteCurrentOrganization = async () => {
        const orgName = String(organization?.name || '').trim();
        if (!orgName) {
            setError('Organization not found for delete action');
            return;
        }

        const typed = window.prompt(`Type organization name to confirm delete: ${orgName}`);
        if (typed === null) return;
        if (String(typed).trim() !== orgName) {
            setError('Organization name mismatch. Delete cancelled.');
            return;
        }

        setDeletingOrganization(true);
        setError('');
        try {
            await api.delete('/organization', { data: { confirmName: orgName } });
            localStorage.removeItem('owner-active-organization-id');
            setOrganization(null);
            navigate('/owner/organization');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete organization');
        } finally {
            setDeletingOrganization(false);
        }
    };

    const updateApplicationRecord = async (applicationId, patch) => {
        setBusyApplicationId(String(applicationId));
        setError('');
        try {
            const { data } = await api.patch(`/recruitment/applications/${applicationId}`, patch);
            setApplications((prev) => prev.map((item) => (String(item._id) === String(applicationId) ? data : item)));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update candidate request');
        } finally {
            setBusyApplicationId('');
        }
    };

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
                    <Save className="h-5 w-5 text-primary" />
                    Organization Edit / Delete
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-1">
                        <label className="text-sm">Organization Name</label>
                        <input
                            className="h-10 rounded-md border bg-background px-3 text-sm"
                            value={orgEditForm.name}
                            onChange={(e) => setOrgEditForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Organization name"
                        />
                    </div>
                    <div className="grid gap-1">
                        <label className="text-sm">Organization Type</label>
                        <select
                            className="h-10 rounded-md border bg-background px-3 text-sm"
                            value={orgEditForm.organizationType}
                            onChange={(e) => setOrgEditForm((prev) => ({ ...prev, organizationType: e.target.value }))}
                        >
                            {orgTemplates.map((item) => (
                                <option key={item.type} value={item.type}>{item.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                        onClick={saveOrganizationBasics}
                        isLoading={savingOrganization}
                        disabled={savingOrganization || deletingOrganization}
                    >
                        Save Organization
                    </Button>
                    <Button
                        variant="outline"
                        className="border-rose-300 text-rose-600 hover:bg-rose-50"
                        onClick={deleteCurrentOrganization}
                        isLoading={deletingOrganization}
                        disabled={deletingOrganization || savingOrganization}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Organization
                    </Button>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-card rounded-xl p-4 sm:p-5">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <UserCheck className="h-5 w-5 text-primary" />
                    User Requests: Interview / Joining
                </h2>
                {applications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No user requests/applications found in this organization.</p>
                ) : (
                    <div className="space-y-3">
                        {applications.map((app) => {
                            const isBusy = busyApplicationId === String(app._id);
                            return (
                                <div key={app._id} className="rounded-lg border bg-background/70 p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="font-semibold">{app.candidateName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {app.email} | Job: {app?.jobId?.title || 'N/A'} | AI Score: {app.aiScore ?? 0}
                                            </p>
                                        </div>
                                        <span className="rounded-full border px-2 py-0.5 text-xs">{app.status}</span>
                                    </div>

                                    <div className="mt-3 grid gap-2 md:grid-cols-4">
                                        <select
                                            className="h-9 rounded-md border bg-background px-2 text-sm"
                                            value={app.status || 'APPLIED'}
                                            onChange={(e) => updateApplicationRecord(app._id, { status: e.target.value })}
                                            disabled={isBusy}
                                        >
                                            <option value="APPLIED">APPLIED</option>
                                            <option value="SCREENING">SCREENING</option>
                                            <option value="INTERVIEW">INTERVIEW</option>
                                            <option value="OFFER">OFFER</option>
                                            <option value="HIRED">HIRED</option>
                                            <option value="REJECTED">REJECTED</option>
                                        </select>
                                        <input
                                            type="date"
                                            className="h-9 rounded-md border bg-background px-2 text-sm"
                                            defaultValue={toDateInput(app.interviewAt)}
                                            onBlur={(e) => updateApplicationRecord(app._id, {
                                                interviewAt: e.target.value || null,
                                                status: 'INTERVIEW',
                                            })}
                                            disabled={isBusy}
                                        />
                                        <input
                                            type="date"
                                            className="h-9 rounded-md border bg-background px-2 text-sm"
                                            defaultValue={toDateInput(app.joiningDate)}
                                            onBlur={(e) => updateApplicationRecord(app._id, {
                                                joiningDate: e.target.value || null,
                                                status: e.target.value ? 'HIRED' : app.status,
                                            })}
                                            disabled={isBusy}
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => updateApplicationRecord(app._id, { status: 'HIRED' })}
                                            isLoading={isBusy}
                                            disabled={isBusy}
                                        >
                                            Mark Joining
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
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
