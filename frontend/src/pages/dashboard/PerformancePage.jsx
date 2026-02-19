import React from 'react';
import { TrendingUp, TrendingDown, Award, AlertCircle } from 'lucide-react';

const PerformancePage = () => {
    // Mock Data
    const highPerformers = [
        { name: 'Alice Smith', score: 98, role: 'Senior Dev' },
        { name: 'Bob Jones', score: 95, role: 'Product Manager' },
    ];
    const lowPerformers = [
        { name: 'Dave Wilson', score: 45, role: 'Intern' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Performance Heatmap</h1>
                <p className="text-muted-foreground">AI-driven performance analytics and ratings.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border bg-green-500/10 text-card-foreground shadow p-6 border-green-500/20">
                    <h3 className="font-semibold flex items-center gap-2 mb-4">
                        <Award className="h-5 w-5 text-green-600" />
                        Top Performers
                    </h3>
                    <div className="space-y-4">
                        {highPerformers.map((p, i) => (
                            <div key={i} className="flex justify-between items-center bg-background/50 p-3 rounded-lg">
                                <div>
                                    <div className="font-medium">{p.name}</div>
                                    <div className="text-xs text-muted-foreground">{p.role}</div>
                                </div>
                                <div className="text-green-600 font-bold text-xl">{p.score}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border bg-red-500/10 text-card-foreground shadow p-6 border-red-500/20">
                    <h3 className="font-semibold flex items-center gap-2 mb-4">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        Needs Attention
                    </h3>
                    <div className="space-y-4">
                        {lowPerformers.map((p, i) => (
                            <div key={i} className="flex justify-between items-center bg-background/50 p-3 rounded-lg">
                                <div>
                                    <div className="font-medium">{p.name}</div>
                                    <div className="text-xs text-muted-foreground">{p.role}</div>
                                </div>
                                <div className="text-red-600 font-bold text-xl">{p.score}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Heatmap Grid Mockup */}
            <div className="rounded-xl border bg-card shadow p-6">
                <h3 className="font-semibold mb-6">Organization Skill Heatmap</h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                    {Array.from({ length: 32 }).map((_, i) => {
                        const intensity = Math.random();
                        const color = intensity > 0.8 ? 'bg-green-500' : intensity > 0.5 ? 'bg-green-300' : intensity > 0.3 ? 'bg-yellow-300' : 'bg-red-300';
                        return (
                            <div key={i} className={`h-12 w-full rounded ${color} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`} title={`Score: ${Math.round(intensity * 100)}`}></div>
                        );
                    })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Low Performance</span>
                    <span>High Performance</span>
                </div>
            </div>
        </div>
    );
};

export default PerformancePage;
