import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Building2, PlusCircle } from 'lucide-react';

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
            const [orgsResp, requestsResp, typesResp] = await Promise.all([
                api.get('/auth/organizations'),
                api.get('/auth/organization-requests/me'),
                api.get('/auth/organization-types'),
            ]);

            const orgList = Array.isArray(orgsResp.data?.organizations) ? orgsResp.data.organizations : [];
            const reqList = Array.isArray(requestsResp.data?.requests) ? requestsResp.data.requests : [];
            const typeList = Array.isArray(typesResp.data?.organizationTypes) ? typesResp.data.organizationTypes : [];

            setOrganizations(orgList);
            setRequests(reqList);
            setOrgTypes(typeList);

            if (typeList.length > 0) {
                setForm((prev) => ({ ...prev, organizationType: prev.organizationType || typeList[0].type }));
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
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Organization Hub</h1>
                <p className="text-muted-foreground">Common organization option: create request here and open HRMS by organization card.</p>
            </div>

            <div className="glass-card rounded-xl p-5">
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
                        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.organizationType} onChange={(e) => setForm((s) => ({ ...s, organizationType: e.target.value }))}>
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
                    <textarea className="min-h-[80px] rounded-md border bg-background p-2 text-sm" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
                </div>
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Pending requests: {pendingCount}</p>
                    <Button onClick={submitRequest} isLoading={submitting} disabled={submitting}>Submit Request</Button>
                </div>
            </div>

            <div className="glass-card rounded-xl p-5">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <Building2 className="h-5 w-5 text-primary" />
                    My Organizations ({organizations.length})
                </h2>
                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading organizations...</p>
                ) : organizations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No approved organization yet.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {organizations.map((org) => (
                            <button
                                key={org.organizationId}
                                onClick={() => navigate(`/owner/organization/${org.organizationId}`)}
                                className="rounded-xl border bg-background/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40"
                            >
                                <p className="font-semibold">{org.organizationName}</p>
                                <p className="text-xs text-muted-foreground mt-1">Type: {org.organizationType || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">Role: {org.role || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">Status: {org.platformStatus || 'N/A'}</p>
                                <p className="mt-3 text-xs text-primary">Click to open organization HRMS workspace</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="glass-card rounded-xl p-5">
                <h2 className="mb-4 text-lg font-semibold">Request History</h2>
                {requests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No request history.</p>
                ) : (
                    <div className="space-y-3">
                        {requests.map((item) => (
                            <div key={item._id} className="rounded-lg border bg-background/60 p-3">
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
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {message && (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    {message}
                </div>
            )}
        </div>
    );
};

export default OrganizationHubPage;
