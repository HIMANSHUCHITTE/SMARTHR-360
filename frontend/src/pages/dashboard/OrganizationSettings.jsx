import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Building2, Save, Loader2, CreditCard, ReceiptText, Network } from 'lucide-react';
import { useForm } from 'react-hook-form';

const plans = [
    { id: 'FREE', title: 'Free', details: 'Up to 5 employees' },
    { id: 'PRO', title: 'Pro', details: 'Up to 50 employees' },
    { id: 'ENTERPRISE', title: 'Enterprise', details: 'Unlimited scale' },
];

const DEFAULT_HIERARCHY_CONFIG = {
    templates: [
        {
            type: 'CORPORATE_IT',
            name: 'Corporate / IT Company',
            levels: [
                'Shareholders',
                'Board of Directors',
                'CEO',
                'C-Level Executives (CTO, CFO, COO, CHRO)',
                'Department Directors',
                'Senior Managers',
                'Managers',
                'Team Leads',
                'Senior Employees',
                'Junior Employees / Interns',
            ],
            reportingExample: ['CEO', 'CTO', 'Engineering Director', 'Project Manager', 'Team Lead', 'Developers'],
        },
        {
            type: 'SCHOOL_COLLEGE',
            name: 'School / College',
            levels: ['Trust / Chairman', 'Principal', 'Vice Principal', 'HOD', 'Teachers', 'Assistant Teachers'],
            reportingExample: ['Principal', 'Administrative Officer', 'Clerks / Office Staff', 'Peon / Support Staff'],
        },
        {
            type: 'HOSPITAL',
            name: 'Hospital',
            levels: ['Hospital Owner / Board', 'Medical Director', 'Department Heads', 'Senior Doctors', 'Junior Doctors', 'Nurses', 'Ward Staff'],
            reportingExample: ['Hospital Director', 'Admin Manager', 'Reception / Billing Staff'],
        },
        {
            type: 'MANUFACTURING_FACTORY',
            name: 'Manufacturing / Factory',
            levels: ['Owner / Board', 'Plant Head', 'Production Manager', 'Shift Supervisor', 'Line Incharge', 'Skilled Workers', 'Helpers / Contract Workers'],
            reportingExample: ['Plant Head', 'Maintenance Manager', 'Engineers', 'Technicians'],
        },
        {
            type: 'GOVERNMENT',
            name: 'Government Organization',
            levels: ['Ministry / Central Authority', 'Chairman / Secretary', 'Director', 'Joint Director', 'Section Officer', 'Clerk', 'Field Staff'],
            reportingExample: ['Promotion flow usually follows seniority + grade model'],
        },
        {
            type: 'RETAIL_CHAIN',
            name: 'Retail Chain',
            levels: ['Owner / Corporate Office', 'Regional Manager', 'Area Manager', 'Store Manager', 'Assistant Store Manager', 'Cashier / Sales Executive', 'Helper / Inventory Staff'],
            reportingExample: ['Corporate Office', 'Regional Manager', 'Area Manager', 'Store Manager', 'Store Staff'],
        },
    ],
    universalLevels: [
        'Strategic Level (Decision Makers)',
        'Managerial Level (Control & Supervision)',
        'Operational Level (Execution)',
    ],
    matrixReportingEnabled: false,
    visibilityPolicy: 'DOWNLINE_ONLY',
    blockUpwardVisibility: true,
};

const EMPLOYEE_MANDATORY_FIELDS = ['Reporting Manager', 'Department', 'Designation', 'Role'];

const normalizeHierarchyConfig = (raw) => ({
    templates: Array.isArray(raw?.templates) && raw.templates.length ? raw.templates : DEFAULT_HIERARCHY_CONFIG.templates,
    universalLevels: Array.isArray(raw?.universalLevels) && raw.universalLevels.length ? raw.universalLevels : DEFAULT_HIERARCHY_CONFIG.universalLevels,
    matrixReportingEnabled: Boolean(raw?.matrixReportingEnabled),
    visibilityPolicy: raw?.visibilityPolicy === 'ALL' ? 'ALL' : 'DOWNLINE_ONLY',
    blockUpwardVisibility: raw?.blockUpwardVisibility !== false,
});

