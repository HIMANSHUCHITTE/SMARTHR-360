import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Award, AlertCircle, Loader2, Search } from 'lucide-react';
import api from '../../services/api';
import { Input } from '../../components/ui/Input';

const PerformancePage = () => {
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [rows, setRows] = useState([]);
    const [query, setQuery] = useState('');
    const [summary, setSummary] = useState({ highPerformers: 0, lowPerformers: 0 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setMessage('');
        try {
            const { data } = await api.get('/owner/performance-heatmap');
            const heatmap = Array.isArray(data?.heatmap) ? data.heatmap : [];
            setRows(heatmap);
            setSummary({
                highPerformers: Number(data?.highPerformers || 0),
                lowPerformers: Number(data?.lowPerformers || 0),
            });
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to load performance data');
        } finally {
            setLoading(false);
        }
    };

    const filteredRows = useMemo(() => {
        const q = String(query || '').trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((row) => String(row?.name || '').toLowerCase().includes(q));
    }, [rows, query]);

    const topRows = useMemo(
        () => [...rows].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, 5),
        [rows]
    );

    const lowRows = useMemo(
        () => [...rows].sort((a, b) => Number(a.score || 0) - Number(b.score || 0)).slice(0, 5),
        [rows]
    );

    const getScoreTone = (score) => {
        const n = Number(score || 0);
        if (n >= 75) return 'text-emerald-700 bg-emerald-100 border-emerald-300';
        if (n >= 45) return 'text-amber-700 bg-amber-100 border-amber-300';
        return 'text-rose-700 bg-rose-100 border-rose-300';
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Performance Table</h1>
                <p className="text-muted-foreground">Organization employee performance summary based on current structure data.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border bg-green-500/10 text-card-foreground shadow p-6 border-green-500/20">
                    <h3 className="font-semibold flex items-center gap-2 mb-4">
                        <Award className="h-5 w-5 text-green-600" />
                        Top Performers ({summary.highPerformers})
                    </h3>
                    <div className="space-y-3">
                        {topRows.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No performance rows.</p>
                        ) : topRows.map((p, i) => (
                            <div key={`${p.userId || p.name}-${i}`} className="flex justify-between items-center bg-background/50 p-3 rounded-lg">
                                <div className="font-medium">{p.name || 'N/A'}</div>
                                <div className="text-green-700 font-bold text-xl">{p.score || 0}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border bg-red-500/10 text-card-foreground shadow p-6 border-red-500/20">
                    <h3 className="font-semibold flex items-center gap-2 mb-4">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        Needs Attention ({summary.lowPerformers})
                    </h3>
                    <div className="space-y-3">
                        {lowRows.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No performance rows.</p>
                        ) : lowRows.map((p, i) => (
                            <div key={`${p.userId || p.name}-low-${i}`} className="flex justify-between items-center bg-background/50 p-3 rounded-lg">
                                <div className="font-medium">{p.name || 'N/A'}</div>
                                <div className="text-red-700 font-bold text-xl">{p.score || 0}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow sm:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-semibold">Performance Table (All Employees)</h3>
                    <div className="flex w-full items-center gap-2 sm:max-w-sm">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by employee name..." />
                    </div>
                </div>

                {filteredRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No performance data available for this organization.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[540px] text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="py-2 pr-2">Employee</th>
                                    <th className="py-2 pr-2">Score</th>
                                    <th className="py-2 pr-2">Level</th>
                                    <th className="py-2 pr-2">Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((row, idx) => {
                                    const score = Number(row.score || 0);
                                    const tone = getScoreTone(score);
                                    return (
                                        <tr key={`${row.userId || row.name}-${idx}`} className="border-b last:border-b-0">
                                            <td className="py-2 pr-2 font-medium">{row.name || 'N/A'}</td>
                                            <td className="py-2 pr-2">{score}</td>
                                            <td className="py-2 pr-2">
                                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${tone}`}>{row.level || '-'}</span>
                                            </td>
                                            <td className="py-2 pr-2">
                                                {score >= 50 ? (
                                                    <span className="inline-flex items-center text-emerald-700"><TrendingUp className="mr-1 h-4 w-4" /> Positive</span>
                                                ) : (
                                                    <span className="inline-flex items-center text-rose-700"><TrendingDown className="mr-1 h-4 w-4" /> Risk</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {message && (
                <div className="rounded-md border bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {message}
                </div>
            )}
        </div>
    );
};

export default PerformancePage;
