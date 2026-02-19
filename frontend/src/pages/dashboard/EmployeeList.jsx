import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import api from '../../services/api';
import { Plus, Search, UserPlus, X, Loader2 } from 'lucide-react';

const EmployeeList = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        roleName: 'Employee',
        designation: '',
        department: ''
    });

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/organization/employees');
            setEmployees(data);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/organization/employees', formData);
            setEmployees([data.employment, ...employees]); // Optimistic update or use returned data structure
            setIsAdding(false);
            setFormData({ email: '', firstName: '', lastName: '', roleName: 'Employee', designation: '', department: '' });
            alert(`Employee invited successfully! Temporary password sent to ${formData.email} (Mock)`);
            fetchEmployees(); // Refresh to get full population
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to add employee');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
                    <p className="text-muted-foreground">Manage your team members and their roles.</p>
                </div>
                <Button onClick={() => setIsAdding(!isAdding)}>
                    {isAdding ? <X className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    {isAdding ? 'Cancel' : 'Add Employee'}
                </Button>
            </div>

            {isAdding && (
                <div className="glass-card p-6 rounded-xl border border-primary/20 bg-primary/5">
                    <h3 className="font-semibold mb-4">Invite New Employee</h3>
                    <form onSubmit={handleAddEmployee} className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>First Name</Label>
                            <Input
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Last Name</Label>
                            <Input
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Role (e.g. Admin, Manager, Employee)</Label>
                            <Input
                                value={formData.roleName}
                                onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Designation</Label>
                            <Input
                                value={formData.designation}
                                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Input
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2 flex justify-end mt-2">
                            <Button type="submit">Send Invitation</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                <div className="p-4 border-b bg-muted/50 flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input className="border-none shadow-none bg-transparent focus-visible:ring-0 h-auto p-0" placeholder="Search employees..." />
                </div>

                {loading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="divide-y">
                        <div className="grid grid-cols-5 gap-4 p-4 font-medium text-sm text-muted-foreground bg-muted/20">
                            <div className="col-span-2">Name</div>
                            <div>Designation</div>
                            <div>Role</div>
                            <div>Status</div>
                        </div>

                        {employees.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <UserPlus className="h-6 w-6 opacity-50" />
                                </div>
                                <h3 className="text-lg font-medium text-foreground">No employees found</h3>
                                <p>Get started by inviting your first team member.</p>
                            </div>
                        ) : (
                            employees.map(emp => (
                                <div key={emp._id} className="p-4 grid grid-cols-5 gap-4 text-sm items-center hover:bg-muted/50 transition-colors">
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
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${emp.status === 'ACTIVE'
                                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                                            }`}>
                                            {emp.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeList;
