import React, { useEffect, useMemo, useState } from 'react';
import { CheckCheck, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

    const loadNotifications = async ({ silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
        }
        setMessage('');
        try {
            const { data } = await api.get('/notifications');
            setNotifications(Array.isArray(data) ? data : []);
            setLastUpdatedAt(new Date());
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to load notifications');
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    useEffect(() => {
        if (!autoRefresh) return undefined;
        const timer = setInterval(() => loadNotifications({ silent: true }), 15000);
        return () => clearInterval(timer);
    }, [autoRefresh]);

    const unreadCount = useMemo(
        () => notifications.filter((item) => !item.isRead).length,
        [notifications]
    );

    const categories = useMemo(() => {
        const found = new Set(['ALL']);
        notifications.forEach((item) => {
            const key = String(item.category || 'GENERAL').toUpperCase();
            found.add(key);
        });
        return Array.from(found);
    }, [notifications]);

    const filteredNotifications = useMemo(() => {
        if (activeCategory === 'ALL') return notifications;
        return notifications.filter((item) => String(item.category || 'GENERAL').toUpperCase() === activeCategory);
    }, [activeCategory, notifications]);

    const markRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications((prev) => prev.map((item) => (
                item._id === id ? { ...item, isRead: true } : item
            )));
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to mark as read');
        }
    };

    const deleteOne = async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications((prev) => prev.filter((item) => item._id !== id));
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to delete notification');
        }
    };

    const clearAll = async () => {
        setBusy(true);
        setMessage('');
        try {
            const { data } = await api.delete('/notifications');
            setNotifications([]);
            setMessage(`Cleared ${data?.deletedCount || 0} notifications.`);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to clear notifications');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mx-auto max-w-4xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold">Notifications</h1>
                    <p className="text-sm text-muted-foreground">All dashboard alerts in one place.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full border bg-background px-3 py-1 text-xs">
                        Unread: {unreadCount}
                    </span>
                    <Button variant="outline" onClick={clearAll} disabled={busy || notifications.length === 0} isLoading={busy}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear All
                    </Button>
                    <Button variant="outline" onClick={() => loadNotifications()} disabled={loading}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={() => setAutoRefresh((v) => !v)}>
                        Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
                    </Button>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {categories.map((category) => (
                    <button
                        key={category}
                        type="button"
                        onClick={() => setActiveCategory(category)}
                        className={`rounded-full border px-3 py-1 text-xs ${activeCategory === category ? 'border-primary bg-primary/10 text-primary' : 'bg-background text-muted-foreground'}`}
                    >
                        {category}
                    </button>
                ))}
                {lastUpdatedAt && (
                    <span className="ml-auto text-xs text-muted-foreground">
                        Last update: {lastUpdatedAt.toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div className="glass-card rounded-xl p-4">
                {loading ? (
                    <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="rounded-lg border bg-background/70 p-8 text-center text-sm text-muted-foreground">
                        No notifications.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredNotifications.map((item) => (
                            <div
                                key={item._id}
                                className={`rounded-lg border p-3 ${item.isRead ? 'bg-background/70' : 'bg-primary/10 border-primary/35'}`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-semibold">
                                                {String(item.category || 'GENERAL').toUpperCase()}
                                            </span>
                                            <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-semibold">
                                                {String(item.source || 'SYSTEM').toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="font-semibold">{item.title || 'Update'}</p>
                                        <p className="text-sm text-muted-foreground">{item.message || 'You have a new update.'}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {new Date(item.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!item.isRead && (
                                            <Button variant="outline" size="sm" onClick={() => markRead(item._id)}>
                                                <CheckCheck className="mr-1 h-4 w-4" />
                                                Mark Read
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => deleteOne(item._id)}>
                                            <Trash2 className="mr-1 h-4 w-4" />
                                            Delete
                                        </Button>
                                    </div>
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

export default NotificationsPage;
