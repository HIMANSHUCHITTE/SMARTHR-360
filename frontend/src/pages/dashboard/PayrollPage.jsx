import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';
import { DollarSign, Calendar, CheckCircle, Clock, Loader2 } from 'lucide-react';

const PayrollPage = () => {
    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [runningPayroll, setRunningPayroll] = useState(false);

    useEffect(() => {
        fetchPayrollRecords();
    }, []);

    const fetchPayrollRecords = async () => {
        try {
            const { data } = await api.get('/payroll');
            setPayrolls(data);
        } catch (error) {
            console.error('Failed to fetch payrolls:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRunPayroll = async () => {
        if (!window.confirm('Are you sure you want to run payroll for the current period?')) return;

        setRunningPayroll(true);
        try {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            await api.post('/payroll/run', {
                periodStart: startOfMonth,
                periodEnd: endOfMonth
            });

            alert('Payroll run successfully!');
            fetchPayrollRecords();
        } catch (error) {
            console.error(error);
            alert('Failed to run payroll');
        } finally {
            setRunningPayroll(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
                    <p className="text-muted-foreground">Manage ongoing and past payroll cycles.</p>
                </div>
                <Button onClick={handleRunPayroll} disabled={runningPayroll}>
                    {runningPayroll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
                    Run Payroll
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                    <div className="p-4 border-b bg-muted/50 grid grid-cols-5 gap-4 font-medium text-sm">
                        <div className="col-span-1">Period</div>
                        <div>Employee ID</div>
                        <div>Basic Salary</div>
                        <div>Net Payable</div>
                        <div>Status</div>
                    </div>

                    <div className="divide-y">
                        {payrolls.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-medium text-foreground">No payroll records found</h3>
                                <p>Run your first payroll to generate records.</p>
                            </div>
                        ) : (
                            payrolls.map(record => (
                                <div key={record.id} className="p-4 grid grid-cols-5 gap-4 text-sm items-center hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span>
                                            {new Date(record.periodStart).toLocaleDateString()} - {new Date(record.periodEnd).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="font-mono text-xs text-muted-foreground">
                                        {record.employeeId.substring(0, 8)}...
                                    </div>
                                    <div>${record.basicSalary}</div>
                                    <div className="font-bold text-green-600">${record.netPayable}</div>
                                    <div>
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${record.status === 'PAID'
                                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                                            }`}>
                                            {record.status === 'PAID' ? <CheckCircle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                                            {record.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollPage;
