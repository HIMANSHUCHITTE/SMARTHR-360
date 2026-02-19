import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import {
    Loader2, Users, Building2, Activity, Server,
    AlertTriangle, CheckCircle, ShieldAlert,
    Ticket, Bell, Eye, Ban, Check, Megaphone
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [organizations, setOrganizations] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [announcement, setAnnouncement] = useState({ title: '', message: '' });
    const [busyOrg, setBusyOrg] = useState('');
    const [busyTicket, setBusyTicket] = useState('');
    const [message, setMessage] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [analyticsResp, orgResp, ticketResp] = await Promise.all([
                api.get('/admin/analytics'),
                api.get('/admin/organizations'),
                api.get('/admin/tickets'),
            ]);
            setStats(analyticsResp.data);
            setOrganizations(orgResp.data || []);
            setTickets(ticketResp.data || []);
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
            setMessage(error.response?.data?.message || 'Failed to load admin dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const updateOrgStatus = async (id, platformStatus) => {
        setBusyOrg(id);
        setMessage('');
        try {
            await api.patch(`/admin/organizations/${id}/status`, { platformStatus });
            await fetchAll();
            setMessage(`Organization ${platformStatus.toLowerCase()} successfully.`);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to update organization status');
        } finally {
            setBusyOrg('');
        }
    };

    const updateTicket = async (id, status) => {
        setBusyTicket(id);
        setMessage('');
        try {
            await api.patch(`/admin/tickets/${id}`, { status });
            await fetchAll();
            setMessage(`Ticket moved to ${status}.`);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to update ticket');
        } finally {
            setBusyTicket('');
        }
    };

    const sendAnnouncement = async () => {
        if (!announcement.title.trim() || !announcement.message.trim()) {
            setMessage('Announcement title and message are required.');
            return;
        }
        setMessage('');
        try {
            await api.post('/admin/announcements', {
                title: announcement.title,
                message: announcement.message,
                audience: 'ALL',
                severity: 'INFO',
            });
            setAnnouncement({ title: '', message: '' });
            setMessage('Announcement published.');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to publish announcement');
        }
    };

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="animate-page-in space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">SuperAdmin Governance</h1>
                    <p className="text-muted-foreground">Platform health, compliance, organization approvals and support control.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={sendAnnouncement}><Bell className="mr-2 h-4 w-4" /> Publish Announcement</Button>
                    <Button variant="outline" onClick={fetchAll}><Activity className="mr-2 h-4 w-4" /> Refresh</Button>
                </div>
            </div>

            <div className="stagger-children grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="Total Organizations" value={stats.totalOrgs} subValue={`${stats.activeOrgs} Active`} icon={<Building2 className="h-4 w-4 text-muted-foreground" />} />
                <StatsCard title="Total Users" value={stats.totalUsers} subValue={`${stats.totalEmployments} Employed`} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
                <StatsCard title="API Requests" value={stats.apiRequests?.toLocaleString()} subValue="Last 24h" icon={<Server className="h-4 w-4 text-muted-foreground" />} />
                <StatsCard title="System Health" value="99.9%" subValue={`Error Rate: ${stats.errorRate}%`} icon={<Activity className="h-4 w-4 text-green-500" />} />
            </div>

            <div className="glass-card interactive-card p-6 space-y-3">
                <h3 className="font-semibold flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /> Announcement Center</h3>
                <div className="grid gap-3 md:grid-cols-2">
                    <input className="h-10 rounded-md border bg-background px-3 text-sm" value={announcement.title} onChange={(e) => setAnnouncement((s) => ({ ...s, title: e.target.value }))} placeholder="Announcement title" />
                    <input className="h-10 rounded-md border bg-background px-3 text-sm" value={announcement.message} onChange={(e) => setAnnouncement((s) => ({ ...s, message: e.target.value }))} placeholder="Announcement message" />
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <div className="glass-card interactive-card p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Company Approval / Monitoring</h3>
                        <Button variant="ghost" size="sm" onClick={fetchAll}><Eye className="mr-1 h-4 w-4" />Reload</Button>
                    </div>
                    <div className="space-y-3">
                        {organizations.slice(0, 8).map((org) => (
                            <div key={org.id} className="rounded-lg border bg-background/60 p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold">{org.name}</p>
                                        <p className="text-xs text-muted-foreground">Owner: {org.owner?.email || 'N/A'} | Plan: {org.subscription?.planId || 'FREE'}</p>
                                        <p className="text-xs text-muted-foreground">Employees: {org.employeeCount} | Jobs: {org.activeJobs}</p>
                                    </div>
                                    <span className="rounded-full border px-2 py-0.5 text-[11px]">{org.platformStatus}</span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" disabled={Boolean(busyOrg)} isLoading={busyOrg === org.id} onClick={() => updateOrgStatus(org.id, 'APPROVED')}><Check className="mr-1 h-3.5 w-3.5" />Approve</Button>
                                    <Button size="sm" variant="outline" disabled={Boolean(busyOrg)} isLoading={busyOrg === org.id} onClick={() => updateOrgStatus(org.id, 'SUSPENDED')}><Ban className="mr-1 h-3.5 w-3.5" />Suspend</Button>
                                    <Button size="sm" variant="outline" disabled={Boolean(busyOrg)} isLoading={busyOrg === org.id} onClick={() => updateOrgStatus(org.id, 'REJECTED')}><AlertTriangle className="mr-1 h-3.5 w-3.5" />Reject</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card interactive-card p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2"><Ticket className="h-5 w-5 text-primary" /> Support Ticket Monitoring</h3>
                        <Button variant="ghost" size="sm" onClick={fetchAll}><Eye className="mr-1 h-4 w-4" />Reload</Button>
                    </div>
                    <div className="space-y-3">
                        {tickets.slice(0, 8).map((ticket) => (
                            <div key={ticket._id} className="rounded-lg border bg-background/60 p-3">
                                <p className="font-semibold">{ticket.subject}</p>
                                <p className="text-xs text-muted-foreground">Org: {ticket.organizationId?.name || 'N/A'} | Priority: {ticket.priority} | Status: {ticket.status}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" disabled={Boolean(busyTicket)} isLoading={busyTicket === ticket._id} onClick={() => updateTicket(ticket._id, 'IN_PROGRESS')}>In Progress</Button>
                                    <Button size="sm" variant="outline" disabled={Boolean(busyTicket)} isLoading={busyTicket === ticket._id} onClick={() => updateTicket(ticket._id, 'RESOLVED')}><CheckCircle className="mr-1 h-3.5 w-3.5" />Resolve</Button>
                                    <Button size="sm" variant="outline" disabled={Boolean(busyTicket)} isLoading={busyTicket === ticket._id} onClick={() => updateTicket(ticket._id, 'CLOSED')}>Close</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="glass-card interactive-card p-6">
                <h3 className="font-semibold mb-4">Subscription Distribution</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="rounded-lg bg-muted/30 p-4">
                        <div className="text-2xl font-bold">{stats.planStats?.free || 0}</div>
                        <div className="text-sm text-muted-foreground">Free Plan</div>
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                        <div className="text-2xl font-bold text-primary">{stats.planStats?.pro || 0}</div>
                        <div className="text-sm text-muted-foreground">Pro Plan</div>
                    </div>
                    <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
                        <div className="text-2xl font-bold text-purple-500">{stats.planStats?.enterprise || 0}</div>
                        <div className="text-sm text-muted-foreground">Enterprise</div>
                    </div>
                </div>
            </div>

            {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
    );
};

const StatsCard = ({ title, value, subValue, icon }) => (
    <div className="glass-card interactive-card p-6">
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">{title}</h3>
            {icon}
        </div>
        <div>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{subValue}</p>
        </div>
    </div>
);

export default AdminDashboard;
