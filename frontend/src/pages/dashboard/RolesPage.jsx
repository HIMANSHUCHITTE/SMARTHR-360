import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';

const RolesPage = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await api.get('/roles');
            setRoles(res.data);
        } catch (error) {
            console.error('Failed to fetch roles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/roles', { name: newRoleName, permissions: [] });
            setRoles([...roles, res.data]);
            setNewRoleName('');
            setIsCreating(false);
        } catch (error) {
            console.error('Failed to create role:', error);
            alert('Failed to create role');
        }
    };

    const handleDeleteRole = async (id) => {
        if (!window.confirm('Are you sure you want to delete this role?')) return;
        try {
            await api.delete(`/roles/${id}`);
            setRoles(roles.filter(role => role._id !== id));
        } catch (error) {
            console.error('Failed to delete role:', error);
            alert(error.response?.data?.message || 'Failed to delete role');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
                    <p className="text-muted-foreground">Manage access levels for your organization.</p>
                </div>
                <Button onClick={() => setIsCreating(!isCreating)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Role
                </Button>
            </div>

            {isCreating && (
                <div className="glass-card p-6 rounded-xl animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleCreateRole} className="flex gap-4 items-end">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="roleName">Role Name</Label>
                            <Input
                                id="roleName"
                                placeholder="e.g. Hiring Manager"
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                            />
                        </div>
                        <Button type="submit">Save Role</Button>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {roles.map((role) => (
                        <div key={role._id} className="relative group overflow-hidden rounded-xl border bg-card/50 hover:bg-card/80 transition-colors p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg ${role.isSystem ? 'bg-indigo-500/10 text-indigo-500' : 'bg-primary/10 text-primary'}`}>
                                        <Shield className="h-5 w-5" />
                                    </div>
                                    <h3 className="font-semibold text-lg">{role.name}</h3>
                                </div>
                                {!role.isSystem && (
                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRole(role._id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Permissions</p>
                                <div className="flex flex-wrap gap-2">
                                    {role.permissions?.length > 0 ? (
                                        role.permissions.slice(0, 3).map((perm, i) => (
                                            <span key={i} className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                                                {perm}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">No permissions assigned</span>
                                    )}
                                    {role.permissions?.length > 3 && (
                                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">+{role.permissions.length - 3} more</span>
                                    )}
                                </div>
                            </div>

                            {role.isSystem && (
                                <div className="mt-4 pt-4 border-t border-border/50">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Shield className="h-3 w-3" /> System Managed
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RolesPage;
