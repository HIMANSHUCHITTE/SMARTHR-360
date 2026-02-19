import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { User, Send, Search, Plus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const ChatPage = () => {
    const { user } = useAuthStore();
    const [conversations, setConversations] = useState([]);
    const [activeUser, setActiveUser] = useState(null);
    const [thread, setThread] = useState([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get('/chat/conversations');
                setConversations(data || []);
                if (data?.length) setActiveUser(data[0].user);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const loadThread = async () => {
            if (!activeUser?._id) return;
            try {
                const { data } = await api.get(`/chat/thread/${activeUser._id}`);
                setThread(data || []);
            } catch (error) {
                console.error(error);
            }
        };
        loadThread();
    }, [activeUser]);

    useEffect(() => {
        const runSearch = async () => {
            const q = search.trim();
            if (q.length < 2) {
                setResults([]);
                return;
            }
            try {
                const { data } = await api.get(`/network/search?q=${encodeURIComponent(q)}`);
                setResults(Array.isArray(data) ? data.slice(0, 8) : []);
            } catch (error) {
                console.error(error);
            }
        };
        runSearch();
    }, [search]);

    const send = async () => {
        const text = message.trim();
        if (!text || !activeUser?._id) return;
        try {
            const { data } = await api.post(`/chat/thread/${activeUser._id}`, { text });
            setThread((prev) => [...prev, data]);
            setMessage('');
        } catch (error) {
            alert(error.response?.data?.message || 'Message failed');
        }
    };

    const activeName = useMemo(
        () => activeUser ? `${activeUser.profile?.firstName || ''} ${activeUser.profile?.surname || activeUser.profile?.lastName || ''}`.trim() : '',
        [activeUser]
    );

    const startChat = (peer) => {
        setActiveUser(peer);
        setSearch('');
        setResults([]);
        const exists = conversations.some((item) => String(item.user?._id) === String(peer?._id));
        if (!exists) {
            setConversations((prev) => [{ user: peer, lastMessage: 'Start conversation', lastAt: new Date() }, ...prev]);
        }
    };

    return (
        <div className="grid h-[calc(100vh-170px)] gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="glass-card rounded-xl p-3">
                <h2 className="mb-3 text-lg font-semibold">Chats</h2>
                <div className="mb-3 space-y-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search user/employee"
                        />
                    </div>
                    {results.length > 0 && (
                        <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border bg-background/80 p-2">
                            {results.map((item) => (
                                <button
                                    key={item._id}
                                    onClick={() => startChat(item)}
                                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                                >
                                    <span>{item.profile?.firstName} {item.profile?.surname || item.profile?.lastName}</span>
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                ) : conversations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No conversations yet. Connect with users first.</p>
                ) : (
                    <div className="space-y-2">
                        {conversations.map((conv) => {
                            const name = `${conv.user?.profile?.firstName || ''} ${conv.user?.profile?.surname || conv.user?.profile?.lastName || ''}`.trim();
                            return (
                                <button
                                    key={conv.user?._id}
                                    onClick={() => setActiveUser(conv.user)}
                                    className={`w-full rounded-lg border p-3 text-left ${activeUser?._id === conv.user?._id ? 'border-primary bg-primary/10' : 'bg-background/60'}`}
                                >
                                    <p className="font-semibold">{name || 'User'}</p>
                                    <p className="truncate text-xs text-muted-foreground">{conv.lastMessage}</p>
                                </button>
                            );
                        })}
                    </div>
                )}
            </aside>

            <section className="glass-card flex flex-col rounded-xl">
                <header className="border-b px-4 py-3">
                    <p className="font-semibold">{activeName || 'Select a conversation'}</p>
                </header>
                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                    {thread.map((msg) => {
                        const mine = String(msg.senderId?._id) === String(user?.id);
                        return (
                            <div key={msg._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[78%] rounded-xl px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
                                    {!mine && (
                                        <div className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                                            <User className="h-3 w-3" />
                                            {msg.senderId?.profile?.firstName || 'User'}
                                        </div>
                                    )}
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <footer className="border-t p-3">
                    <div className="flex gap-2">
                        <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message..." />
                        <Button onClick={send}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </footer>
            </section>
        </div>
    );
};

export default ChatPage;
