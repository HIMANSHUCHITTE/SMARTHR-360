import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { Loader2, User, Network, Building2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const OrgChartPage = () => {
    const [chart, setChart] = useState({ nodes: [], edges: [], roots: [] });
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState('');

    useEffect(() => {
        fetchChart();
    }, []);

    const fetchChart = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/owner/org-chart');
            setChart({
                nodes: Array.isArray(data?.nodes) ? data.nodes : [],
                edges: Array.isArray(data?.edges) ? data.edges : [],
                roots: Array.isArray(data?.roots) ? data.roots : [],
            });
            setSelectedId((data?.roots || [])[0] || '');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const nodeMap = useMemo(() => {
        const map = new Map();
        chart.nodes.forEach((node) => {
            map.set(String(node.employmentId), { ...node, children: [] });
        });
        chart.edges.forEach((edge) => {
            const parent = map.get(String(edge.from));
            const child = map.get(String(edge.to));
            if (parent && child) parent.children.push(child);
        });
        map.forEach((value) => {
            value.children.sort((a, b) => Number(a.roleLevel || 999) - Number(b.roleLevel || 999));
        });
        return map;
    }, [chart]);

    const roots = useMemo(() => {
        if (chart.roots.length > 0) {
            return chart.roots
                .map((id) => nodeMap.get(String(id)))
                .filter(Boolean);
        }
        return Array.from(nodeMap.values()).filter((node) => !node.reportsToEmploymentId);
    }, [chart.roots, nodeMap]);

    const selectedNode = selectedId ? nodeMap.get(String(selectedId)) : null;

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Organization Chart</h1>
                    <p className="text-muted-foreground">Live reporting tree based on actual manager mapping (no static placeholders).</p>
                </div>
                <Button onClick={fetchChart} className="ring-2 ring-primary/30">Refresh Chart</Button>
            </div>

            {roots.length === 0 ? (
                <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No employees available for org chart.</div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                    <div className="rounded-xl border bg-card/70 p-4 overflow-auto">
                        <div className="min-w-[760px]">
                            <div className="flex flex-col items-center gap-8">
                                {roots.map((root) => (
                                    <TreeNode key={root.employmentId} node={root} depth={0} selectedId={selectedId} onSelect={setSelectedId} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <aside className="rounded-xl border bg-card p-4">
                        {!selectedNode ? (
                            <p className="text-sm text-muted-foreground">Select a node to see details.</p>
                        ) : (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Building2 className="h-4 w-4" /> Node Details</h3>
                                <Detail label="Name" value={selectedNode.name || '-'} />
                                <Detail label="Email" value={selectedNode.email || '-'} />
                                <Detail label="Role" value={selectedNode.role || '-'} />
                                <Detail label="Designation" value={selectedNode.designation || '-'} />
                                <Detail label="Department" value={selectedNode.department || '-'} />
                                <Detail label="Status" value={selectedNode.status || '-'} />
                                <Detail label="Direct Reports" value={String(selectedNode.children?.length || 0)} />
                                <Detail label="Role Level" value={String(selectedNode.roleLevel || '-')} />
                            </div>
                        )}
                    </aside>
                </div>
            )}
        </div>
    );
};

const TreeNode = ({ node, depth, selectedId, onSelect }) => {
    const isSelected = String(selectedId) === String(node.employmentId);

    return (
        <div className="flex flex-col items-center">
            <button
                type="button"
                onClick={() => onSelect(String(node.employmentId))}
                className={`w-56 rounded-xl border p-3 text-left transition ${isSelected ? 'border-primary bg-primary/10 ring-2 ring-primary/40' : 'bg-background/80 hover:border-primary/50'}`}
            >
                <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-sm">{node.name || 'Unknown'}</p>
                        <p className="truncate text-xs text-muted-foreground">{node.role || 'Role N/A'}</p>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">{node.designation || node.department || 'No designation'}</p>
            </button>

            {node.children?.length > 0 && (
                <>
                    <div className="h-5 w-px bg-border" />
                    <div className="relative flex flex-wrap justify-center gap-6">
                        {node.children.map((child) => (
                            <TreeNode
                                key={child.employmentId}
                                node={child}
                                depth={depth + 1}
                                selectedId={selectedId}
                                onSelect={onSelect}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const Detail = ({ label, value }) => (
    <div className="rounded-md border bg-background/70 px-3 py-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
    </div>
);

export default OrgChartPage;
