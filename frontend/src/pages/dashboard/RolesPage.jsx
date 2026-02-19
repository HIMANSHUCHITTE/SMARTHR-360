import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Shield, Loader2, Save } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';

const emptyRoleForm = {
    name: '',
    level: 10,
};

const parseNullableNumber = (value) => {
    if (value === '' || value === null || typeof value === 'undefined') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
};

const RolesPage = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newRoleForm, setNewRoleForm] = useState(emptyRoleForm);
    const [catalog, setCatalog] = useState({ modules: [], actions: [] });
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [editState, setEditState] = useState({
        permissionsCsv: '',
        access: [],
        limits: {
            maxUsersPerRole: '',
            maxDirectReports: '',
            maxMonthlyApprovals: '',
            maxPayrollApprovalAmount: '',
        },
    });

    useEffect(() => {
        fetchRolesAndCatalog();
    }, []);

    const selectedRole = useMemo(
        () => roles.find((role) => String(role._id) === String(selectedRoleId)) || null,
        [roles, selectedRoleId]
    );

    const fetchRolesAndCatalog = async () => {
        setLoading(true);
        try {
            const [rolesResp, catalogResp] = await Promise.all([
                api.get('/roles'),
                api.get('/roles/permission-catalog'),
            ]);
            const roleList = Array.isArray(rolesResp.data) ? rolesResp.data : [];
            const roleCatalog = catalogResp.data || { modules: [], actions: [] };
            setRoles(roleList);
            setCatalog(roleCatalog);

            if (roleList.length > 0) {
                const defaultRole = roleList[0];
                setSelectedRoleId(defaultRole._id);
                hydrateEditState(defaultRole, roleCatalog.modules || []);
            }
        } catch (error) {
            console.error('Failed to fetch roles:', error);
        } finally {
            setLoading(false);
        }
    };

    const hydrateEditState = (role, modules) => {
        const moduleSet = Array.isArray(modules) ? modules : [];
        const roleAccessMap = new Map((Array.isArray(role.access) ? role.access : []).map((item) => [String(item.module || ''), item]));

        const access = moduleSet.map((module) => {
            const row = roleAccessMap.get(module) || {};
            return {
                module,
                read: Boolean(row.read),
                write: Boolean(row.write),
                approve: Boolean(row.approve),
            };
        });

        setEditState({
            permissionsCsv: Array.isArray(role.permissions) ? role.permissions.join(', ') : '',
            access,
            limits: {
                maxUsersPerRole: role?.limits?.maxUsersPerRole ?? '',
                maxDirectReports: role?.limits?.maxDirectReports ?? '',
                maxMonthlyApprovals: role?.limits?.maxMonthlyApprovals ?? '',
                maxPayrollApprovalAmount: role?.limits?.maxPayrollApprovalAmount ?? '',
            },
        });
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                name: newRoleForm.name,
                level: Number(newRoleForm.level),
                permissions: [],
                access: [],
                limits: {},
            };
            const res = await api.post('/roles', payload);
            const updated = [...roles, res.data].sort((a, b) => Number(a.level || 999) - Number(b.level || 999));
            setRoles(updated);
            setNewRoleForm(emptyRoleForm);
            setIsCreating(false);
            setSelectedRoleId(res.data._id);
            hydrateEditState(res.data, catalog.modules || []);
        } catch (error) {
            console.error('Failed to create role:', error);
            alert(error.response?.data?.message || 'Failed to create role');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRole = async (id) => {
        if (!window.confirm('Are you sure you want to delete this role?')) return;
        try {
            await api.delete(`/roles/${id}`);
            const nextRoles = roles.filter((role) => role._id !== id);
            setRoles(nextRoles);
            if (String(selectedRoleId) === String(id)) {
                const nextSelected = nextRoles[0] || null;
                setSelectedRoleId(nextSelected?._id || '');
                if (nextSelected) hydrateEditState(nextSelected, catalog.modules || []);
            }
        } catch (error) {
            console.error('Failed to delete role:', error);
            alert(error.response?.data?.message || 'Failed to delete role');
        }
    };

    const handleSelectRole = (role) => {
        setSelectedRoleId(role._id);
        hydrateEditState(role, catalog.modules || []);
    };

    const toggleAccess = (module, action) => {
        setEditState((prev) => ({
            ...prev,
            access: prev.access.map((item) => (
                item.module === module ? { ...item, [action]: !item[action] } : item
            )),
        }));
    };

    const saveRoleConfig = async () => {
        if (!selectedRole) return;
        setSaving(true);
        try {
            const permissions = editState.permissionsCsv
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);

            const payload = {
                permissions,
                access: editState.access,
                limits: {
                    maxUsersPerRole: parseNullableNumber(editState.limits.maxUsersPerRole),
                    maxDirectReports: parseNullableNumber(editState.limits.maxDirectReports),
                    maxMonthlyApprovals: parseNullableNumber(editState.limits.maxMonthlyApprovals),
                    maxPayrollApprovalAmount: parseNullableNumber(editState.limits.maxPayrollApprovalAmount),
                },
            };

            const { data } = await api.patch(`/roles/${selectedRole._id}`, payload);
            setRoles((prev) => prev.map((role) => (role._id === data._id ? data : role)));
            alert('Role permissions/limits updated');
        } catch (error) {
            console.error('Failed to save role config:', error);
            alert(error.response?.data?.message || 'Failed to update role');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
                    <p className="text-muted-foreground">Owner can decide module access and limits for each role.</p>
                </div>
                <Button onClick={() => setIsCreating(!isCreating)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Role
                </Button>
            </div>

            {isCreating && (
                <div className="glass-card p-6 rounded-xl animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleCreateRole} className="grid gap-3 md:grid-cols-3 md:items-end">
                        <div className="grid gap-1.5">
                            <Label htmlFor="roleName">Role Name</Label>
                            <Input
                                id="roleName"
                                placeholder="e.g. Senior Manager"
                                value={newRoleForm.name}
                                onChange={(e) => setNewRoleForm((s) => ({ ...s, name: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="roleLevel">Role Level</Label>
                            <Input
                                id="roleLevel"
                                type="number"
                                min="2"
                                value={newRoleForm.level}
                                onChange={(e) => setNewRoleForm((s) => ({ ...s, level: e.target.value }))}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={saving} isLoading={saving}>Save Role</Button>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
                    <div className="space-y-3">
                        {roles.map((role) => (
                            <button
                                key={role._id}
                                onClick={() => handleSelectRole(role)}
                                className={`w-full rounded-xl border p-4 text-left transition ${String(selectedRoleId) === String(role._id) ? 'border-primary bg-primary/5' : 'bg-card/60 hover:bg-card/80'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-lg ${role.isSystem ? 'bg-indigo-500/10 text-indigo-500' : 'bg-primary/10 text-primary'}`}>
                                            <Shield className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{role.name}</p>
                                            <p className="text-xs text-muted-foreground">Level {role.level || '-'}</p>
                                        </div>
                                    </div>
                                    {!role.isSystem && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleDeleteRole(role._id);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="rounded-xl border bg-card/70 p-5">
                        {!selectedRole ? (
                            <p className="text-sm text-muted-foreground">Select a role to configure permissions and limits.</p>
                        ) : (
                            <div className="space-y-5">
                                <div>
                                    <h3 className="text-lg font-semibold">{selectedRole.name} Configuration</h3>
                                    <p className="text-xs text-muted-foreground">Set module-wise access + role limits.</p>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Extra Permission Codes (comma separated)</Label>
                                    <Input
                                        value={editState.permissionsCsv}
                                        onChange={(e) => setEditState((s) => ({ ...s, permissionsCsv: e.target.value }))}
                                        placeholder="employees:view, payroll:approve"
                                    />
                                </div>

                                <div>
                                    <Label>Module Access Matrix</Label>
                                    <div className="mt-2 space-y-2">
                                        {editState.access.map((row) => (
                                            <div key={row.module} className="rounded-md border bg-background/70 p-3">
                                                <div className="mb-2 font-medium capitalize">{row.module.replace('_', ' ')}</div>
                                                <div className="flex flex-wrap gap-4 text-sm">
                                                    {['read', 'write', 'approve'].map((action) => (
                                                        <label key={`${row.module}-${action}`} className="inline-flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(row[action])}
                                                                onChange={() => toggleAccess(row.module, action)}
                                                            />
                                                            <span className="capitalize">{action}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <Label>Limits</Label>
                                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                                        <LimitInput
                                            label="Max users in this role"
                                            value={editState.limits.maxUsersPerRole}
                                            onChange={(value) => setEditState((s) => ({ ...s, limits: { ...s.limits, maxUsersPerRole: value } }))}
                                        />
                                        <LimitInput
                                            label="Max direct reports"
                                            value={editState.limits.maxDirectReports}
                                            onChange={(value) => setEditState((s) => ({ ...s, limits: { ...s.limits, maxDirectReports: value } }))}
                                        />
                                        <LimitInput
                                            label="Max monthly approvals"
                                            value={editState.limits.maxMonthlyApprovals}
                                            onChange={(value) => setEditState((s) => ({ ...s, limits: { ...s.limits, maxMonthlyApprovals: value } }))}
                                        />
                                        <LimitInput
                                            label="Max payroll approval amount"
                                            value={editState.limits.maxPayrollApprovalAmount}
                                            onChange={(value) => setEditState((s) => ({ ...s, limits: { ...s.limits, maxPayrollApprovalAmount: value } }))}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button onClick={saveRoleConfig} isLoading={saving} disabled={saving}>
                                        <Save className="mr-2 h-4 w-4" /> Save Role Configuration
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const LimitInput = ({ label, value, onChange }) => (
    <div className="grid gap-1">
        <Label>{label}</Label>
        <Input
            type="number"
            min="0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Leave blank for no limit"
        />
    </div>
);

export default RolesPage;
