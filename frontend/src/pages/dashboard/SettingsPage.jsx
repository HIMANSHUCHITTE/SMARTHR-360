import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { LifeBuoy } from 'lucide-react';

const SettingsPage = () => {
    const navigate = useNavigate();
    const logout = useAuthStore((state) => state.logout);
    const panel = useAuthStore((state) => state.panel);

    const [settings, setSettings] = useState({
        language: 'en',
        theme: 'system',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD-MM-YYYY',
        emailNotifications: true,
        desktopNotifications: true,
        weeklyDigest: true,
        compactMode: false,
        profileVisibility: 'PUBLIC',
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [ticketForm, setTicketForm] = useState({
        subject: '',
        description: '',
        priority: 'MEDIUM',
    });
    const [tickets, setTickets] = useState([]);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { data } = await api.get('/user/settings');
                setSettings({
                    language: data.preferences?.language || 'en',
                    theme: data.preferences?.theme || 'system',
                    timezone: data.preferences?.timezone || 'Asia/Kolkata',
                    dateFormat: data.preferences?.dateFormat || 'DD-MM-YYYY',
                    emailNotifications: Boolean(data.preferences?.emailNotifications),
                    desktopNotifications: Boolean(data.preferences?.desktopNotifications),
                    weeklyDigest: Boolean(data.preferences?.weeklyDigest),
                    compactMode: Boolean(data.preferences?.compactMode),
                    profileVisibility: data.preferences?.profileVisibility || 'PUBLIC',
                });
                const ticketsResp = await api.get('/support/tickets');
                setTickets(ticketsResp.data || []);
            } catch (error) {
                console.error('Failed to load settings', error);
            }
        };
        loadSettings();
    }, []);

    const saveSettings = async () => {
        setLoading(true);
        setMessage('');
        try {
            await api.patch('/user/settings', settings);
            localStorage.setItem('ui-theme', settings.theme);
            if (settings.theme === 'dark') document.documentElement.classList.add('dark');
            else if (settings.theme === 'light') document.documentElement.classList.remove('dark');
            setMessage('Settings saved successfully.');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const updatePassword = async () => {
        setLoading(true);
        setMessage('');
        try {
            await api.post('/user/change-password', passwordForm);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setMessage('Password updated.');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/auth/login');
    };

    const raiseTicket = async () => {
        if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
            setMessage('Ticket subject and description are required.');
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            await api.post('/support/tickets', ticketForm);
            const ticketsResp = await api.get('/support/tickets');
            setTickets(ticketsResp.data || []);
            setTicketForm({ subject: '', description: '', priority: 'MEDIUM' });
            setMessage('Support ticket created.');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to create ticket');
        } finally {
            setLoading(false);
        }
    };

    const helpPath = panel === 'OWNER'
        ? '/owner/help'
        : panel === 'SUBADMIN'
        ? '/subadmin/help'
        : panel === 'SUPERADMIN'
            ? '/superadmin/help'
            : panel === 'EMPLOYEE'
                ? '/subadmin/help'
                : '/user/help';

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-sm text-muted-foreground">Language, theme, notifications, privacy and security controls.</p>
                </div>
                <Link to={helpPath}>
                    <Button variant="outline">
                        <LifeBuoy className="mr-2 h-4 w-4" />
                        Help
                    </Button>
                </Link>
            </div>

            <div className="glass-card rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-semibold">Preferences</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Language">
                        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={settings.language} onChange={(e) => setSettings((s) => ({ ...s, language: e.target.value }))}>
                            <option value="en">English</option>
                            <option value="hi">Hindi</option>
                        </select>
                    </Field>

                    <Field label="Theme">
                        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={settings.theme} onChange={(e) => setSettings((s) => ({ ...s, theme: e.target.value }))}>
                            <option value="system">System</option>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </Field>

                    <Field label="Timezone">
                        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={settings.timezone} onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}>
                            <option value="Asia/Kolkata">Asia/Kolkata</option>
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">America/New_York</option>
                        </select>
                    </Field>

                    <Field label="Date Format">
                        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={settings.dateFormat} onChange={(e) => setSettings((s) => ({ ...s, dateFormat: e.target.value }))}>
                            <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                            <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                    </Field>

                    <Field label="Profile Visibility">
                        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={settings.profileVisibility} onChange={(e) => setSettings((s) => ({ ...s, profileVisibility: e.target.value }))}>
                            <option value="PUBLIC">Public</option>
                            <option value="PRIVATE">Private</option>
                        </select>
                    </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Toggle label="Email Notifications" checked={settings.emailNotifications} onChange={() => setSettings((s) => ({ ...s, emailNotifications: !s.emailNotifications }))} />
                    <Toggle label="Desktop Notifications" checked={settings.desktopNotifications} onChange={() => setSettings((s) => ({ ...s, desktopNotifications: !s.desktopNotifications }))} />
                    <Toggle label="Weekly Digest" checked={settings.weeklyDigest} onChange={() => setSettings((s) => ({ ...s, weeklyDigest: !s.weeklyDigest }))} />
                    <Toggle label="Compact Mode" checked={settings.compactMode} onChange={() => setSettings((s) => ({ ...s, compactMode: !s.compactMode }))} />
                </div>

                <Button onClick={saveSettings} isLoading={loading} disabled={loading}>Save Preferences</Button>
            </div>

            <div className="glass-card rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-semibold">Security</h2>
                <div className="grid gap-3">
                    <Field label="Current Password">
                        <Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((s) => ({ ...s, currentPassword: e.target.value }))} />
                    </Field>
                    <Field label="New Password">
                        <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((s) => ({ ...s, newPassword: e.target.value }))} />
                    </Field>
                    <Field label="Confirm New Password">
                        <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((s) => ({ ...s, confirmPassword: e.target.value }))} />
                    </Field>
                </div>
                <Button onClick={updatePassword} isLoading={loading} disabled={loading}>Update Password</Button>
            </div>

            <div className="glass-card rounded-xl p-6 space-y-3">
                <h2 className="text-lg font-semibold">Session</h2>
                <p className="text-sm text-muted-foreground">Logout safely from current device.</p>
                <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </div>

            <div className="glass-card rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-semibold">Support & Help</h2>
                <div className="grid gap-3">
                    <Field label="Subject">
                        <Input value={ticketForm.subject} onChange={(e) => setTicketForm((s) => ({ ...s, subject: e.target.value }))} placeholder="Issue summary" />
                    </Field>
                    <Field label="Description">
                        <textarea
                            className="min-h-[90px] w-full rounded-md border bg-background p-3 text-sm"
                            value={ticketForm.description}
                            onChange={(e) => setTicketForm((s) => ({ ...s, description: e.target.value }))}
                            placeholder="Describe your issue"
                        />
                    </Field>
                    <Field label="Priority">
                        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={ticketForm.priority} onChange={(e) => setTicketForm((s) => ({ ...s, priority: e.target.value }))}>
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                            <option value="URGENT">URGENT</option>
                        </select>
                    </Field>
                </div>
                <Button onClick={raiseTicket} isLoading={loading} disabled={loading}>Raise Ticket</Button>

                <div className="space-y-2 pt-2">
                    <p className="text-sm font-semibold">Recent Tickets</p>
                    {tickets.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No tickets yet.</p>
                    ) : (
                        tickets.slice(0, 5).map((ticket) => (
                            <div key={ticket._id} className="rounded border bg-background/60 p-2 text-xs">
                                <p className="font-semibold">{ticket.subject}</p>
                                <p className="text-muted-foreground">Status: {ticket.status} | Priority: {ticket.priority}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
    );
};

const Field = ({ label, children }) => (
    <div className="grid gap-1">
        <Label>{label}</Label>
        {children}
    </div>
);

const Toggle = ({ label, checked, onChange }) => (
    <button
        className={`h-10 rounded-md border px-3 text-sm text-left ${checked ? 'bg-primary/10 border-primary text-primary' : 'bg-background'}`}
        onClick={onChange}
    >
        {label}: {checked ? 'Enabled' : 'Disabled'}
    </button>
);

export default SettingsPage;
