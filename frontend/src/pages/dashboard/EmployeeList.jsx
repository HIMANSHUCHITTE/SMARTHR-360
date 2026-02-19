import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import api from '../../services/api';
import { Search, UserPlus, X, Loader2, BrainCircuit, Eye, Package2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const EmployeeList = () => {
    const [searchParams] = useSearchParams();
    const panel = useAuthStore((state) => state.panel);
    const organization = useAuthStore((state) => state.organization);
    const setOrganization = useAuthStore((state) => state.setOrganization);
    const setToken = useAuthStore((state) => state.setToken);

    const [employees, setEmployees] = useState([]);
    const [roles, setRoles] = useState([]);
    const [eligibleUsers, setEligibleUsers] = useState([]);
    const [eligibleQuery, setEligibleQuery] = useState('');
    const [loadingEligible, setLoadingEligible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [employeeQuery, setEmployeeQuery] = useState('');
    const [ratingBusyId, setRatingBusyId] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [overviewLoading, setOverviewLoading] = useState(false);
    const [employeeOverview, setEmployeeOverview] = useState(null);
    const [itemForm, setItemForm] = useState({ itemName: '', category: '', specs: '', estimatedValue: '', quantity: 1, notes: '' });
    const [pageError, setPageError] = useState('');

    const [formData, setFormData] = useState({
        userId: '',
        roleName: 'Employee',
        designation: '',
        department: '',
    });

    useEffect(() => {
        initializeEmployeePage();
    }, []);

    useEffect(() => {
        if (!isAdding) return;
        loadEligibleUsers(eligibleQuery);
    }, [eligibleQuery, isAdding]);

    const ensureOwnerOrganizationContext = async () => {
        if (panel !== 'OWNER') return;

        const routeOrgId = String(searchParams.get('orgId') || '').trim();
        const activeOrgId = String(organization?.id || organization?._id || '');
        if (routeOrgId && activeOrgId !== routeOrgId) {
            const { data: switchData } = await api.post('/auth/switch-organization', { organizationId: routeOrgId });
            if (switchData?.accessToken) setToken(switchData.accessToken);
            const { data: orgData } = await api.get('/organization');
            setOrganization(orgData);
            localStorage.setItem('owner-active-organization-id', routeOrgId);
            return;
        }

        if (activeOrgId) return;

        const savedOrgId = String(localStorage.getItem('owner-active-organization-id') || '').trim();
        let targetOrgId = savedOrgId;
        if (!targetOrgId) {
            const { data: orgData } = await api.get('/auth/organizations');
            const list = Array.isArray(orgData?.organizations) ? orgData.organizations : [];
            targetOrgId = String(list[0]?.organizationId || '').trim();
        }
        if (!targetOrgId) return;

        const { data: switchData } = await api.post('/auth/switch-organization', { organizationId: targetOrgId });
        if (switchData?.accessToken) setToken(switchData.accessToken);
        const { data: activeOrgData } = await api.get('/organization');
        setOrganization(activeOrgData);
        localStorage.setItem('owner-active-organization-id', targetOrgId);
    };

    const initializeEmployeePage = async () => {
        setLoading(true);
        setPageError('');
        try {
            await ensureOwnerOrganizationContext();
            await fetchMasterData();
        } catch (error) {
            console.error('Failed to initialize employee page:', error);
            setPageError(error.response?.data?.message || 'Failed to load employee workspace data');
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterData = async () => {
        try {
            const [employeeResp, roleResp] = await Promise.all([
                api.get('/organization/employees'),
                api.get('/roles'),
            ]);
            setEmployees(Array.isArray(employeeResp.data) ? employeeResp.data : []);
            const roleItems = (Array.isArray(roleResp.data) ? roleResp.data : [])
                .filter((role) => !['owner', 'admin', 'superadmin'].includes(String(role.name || '').toLowerCase()));
            setRoles(roleItems);

            const defaultRole = roleItems.find((r) => String(r.name || '').toLowerCase() === 'employee') || roleItems[0];
            if (defaultRole?.name) {
                setFormData((prev) => ({ ...prev, roleName: defaultRole.name }));
            }
        } catch (error) {
            console.error('Failed to fetch employees/roles:', error);
            throw error;
        }
    };

    const loadEligibleUsers = async (q = '') => {
        setLoadingEligible(true);
        try {
            const { data } = await api.get(`/organization/employees/eligible-users?q=${encodeURIComponent(q)}`);
            setEligibleUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load eligible users', error);
        } finally {
            setLoadingEligible(false);
        }
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        if (!formData.userId) {
            alert('Please select a registered user to hire');
            return;
        }

        try {
            await api.post('/organization/employees', formData);
            setIsAdding(false);
            setFormData((prev) => ({ ...prev, userId: '', designation: '', department: '' }));
            await fetchMasterData();
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to add employee');
        }
    };

    const runAiResumeRating = async (emp) => {
        setRatingBusyId(emp._id);
        try {
            await api.post(`/organization/employees/${emp._id}/ai-resume-rating`, {
                jobDescription: `${emp.designation || ''} ${emp.roleId?.name || ''}`.trim(),
            });
            await fetchMasterData();
            if (String(selectedEmployeeId) === String(emp._id)) {
                await openOverview(emp._id);
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to run AI resume rating');
        } finally {
            setRatingBusyId('');
        }
    };

    const openOverview = async (employmentId) => {
        setSelectedEmployeeId(employmentId);
        setOverviewLoading(true);
        setEmployeeOverview(null);
        try {
            const { data } = await api.get(`/organization/employees/${employmentId}/overview`);
            setEmployeeOverview(data || null);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to load employee overview');
        } finally {
            setOverviewLoading(false);
        }
    };

    const closeOverview = () => {
        setSelectedEmployeeId('');
        setEmployeeOverview(null);
        setItemForm({ itemName: '', category: '', specs: '', estimatedValue: '', quantity: 1, notes: '' });
    };

    const addItemToEmployee = async () => {
        if (!selectedEmployeeId) return;
        if (!String(itemForm.itemName || '').trim()) {
            alert('Item name is required');
            return;
        }
        try {
            await api.post(`/organization/employees/${selectedEmployeeId}/items`, {
                ...itemForm,
                estimatedValue: Number(itemForm.estimatedValue || 0),
                quantity: Math.max(1, Number(itemForm.quantity || 1)),
            });
            setItemForm({ itemName: '', category: '', specs: '', estimatedValue: '', quantity: 1, notes: '' });
            await openOverview(selectedEmployeeId);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to add item');
        }
    };

    const selectedUser = useMemo(
        () => eligibleUsers.find((user) => String(user._id) === String(formData.userId)) || null,
        [eligibleUsers, formData.userId]
    );

    const filteredEmployees = useMemo(() => {
        const q = String(employeeQuery || '').trim().toLowerCase();
        if (!q) return employees;
        return employees.filter((emp) => {
            const name = `${emp.userId?.profile?.firstName || ''} ${emp.userId?.profile?.surname || emp.userId?.profile?.lastName || ''}`.toLowerCase();
            const email = String(emp.userId?.email || '').toLowerCase();
            const role = String(emp.roleId?.name || '').toLowerCase();
            const dept = String(emp.department || '').toLowerCase();
            const designation = String(emp.designation || '').toLowerCase();
            return [name, email, role, dept, designation].some((value) => value.includes(q));
        });
    }, [employees, employeeQuery]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
                    <p className="text-muted-foreground">Hire only existing registered users and open employee overview popup for full details.</p>
                </div>
                <Button onClick={() => setIsAdding(!isAdding)} className="ring-2 ring-primary/30">
                    {isAdding ? <X className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    {isAdding ? 'Cancel' : 'Hire User'}
                </Button>
            </div>

            {isAdding && (
                <div className="glass-card p-6 rounded-xl border border-primary/20 bg-primary/5">
                    <h3 className="font-semibold mb-4">Hire Existing User</h3>
                    <form onSubmit={handleAddEmployee} className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                            <Label>Search Registered Users</Label>
                            <Input
                                value={eligibleQuery}
                                onChange={(e) => setEligibleQuery(e.target.value)}
                                placeholder="Search by name or email"
                            />
                            <div className="max-h-56 overflow-auto rounded-md border bg-background/80">
                                {loadingEligible ? (
                                    <div className="p-3 text-sm text-muted-foreground">Loading users...</div>
                                ) : eligibleUsers.length === 0 ? (
                                    <div className="p-3 text-sm text-muted-foreground">No eligible users found.</div>
                                ) : (
                                    eligibleUsers.map((user) => {
                                        const selected = String(formData.userId) === String(user._id);
                                        const displayName = `${user.profile?.firstName || ''} ${user.profile?.surname || user.profile?.lastName || ''}`.trim();
                                        return (
                                            <button
                                                type="button"
                                                key={user._id}
                                                onClick={() => setFormData((prev) => ({ ...prev, userId: user._id }))}
                                                className={`w-full border-b px-3 py-2 text-left text-sm hover:bg-muted/40 ${selected ? 'bg-primary/10' : ''}`}
                                            >
                                                <p className="font-medium">{displayName || user.email}</p>
                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                            {selectedUser && (
                                <p className="text-xs text-emerald-600">
                                    Selected: {selectedUser.profile?.firstName} {selectedUser.profile?.surname || selectedUser.profile?.lastName} ({selectedUser.email})
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Role</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={formData.roleName}
                                onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                                required
                            >
                                {roles.map((role) => (
                                    <option key={role._id} value={role.name}>{role.name} (L{role.level || '-'})</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Designation</Label>
                            <Input value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                        </div>
                        <div className="col-span-2 flex justify-end mt-2">
                            <Button type="submit" className="ring-2 ring-primary/30">Hire Into Organization</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                <div className="p-4 border-b bg-muted/50 flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                        className="border-none shadow-none bg-transparent focus-visible:ring-0 h-auto p-0"
                        placeholder="Search employees..."
                        value={employeeQuery}
                        onChange={(e) => setEmployeeQuery(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="divide-y">
                        <div className="grid grid-cols-8 gap-4 p-4 font-medium text-sm text-muted-foreground bg-muted/20">
                            <div className="col-span-2">Name</div>
                            <div>Designation</div>
                            <div>Role</div>
                            <div>Status</div>
                            <div>AI Resume</div>
                            <div className="col-span-2">Actions</div>
                        </div>

                        {filteredEmployees.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <UserPlus className="h-6 w-6 opacity-50" />
                                </div>
                                <h3 className="text-lg font-medium text-foreground">No employees found</h3>
                                <p>Hire from existing registered users.</p>
                            </div>
                        ) : (
                            filteredEmployees.map((emp) => (
                                <div key={emp._id} className="p-4 grid grid-cols-8 gap-4 text-sm items-center hover:bg-muted/50 transition-colors">
                                    <div className="col-span-2 flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-medium text-xs">
                                            {emp.userId?.profile?.firstName?.[0]}{emp.userId?.profile?.lastName?.[0]}
                                        </div>
                                        <div>
                                            <div className="font-medium">{emp.userId?.profile?.firstName} {emp.userId?.profile?.lastName}</div>
                                            <div className="text-xs text-muted-foreground">{emp.userId?.email}</div>
                                        </div>
                                    </div>
                                    <div className="text-muted-foreground">{emp.designation || '-'}</div>
                                    <div>
                                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                            {emp.roleId?.name}
                                        </span>
                                    </div>
                                    <div>
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${emp.status === 'ACTIVE' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'}`}>
                                            {emp.status}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold">{emp.aiResumeRating?.score || 0}</span>
                                    </div>
                                    <div className="col-span-2 flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="ring-1 ring-primary/30"
                                            disabled={Boolean(ratingBusyId)}
                                            isLoading={ratingBusyId === emp._id}
                                            onClick={() => runAiResumeRating(emp)}
                                        >
                                            <BrainCircuit className="mr-1 h-3.5 w-3.5" /> AI Rate
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="ring-1 ring-primary/30"
                                            onClick={() => openOverview(emp._id)}
                                        >
                                            <Eye className="mr-1 h-3.5 w-3.5" /> Overview
                                        </Button>
                                    </div>
                                    <div className="col-span-8 text-xs text-muted-foreground">
                                        Structure:
                                        {' '}
                                        Reports To
                                        {' '}
                                        <span className="font-medium text-foreground">
                                            {`${emp.reportsToEmploymentId?.userId?.profile?.firstName || ''} ${emp.reportsToEmploymentId?.userId?.profile?.surname || emp.reportsToEmploymentId?.userId?.profile?.lastName || ''}`.trim() || 'Top Level / No Manager'}
                                        </span>
                                        {emp.reportsToEmploymentId?.roleId?.name ? ` (${emp.reportsToEmploymentId.roleId.name})` : ''}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {pageError && (
                <div className="rounded-md border bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {pageError}
                </div>
            )}

            {selectedEmployeeId && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-3">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl border bg-white p-5 text-slate-900 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-semibold">Employee Overview</h3>
                            <Button variant="outline" onClick={closeOverview}>Close</Button>
                        </div>

                        {overviewLoading || !employeeOverview ? (
                            <div className="flex justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
                        ) : (
                            <div className="space-y-5">
                                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                    <InfoBox label="Name" value={`${employeeOverview.employment?.userId?.profile?.firstName || ''} ${employeeOverview.employment?.userId?.profile?.surname || employeeOverview.employment?.userId?.profile?.lastName || ''}`.trim()} />
                                    <InfoBox label="Email" value={employeeOverview.employment?.userId?.email || '-'} />
                                    <InfoBox label="Role" value={employeeOverview.employment?.roleId?.name || '-'} />
                                    <InfoBox label="Employment Status" value={employeeOverview.employment?.status || '-'} />
                                    <InfoBox label="Designation" value={employeeOverview.employment?.designation || '-'} />
                                    <InfoBox label="Department" value={employeeOverview.employment?.department || '-'} />
                                    <InfoBox label="Joined On" value={formatDate(employeeOverview.employment?.joinedAt)} />
                                    <InfoBox
                                        label="Reports To"
                                        value={`${employeeOverview.employment?.reportsToEmploymentId?.userId?.profile?.firstName || ''} ${employeeOverview.employment?.reportsToEmploymentId?.userId?.profile?.surname || employeeOverview.employment?.reportsToEmploymentId?.userId?.profile?.lastName || ''}`.trim() || '-'}
                                    />
                                    <InfoBox label="AI Resume Score" value={String(employeeOverview.employment?.aiResumeRating?.score || 0)} />
                                    <InfoBox label="Attendance (Present)" value={String(employeeOverview.attendanceSummary?.PRESENT || 0)} />
                                    <InfoBox label="Org Asset Value (Issued)" value={formatMoney(employeeOverview.assetStats?.issuedValueTotal || 0)} />
                                    <InfoBox label="Org Asset Value (Returned)" value={formatMoney(employeeOverview.assetStats?.returnedValueTotal || 0)} />
                                    <InfoBox label="Org Asset Loss/Damage" value={formatMoney(employeeOverview.assetStats?.lostOrDamagedValueTotal || 0)} />
                                    <InfoBox label="Current Salary (Net)" value={formatMoney(employeeOverview.salaryStats?.latestNetPayable || 0)} />
                                    <InfoBox label="Basic Salary" value={formatMoney(employeeOverview.salaryStats?.latestBasicSalary || 0)} />
                                    <InfoBox label="Paid This Month" value={formatMoney(employeeOverview.salaryStats?.totalPaidThisMonth || 0)} />
                                    <InfoBox label="Pending Salary" value={formatMoney(employeeOverview.salaryStats?.totalPendingThisMonth || 0)} />
                                </div>

                                <div className="rounded-lg border p-3">
                                    <h4 className="mb-2 font-semibold">Salary & Organization Support Snapshot</h4>
                                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm">
                                        <InfoBox label="Latest Payroll Status" value={employeeOverview.salaryStats?.latestPayrollStatus || '-'} />
                                        <InfoBox label="Latest Gross Salary" value={formatMoney(employeeOverview.salaryStats?.latestGrossSalary || 0)} />
                                        <InfoBox label="Latest Deductions" value={formatMoney(employeeOverview.salaryStats?.latestDeductionTotal || 0)} />
                                        <InfoBox label="Latest Allowances" value={formatMoney(employeeOverview.salaryStats?.latestAllowanceTotal || 0)} />
                                        <InfoBox label="Payroll Period Start" value={formatDate(employeeOverview.salaryStats?.latestPeriodStart)} />
                                        <InfoBox label="Payroll Period End" value={formatDate(employeeOverview.salaryStats?.latestPeriodEnd)} />
                                        <InfoBox label="Items Issued (Count)" value={String(employeeOverview.assetStats?.activeIssuedItems || 0)} />
                                        <InfoBox label="Items Total (Count)" value={String(employeeOverview.assetStats?.totalItems || 0)} />
                                    </div>
                                </div>

                                <div className="rounded-lg border p-3">
                                    <h4 className="mb-2 font-semibold flex items-center gap-2"><Package2 className="h-4 w-4" /> Add Issued Item</h4>
                                    <div className="grid gap-2 md:grid-cols-2">
                                        <Input placeholder="Item name" value={itemForm.itemName} onChange={(e) => setItemForm((s) => ({ ...s, itemName: e.target.value }))} />
                                        <Input placeholder="Category" value={itemForm.category} onChange={(e) => setItemForm((s) => ({ ...s, category: e.target.value }))} />
                                        <Input placeholder="Specs" value={itemForm.specs} onChange={(e) => setItemForm((s) => ({ ...s, specs: e.target.value }))} />
                                        <Input placeholder="Estimated value" type="number" value={itemForm.estimatedValue} onChange={(e) => setItemForm((s) => ({ ...s, estimatedValue: e.target.value }))} />
                                        <Input placeholder="Quantity" type="number" min="1" value={itemForm.quantity} onChange={(e) => setItemForm((s) => ({ ...s, quantity: e.target.value }))} />
                                        <Input placeholder="Notes" value={itemForm.notes} onChange={(e) => setItemForm((s) => ({ ...s, notes: e.target.value }))} />
                                    </div>
                                    <div className="mt-2 flex justify-end">
                                        <Button onClick={addItemToEmployee} className="ring-2 ring-primary/30">Add Item</Button>
                                    </div>
                                </div>

                                <div className="rounded-lg border p-3">
                                    <h4 className="mb-2 font-semibold">Issued/Mapped Items</h4>
                                    {!Array.isArray(employeeOverview.assets) || employeeOverview.assets.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No items assigned.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {employeeOverview.assets.map((item) => (
                                                <div key={item._id} className="rounded-md border bg-slate-50 p-3 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-semibold">{item.itemName}</p>
                                                        <span className="rounded-full border px-2 py-0.5 text-xs">{item.status}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-600">Category: {item.category || '-'} | Qty: {item.quantity}</p>
                                                    <p className="text-xs text-slate-600">Specs: {item.specs || '-'}</p>
                                                    <p className="text-xs text-slate-600">Estimated Value: {item.estimatedValue || 0}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const InfoBox = ({ label, value }) => (
    <div className="rounded-md border bg-slate-50 px-3 py-2">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium">{value || '-'}</p>
    </div>
);

const formatMoney = (value) => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
};

const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString();
};

export default EmployeeList;
