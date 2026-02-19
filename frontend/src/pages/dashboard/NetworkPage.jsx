import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { UserPlus, Search, User, Briefcase, Loader2, Users } from 'lucide-react';

const NetworkPage = () => {
    const [searchParams] = useSearchParams();
    const [connections, setConnections] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState('');
    const [query, setQuery] = useState(searchParams.get('q') || '');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const run = async () => {
            const q = query.trim();
            if (q.length < 2) return;
            try {
                const { data } = await api.get(`/network/search?q=${encodeURIComponent(q)}`);
                setSuggestions(data || []);
            } catch (error) {
                console.error(error);
            }
        };
        run();
    }, [query]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [connectionsResp, suggestionsResp] = await Promise.all([
                api.get('/network/connections'),
                api.get('/network/suggestions'),
            ]);
            setConnections(connectionsResp.data);
            setSuggestions(suggestionsResp.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (userId) => {
        setBusyId(userId);
        try {
            await api.post(`/network/connect/${userId}`);
            setSuggestions((prev) => prev.filter((user) => user._id !== userId));
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to connect');
        } finally {
            setBusyId('');
        }
    };

    const filteredSuggestions = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return suggestions;
        return suggestions.filter((user) => {
            const fullName = `${user.profile?.firstName || ''} ${user.profile?.surname || user.profile?.lastName || ''}`.toLowerCase();
            const headline = (user.professional?.headline || '').toLowerCase();
            return fullName.includes(normalized) || headline.includes(normalized);
        });
    }, [suggestions, query]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Professional Network</h1>
                    <p className="text-muted-foreground">Build meaningful, role-based connections like a social professional graph.</p>
                </div>
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Search people by name or headline"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : (
                <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
                    <section className="glass-card rounded-xl p-5">
                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                            <Users className="h-5 w-5 text-primary" />
                            My Connections ({connections.length})
                        </h2>
                        {connections.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No accepted connections yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {connections.map((user) => (
                                    <div key={user._id} className="flex items-center gap-3 rounded-lg border bg-background/70 p-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold">
                                                {user.profile?.firstName} {user.profile?.surname || user.profile?.lastName}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">{user.professional?.headline || 'Professional Member'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="glass-card rounded-xl p-5">
                        <h2 className="mb-4 text-lg font-semibold">People You May Know ({filteredSuggestions.length})</h2>
                        {filteredSuggestions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No matching suggestions.</p>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {filteredSuggestions.map((user) => (
                                    <article key={user._id} className="rounded-xl border bg-background/70 p-4">
                                        <div className="mb-3 h-16 rounded-lg bg-gradient-to-r from-primary/25 to-accent/25"></div>
                                        <div className="-mt-7 flex h-12 w-12 items-center justify-center rounded-full border bg-card text-primary">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div className="mt-2">
                                            <h3 className="font-semibold">
                                                {user.profile?.firstName} {user.profile?.surname || user.profile?.lastName}
                                            </h3>
                                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                                <Briefcase className="h-3 w-3" />
                                                {user.professional?.headline || 'Open to opportunities'}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="mt-3 w-full"
                                            onClick={() => handleConnect(user._id)}
                                            isLoading={busyId === user._id}
                                            disabled={Boolean(busyId)}
                                        >
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Connect
                                        </Button>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
};

export default NetworkPage;