const OrganizationSettings = () => {
    const { organization, setOrganization } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [message, setMessage] = useState('');
    const [payingPlan, setPayingPlan] = useState('');
    const [pricing, setPricing] = useState(null);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentTarget, setPaymentTarget] = useState('PRO');
    const [billingCycle, setBillingCycle] = useState('MONTHLY');
    const [history, setHistory] = useState([]);
    const [hierarchyConfig, setHierarchyConfig] = useState(DEFAULT_HIERARCHY_CONFIG);
    const [paymentForm, setPaymentForm] = useState({
        cardHolder: '',
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
    });

    const { register, handleSubmit, setValue, formState: { errors } } = useForm();

    const fetchOrgSettings = useCallback(async () => {
        try {
            const [{ data: orgData }, { data: pricingData }, { data: historyData }] = await Promise.all([
                api.get('/organization'),
                api.get('/payments/pricing'),
                api.get('/payments/history'),
            ]);
            setOrganization(orgData);
            setPricing(pricingData);
            setHistory(historyData || []);
            setValue('name', orgData.name);
            setValue('branding.primaryColor', orgData.settings?.branding?.primaryColor || '#000000');
            setHierarchyConfig(normalizeHierarchyConfig(orgData.hierarchyConfig));
        } catch (error) {
            console.error('Failed to fetch org settings:', error);
            setMessage(error.response?.data?.message || 'Failed to load organization settings');
        } finally {
            setFetching(false);
        }
    }, [setOrganization, setValue]);

    useEffect(() => {
        fetchOrgSettings();
    }, [fetchOrgSettings]);

    const onSubmit = async (data) => {
        setLoading(true);
        setMessage('');
        try {
            const payload = {
                name: data.name,
                branding: {
                    primaryColor: data.branding.primaryColor,
                },
                hierarchyConfig,
            };
            const { data: updatedOrg } = await api.patch('/organization', payload);
            setOrganization(updatedOrg);
            setMessage('Organization settings updated.');
        } catch (error) {
            console.error('Failed to update org:', error);
            setMessage(error.response?.data?.message || 'Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    const openPayment = (planId) => {
        setPaymentTarget(planId);
        setBillingCycle('MONTHLY');
        setPaymentOpen(true);
        setMessage('');
    };

    const payNow = async () => {
        setPayingPlan(paymentTarget);
        setMessage('');
        try {
            const payload = {
                planId: paymentTarget,
                billingCycle,
                ...paymentForm,
            };
            const { data } = await api.post('/payments/checkout', payload);
            setOrganization(data.organization);
            setHistory((prev) => [data.transaction, ...prev]);
            setPaymentOpen(false);
            setPaymentForm({ cardHolder: '', cardNumber: '', expiryMonth: '', expiryYear: '', cvv: '' });
            setMessage(data.message || 'Payment successful.');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Payment failed');
        } finally {
            setPayingPlan('');
        }
    };

    const currentPlanId = useMemo(() => organization?.subscription?.planId || 'FREE', [organization]);

    const getPlanPrice = (planId) => {
        if (!pricing?.plans?.[planId]) return '$0';
        const amount = pricing.plans[planId][billingCycle] || 0;
        return `$${amount}`;
    };

    if (fetching) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!organization) {
        return (
            <div className="text-center p-8">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Organization Found</h3>
                <p className="text-muted-foreground">You do not have an active organization context.</p>
            </div>
        );
    }

    return (
        <div className="animate-page-in space-y-6 max-w-6xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
                <p className="text-muted-foreground">Manage company profile and active subscription with checkout.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="glass-card interactive-card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Building2 className="h-24 w-24" />
                    </div>

                    <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                        <span className="w-1 h-6 bg-primary rounded-full"></span>
                        General Information
                    </h3>

                    <div className="grid gap-6 max-w-xl">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Organization Name</Label>
                            <Input id="name" placeholder="Acme Corp" {...register('name', { required: 'Name is required' })} />
                            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                        </div>

                        <div className="grid gap-2">
                            <Label>Primary Brand Color</Label>
                            <div className="flex gap-4 items-center">
                                <input type="color" className="h-12 w-12 rounded-lg border-2 border-border cursor-pointer overflow-hidden p-0" {...register('branding.primaryColor')} />
                                <div className="flex-1">
                                    <Input placeholder="#000000" {...register('branding.primaryColor')} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button type="submit" disabled={loading} className="min-w-[140px]">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </div>
                </div>

                <div className="glass-card interactive-card p-6">
                    <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                        <Network className="h-5 w-5 text-primary" />
                        Organization Hierarchy & Reporting
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Ye configuration owner panel se control hoti hai. Employee upward hierarchy details nahi dekh paayega jab `Downline Only` active ho.
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                        {hierarchyConfig.templates.map((template) => (
                            <div key={template.type} className="rounded-lg border bg-background/60 p-4">
                                <h4 className="font-semibold">{template.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1">Top to Bottom</p>
                                <div className="mt-2 text-sm space-y-1">
                                    {template.levels?.map((level, idx) => (
                                        <p key={`${template.type}-lvl-${idx}`}>
                                            {idx + 1}. {level}
                                        </p>
                                    ))}
                                </div>
                                {Array.isArray(template.reportingExample) && template.reportingExample.length > 0 && (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        Reporting Example: {template.reportingExample.join(' -> ')}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div className="grid gap-1">
                            <Label>Visibility Policy</Label>
                            <select
                                className="h-10 rounded-md border bg-background px-3 text-sm"
                                value={hierarchyConfig.visibilityPolicy}
                                onChange={(e) => setHierarchyConfig((prev) => ({ ...prev, visibilityPolicy: e.target.value }))}
                            >
                                <option value="DOWNLINE_ONLY">Downline Only (Recommended)</option>
                                <option value="ALL">All Employees</option>
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Reporting Mode</Label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={hierarchyConfig.blockUpwardVisibility}
                                    onChange={(e) => setHierarchyConfig((prev) => ({ ...prev, blockUpwardVisibility: e.target.checked }))}
                                />
                                Block upward visibility
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={hierarchyConfig.matrixReportingEnabled}
                                    onChange={(e) => setHierarchyConfig((prev) => ({ ...prev, matrixReportingEnabled: e.target.checked }))}
                                />
                                Enable matrix reporting (multi-manager structure)
                            </label>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div className="rounded-md border bg-background/60 p-3">
                            <h5 className="font-medium text-sm">Universal Levels</h5>
                            <div className="mt-2 text-sm space-y-1">
                                {hierarchyConfig.universalLevels.map((level, idx) => (
                                    <p key={`universal-${idx}`}>{idx + 1}. {level}</p>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-md border bg-background/60 p-3">
                            <h5 className="font-medium text-sm">Mandatory Employee Mapping</h5>
                            <div className="mt-2 text-sm space-y-1">
                                {EMPLOYEE_MANDATORY_FIELDS.map((item) => (
                                    <p key={item}>- {item}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <div className="glass-card interactive-card p-6">
                <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Subscription & Payment
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Current plan: <span className="font-semibold text-foreground">{currentPlanId}</span>
                </p>

                <div className="stagger-children grid gap-4 md:grid-cols-3">
                    {plans.map((plan) => {
                        const isCurrent = currentPlanId === plan.id;
                        return (
                            <div key={plan.id} className={`interactive-card rounded-lg border p-4 ${isCurrent ? 'border-primary bg-primary/5' : 'bg-background/70'}`}>
                                <h4 className="font-semibold">{plan.title}</h4>
                                <p className="text-sm text-muted-foreground">{pricing ? `$${pricing.plans?.[plan.id]?.MONTHLY || 0}/mo` : '-'}</p>
                                <p className="text-xs text-muted-foreground mt-1">{plan.details}</p>
                                <Button
                                    className="mt-4 w-full"
                                    variant={isCurrent ? 'outline' : 'default'}
                                    disabled={isCurrent || Boolean(payingPlan)}
                                    onClick={() => openPayment(plan.id)}
                                >
                                    {isCurrent ? 'Current Plan' : 'Proceed to Payment'}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {paymentOpen && (
                <div className="glass-card interactive-card p-6">
                    <h4 className="text-lg font-semibold">Checkout: {paymentTarget}</h4>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="grid gap-1">
                            <Label>Billing Cycle</Label>
                            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)}>
                                <option value="MONTHLY">Monthly</option>
                                <option value="YEARLY">Yearly</option>
                            </select>
                        </div>
                        <div className="grid gap-1">
                            <Label>Amount</Label>
                            <Input value={getPlanPrice(paymentTarget)} disabled />
                        </div>
                        <div className="grid gap-1 md:col-span-2">
                            <Label>Card Holder</Label>
                            <Input value={paymentForm.cardHolder} onChange={(e) => setPaymentForm((s) => ({ ...s, cardHolder: e.target.value }))} placeholder="Name on card" />
                        </div>
                        <div className="grid gap-1 md:col-span-2">
                            <Label>Card Number</Label>
                            <Input value={paymentForm.cardNumber} onChange={(e) => setPaymentForm((s) => ({ ...s, cardNumber: e.target.value }))} placeholder="4111 1111 1111 1111" />
                        </div>
                        <div className="grid gap-1">
                            <Label>Expiry Month</Label>
                            <Input value={paymentForm.expiryMonth} onChange={(e) => setPaymentForm((s) => ({ ...s, expiryMonth: e.target.value }))} placeholder="MM" />
                        </div>
                        <div className="grid gap-1">
                            <Label>Expiry Year</Label>
                            <Input value={paymentForm.expiryYear} onChange={(e) => setPaymentForm((s) => ({ ...s, expiryYear: e.target.value }))} placeholder="YYYY" />
                        </div>
                        <div className="grid gap-1">
                            <Label>CVV</Label>
                            <Input value={paymentForm.cvv} onChange={(e) => setPaymentForm((s) => ({ ...s, cvv: e.target.value }))} placeholder="123" />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
                        <Button isLoading={payingPlan === paymentTarget} disabled={Boolean(payingPlan)} onClick={payNow}>Pay & Activate</Button>
                    </div>
                </div>
            )}

            <div className="glass-card interactive-card p-6">
                <h3 className="mb-3 flex items-center gap-2 font-semibold"><ReceiptText className="h-4 w-4" /> Payment History</h3>
                {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payment records yet.</p>
                ) : (
                    <div className="space-y-2">
                        {history.slice(0, 8).map((txn) => (
                            <div key={txn._id} className="flex items-center justify-between rounded-md border bg-background/60 px-3 py-2 text-sm">
                                <div>
                                    <p className="font-medium">{txn.planId} ({txn.billingCycle})</p>
                                    <p className="text-xs text-muted-foreground">Ref: {txn.transactionRef}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">${txn.amount}</p>
                                    <p className="text-xs text-muted-foreground">{txn.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
    );
};

export default OrganizationSettings;
