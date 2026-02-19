import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Building2, PlusCircle, Clock3, ArrowUpRight, Sparkles } from 'lucide-react';

const emptyRequestForm = {
    organizationName: '',
    industryType: '',
    organizationType: 'CORPORATE_IT',
    companySize: '',
    description: '',
};

const STATUS_TONE = {
    PENDING: 'text-amber-600 bg-amber-100 border-amber-200',
    APPROVED: 'text-emerald-700 bg-emerald-100 border-emerald-200',
    REJECTED: 'text-rose-700 bg-rose-100 border-rose-200',
};

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

const OrganizationHubPage = () => {
    const navigate = useNavigate();
    const [organizations, setOrganizations] = useState([]);
    const [requests, setRequests] = useState([]);
    const [orgTypes, setOrgTypes] = useState([]);
    const [form, setForm] = useState(emptyRequestForm);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const loadData = async () => {
        setLoading(true);
        setMessage('');
        try {
            const [orgsResp, requestsResp, typesResp] = await Promise.allSettled([
                api.get('/auth/organizations'),
                api.get('/auth/organization-requests/me'),
                api.get('/auth/organization-types'),
            ]);

            const orgList = orgsResp.status === 'fulfilled' && Array.isArray(orgsResp.value?.data?.organizations)
                ? orgsResp.value.data.organizations
                : [];
            const reqList = requestsResp.status === 'fulfilled' && Array.isArray(requestsResp.value?.data?.requests)
                ? requestsResp.value.data.requests
                : [];
            const typeList = typesResp.status === 'fulfilled' && Array.isArray(typesResp.value?.data?.organizationTypes)
                ? typesResp.value.data.organizationTypes
                : [];

            setOrganizations(orgList);
            setRequests(reqList);
            setOrgTypes(typeList);

            if (typeList.length > 0) {
                setForm((prev) => ({ ...prev, organizationType: prev.organizationType || typeList[0].type }));
            }

            const allRejected = [orgsResp, requestsResp, typesResp].every((item) => item.status === 'rejected');
            if (allRejected) {
                const firstError = orgsResp.reason || requestsResp.reason || typesResp.reason;
                setMessage(firstError?.response?.data?.message || 'Failed to load organization hub');
            } else if (orgsResp.status === 'rejected' || requestsResp.status === 'rejected' || typesResp.status === 'rejected') {
                setMessage('Some organization data failed to load. Refresh once after switching organization.');
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to load organization hub');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const pendingCount = useMemo(
        () => requests.filter((item) => item.status === 'PENDING').length,
        [requests]
    );

    const submitRequest = async () => {
        const required = ['organizationName', 'industryType', 'organizationType', 'companySize'];
        const missing = required.some((field) => !String(form[field] || '').trim());
        if (missing) {
            setMessage('Please fill all required organization request fields.');
            return;
        }

        setSubmitting(true);
        setMessage('');
        try {
            await api.post('/auth/organization-request', form);
            setForm((prev) => ({ ...emptyRequestForm, organizationType: prev.organizationType }));
            setMessage('Organization request submitted for SuperAdmin approval.');
            await loadData();
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to submit organization request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
            <motion.div variants={itemVariants} className="owner-hero relative overflow-hidden rounded-2xl border p-6 sm:p-7">
                <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
                <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
                <h1 className="text-3xl font-bold tracking-tight">Organization Hub</h1>
                <p className="mt-1 text-muted-foreground">Create organization requests and launch HRMS workspaces with smooth context switching.</p>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1">
                        <Clock3 className="h-3.5 w-3.5 text-amber-500" />
                        Pending: {pendingCount}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        Organizations: {organizations.length}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1">
                        <Sparkles className="h-3.5 w-3.5 text-accent" />
                        Owner Control
                    </span>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-card rounded-xl p-5">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <PlusCircle className="h-5 w-5 text-primary" />
                    Create Organization Request
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-1">
                        <Label>Organization Name</Label>
                        <Input value={form.organizationName} onChange={(e) => setForm((s) => ({ ...s, organizationName: e.target.value }))} />
                    </div>
                    <div className="grid gap-1">
                        <Label>Industry Type</Label>
                        <Input value={form.industryType} onChange={(e) => setForm((s) => ({ ...s, industryType: e.target.value }))} />
                    </div>
                    <div className="grid gap-1">
                        <Label>Organization Type</Label>
                        <select className="h-10 rounded-md border bg-background/90 px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.organizationType} onChange={(e) => setForm((s) => ({ ...s, organizationType: e.target.value }))}>
                            {orgTypes.map((item) => <option key={item.type} value={item.type}>{item.name}</option>)}
                        </select>
                    </div>
                    <div className="grid gap-1">
                        <Label>Company Size</Label>
                        <Input value={form.companySize} onChange={(e) => setForm((s) => ({ ...s, companySize: e.target.value }))} placeholder="1-10, 11-50..." />
                    </div>
                </div>
                <div className="mt-3 grid gap-1">
                    <Label>Description</Label>
                    <textarea className="min-h-[80px] rounded-md border bg-background/90 p-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
                </div>
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Pending requests: {pendingCount}</p>
                    <Button onClick={submitRequest} isLoading={submitting} disabled={submitting}>Submit Request</Button>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-card rounded-xl p-5">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <Building2 className="h-5 w-5 text-primary" />
                    My Organizations ({organizations.length})
                </h2>
                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading organizations...</p>
                ) : organizations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No approved organization yet.</p>
                ) : (
                    <motion.div
                        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                    >
                        {organizations.map((org) => (
                            <motion.button
                                key={org.organizationId}
                                variants={itemVariants}
                                whileHover={{ y: -5, scale: 1.01 }}
                                whileTap={{ scale: 0.995 }}
                                onClick={() => navigate(`/owner/organization/${org.organizationId}`)}
                                className="interactive-card rounded-xl border bg-background/75 p-4 text-left shadow-sm transition hover:border-primary/40"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className="font-semibold">{org.organizationName}</p>
                                    <ArrowUpRight className="h-4 w-4 text-primary" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Type: {org.organizationType || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">Role: {org.role || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">Status: {org.platformStatus || 'N/A'}</p>
                                <p className="mt-3 text-xs text-primary">Click to open organization HRMS workspace</p>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </motion.div>

            <motion.div variants={itemVariants} className="glass-card rounded-xl p-5">
                <h2 className="mb-4 text-lg font-semibold">Request History</h2>
                {requests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No request history.</p>
                ) : (
                    <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="show">
                        {requests.map((item) => (
                            <motion.div key={item._id} variants={itemVariants} className="rounded-lg border bg-background/70 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">{item.organizationName}</p>
                                        <p className="text-xs text-muted-foreground">{item.organizationType} | {item.companySize}</p>
                                    </div>
                                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS_TONE[item.status] || ''}`}>
                                        {item.status}
                                    </span>
                                </div>
                                {item.status === 'REJECTED' && (
                                    <p className="mt-2 text-xs text-rose-600">Reason: {item.decision?.reason || 'Rejected by SuperAdmin'}</p>
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </motion.div>

            {message && (
                <motion.div variants={itemVariants} className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    {message}
                </motion.div>
            )}
        </motion.div>
    );
};

export default OrganizationHubPage;
