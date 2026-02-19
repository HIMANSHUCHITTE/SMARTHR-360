import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Calendar, CheckCircle, XCircle, Clock, Plus, Loader2 } from 'lucide-react';

const LeavePage = () => {
    const [leaves, setLeaves] = useState([]);
    const [isApplying, setIsApplying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        type: 'CASUAL',
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        try {
            const { data } = await api.get('/leaves/me');
            setLeaves(data);
        } catch (error) {
            console.error('Failed to fetch leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/leaves', formData);
            setLeaves([data, ...leaves]);
            setIsApplying(false);
            setFormData({ type: 'CASUAL', startDate: '', endDate: '', reason: '' });
            alert('Leave Application Submitted');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to apply');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
                    <p className="text-muted-foreground">Apply for time off and track status.</p>
                </div>
                <Button onClick={() => setIsApplying(!isApplying)}>
                    <Plus className="mr-2 h-4 w-4" /> Apply Leave
                </Button>
            </div>

            {isApplying && (
                <div className="glass-card p-6 rounded-xl border border-primary/20 bg-primary/5">
                    <h3 className="font-semibold mb-4">New Leave Request</h3>
                    <form onSubmit={handleApply} className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Leave Type</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="CASUAL">Casual Leave</option>
                                <option value="SICK">Sick Leave</option>
                                <option value="EARNED">Earned Leave</option>
                                <option value="UNPAID">Unpaid Leave</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Reason</Label>
                            <Input
                                placeholder="e.g. Family function"
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} required />
                        </div>
                        <div className="col-span-2 flex justify-end mt-2">
                            <Button type="submit">Submit Request</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                <div className="p-6 border-b">
                    <h3 className="font-semibold">My Leave History</h3>
                </div>
                <div className="p-0">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                    ) : leaves.length === 0 ? (
                        <p className="text-center p-8 text-muted-foreground">No leave history found.</p>
                    ) : (
                        <div className="divide-y">
                            {leaves.map(leave => (
                                <div key={leave._id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${leave.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                                                leave.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                                                    'bg-yellow-100 text-yellow-600'
                                            }`}>
                                            {leave.status === 'APPROVED' ? <CheckCircle className="h-5 w-5" /> :
                                                leave.status === 'REJECTED' ? <XCircle className="h-5 w-5" /> :
                                                    <Clock className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="font-medium">{leave.type} LEAVE</p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">Reason: {leave.reason}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${leave.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                leave.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {leave.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeavePage;
