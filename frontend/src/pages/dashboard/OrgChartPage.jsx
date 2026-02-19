import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Loader2, User, Users } from 'lucide-react';

const OrgChartPage = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/organization/employees');
            setEmployees(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Group employees by Role for simple hierarchy visualization
    const owners = employees.filter(e => e.roleName === 'Owner');
    const admins = employees.filter(e => e.roleName === 'Admin');
    const managers = employees.filter(e => e.roleName === 'Manager' || e.roleName === 'HR Manager');
    const staff = employees.filter(e => ['Employee', 'Intern', 'Contractor'].includes(e.roleName) || !['Owner', 'Admin', 'Manager', 'HR Manager'].includes(e.roleName));

    const Node = ({ employee, color }) => (
        <div className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 ${color} bg-card shadow-sm w-48 transition-transform hover:scale-105`}>
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2 overflow-hidden">
                {employee.userId?.profile?.avatar ? (
                    <img src={employee.userId.profile.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                    <User className="h-6 w-6 text-muted-foreground" />
                )}
            </div>
            <div className="font-bold text-sm text-center truncate w-full">{employee.firstName} {employee.lastName}</div>
            <div className="text-xs text-muted-foreground">{employee.designation || employee.roleName}</div>
        </div>
    );

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 text-center">
            <div className="text-left">
                <h1 className="text-3xl font-bold tracking-tight">Organization Chart</h1>
                <p className="text-muted-foreground">Automatic hierarchy visualization based on roles.</p>
            </div>

            <div className="flex flex-col items-center space-y-8 overflow-auto py-8">

                {/* Level 1: Owners */}
                <div className="flex gap-8 justify-center">
                    {owners.map(e => <Node key={e._id} employee={e} color="border-purple-500" />)}
                </div>

                {/* Connector */}
                {owners.length > 0 && admins.length > 0 && <div className="h-8 w-0.5 bg-border"></div>}

                {/* Level 2: Admins */}
                {admins.length > 0 && (
                    <div className="flex gap-8 justify-center relative">
                        {/* Horizontal connector line if multiple */}
                        <div className="absolute -top-4 left-10 right-10 h-4 border-t-2 border-border rounded-t-xl"></div>
                        {admins.map(e => <Node key={e._id} employee={e} color="border-blue-500" />)}
                    </div>
                )}

                {/* Connector */}
                {admins.length > 0 && managers.length > 0 && <div className="h-8 w-0.5 bg-border"></div>}

                {/* Level 3: Managers */}
                {managers.length > 0 && (
                    <div className="flex gap-8 justify-center flex-wrap max-w-4xl relative">
                        {/* Horizontal connector */}
                        <div className="absolute -top-4 left-20 right-20 h-4 border-t-2 border-border rounded-t-xl"></div>
                        {managers.map(e => <Node key={e._id} employee={e} color="border-green-500" />)}
                    </div>
                )}

                {/* Connector */}
                {managers.length > 0 && staff.length > 0 && <div className="h-8 w-0.5 bg-border"></div>}

                {/* Level 4: Staff */}
                {staff.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-6xl relative">
                        {/* Horizontal connector logic is hard for grid, simplifying */}
                        <div className="col-span-full absolute -top-4 left-1/3 right-1/3 h-4 border-t-2 border-border rounded-t-xl"></div>
                        {staff.map(e => <Node key={e._id} employee={e} color="border-muted" />)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrgChartPage;
