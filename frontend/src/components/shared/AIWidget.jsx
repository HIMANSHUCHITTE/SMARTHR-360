import React, { useMemo, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import api from '../../services/api';

const AIWidget = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            text: "Hello! I'm your SmartHR AI assistant. How can I help you today?",
            actions: [],
        },
    ]);

    const canSend = useMemo(() => query.trim().length > 0 && !isSending, [query, isSending]);

    const resolveActionPath = (actionPath) => {
        if (typeof actionPath !== 'string' || !actionPath.startsWith('/')) return null;
        if (/^\/(owner|subadmin|user|superadmin)\b/.test(actionPath)) return actionPath;

        const panelPrefixMatch = location.pathname.match(/^\/(owner|subadmin|user|superadmin)\b/);
        const panelKey = panelPrefixMatch?.[1] || null;
        const panelPrefix = panelKey ? `/${panelKey}` : '';

        const allowedSuffixByPanel = {
            owner: new Set(['/dashboard', '/profile', '/organization', '/employees', '/roles', '/payroll', '/recruitment', '/org-chart', '/performance', '/feed', '/network', '/chat', '/help', '/settings']),
            subadmin: new Set(['/dashboard', '/profile', '/attendance', '/leaves', '/documents', '/feed', '/network', '/chat', '/help', '/settings']),
            user: new Set(['/dashboard', '/profile', '/jobs', '/feed', '/network', '/chat', '/help', '/settings']),
            superadmin: new Set(['/dashboard', '/help', '/settings']),
        };

        if (!panelPrefix || !panelKey) return null;
        if (!allowedSuffixByPanel[panelKey]?.has(actionPath)) return `${panelPrefix}/help`;
        return `${panelPrefix}${actionPath}`;
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const message = query.trim();
        if (!message || isSending) return;

        setMessages((prev) => [
            ...prev,
            { id: `u-${Date.now()}`, role: 'user', text: message, actions: [] },
        ]);
        setQuery('');
        setIsSending(true);

        try {
            const { data } = await api.post('/advanced/ai/chat', { message });
            const reply = data?.reply || 'I could not generate a response right now.';
            const actions = Array.isArray(data?.suggestedActions) ? data.suggestedActions : [];

            setMessages((prev) => [
                ...prev,
                { id: `a-${Date.now()}`, role: 'assistant', text: reply, actions },
            ]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    id: `e-${Date.now()}`,
                    role: 'assistant',
                    text: error?.response?.data?.message || 'AI service is unavailable right now. Please try again.',
                    actions: [],
                },
            ]);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {isOpen ? (
                <div className="w-80 rounded-lg border bg-card shadow-xl">
                    <div className="flex items-center justify-between border-b p-4">
                        <h3 className="font-semibold">AI Assistant</h3>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="h-64 space-y-2 overflow-y-auto p-4 text-sm">
                        {messages.map((item) => (
                            <div key={item.id} className={item.role === 'user' ? 'text-right' : ''}>
                                <div
                                    className={item.role === 'user'
                                        ? 'ml-auto inline-block max-w-[90%] rounded-lg bg-primary px-3 py-2 text-primary-foreground'
                                        : 'inline-block max-w-[90%] rounded-lg bg-muted px-3 py-2 text-foreground'}
                                >
                                    {item.text}
                                </div>
                                {item.role === 'assistant' && item.actions?.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {item.actions.slice(0, 3).map((action, idx) => (
                                            <Button
                                                key={`${item.id}-a-${idx}`}
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-[11px]"
                                                onClick={() => {
                                                    const targetPath = resolveActionPath(action?.action);
                                                    if (targetPath) {
                                                        navigate(targetPath);
                                                        setIsOpen(false);
                                                    }
                                                }}
                                            >
                                                {action?.label || 'Open'}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="border-t p-3">
                        <form className="flex gap-2" onSubmit={handleSend}>
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ask anything..."
                                disabled={isSending}
                            />
                            <Button size="sm" type="submit" disabled={!canSend}>
                                {isSending ? '...' : 'Send'}
                            </Button>
                        </form>
                    </div>
                </div>
            ) : (
                <Button
                    className="h-14 w-14 rounded-full shadow-lg"
                    onClick={() => setIsOpen(true)}
                >
                    <MessageSquare className="h-6 w-6" />
                </Button>
            )}
        </div>
    );
};

export default AIWidget;
