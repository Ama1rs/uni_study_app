import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { FinanceBudget, FinanceSummary } from '@/lib/financeService';
import { Maximize2, Filter } from 'lucide-react';
import { useState, useLayoutEffect, useRef } from 'react';

interface SpendingTrendsCardProps {
    budgets: FinanceBudget[];
    summary: FinanceSummary | null;
    onViewHistory: () => void;
    onViewFlow: () => void;
    onSelectBudget: (budget: FinanceBudget | null) => void;
    itemVariants: any;
}

export function SpendingTrendsCard({
    summary,
    itemVariants
}: SpendingTrendsCardProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        if (!containerRef.current) return;

        // Set initial dimensions synchronously
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            setDimensions({ width: rect.width, height: rect.height });
        }

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setDimensions({ width, height });
                }
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Generate some mock history data if none exists, or use the real history
    const historyData = summary?.net_worth_history?.length
        ? summary.net_worth_history.map((val, i) => ({
            date: `D${i + 1}`,
            value: val
        }))
        : Array.from({ length: 12 }, (_, i) => ({
            date: `M${i + 1}`,
            value: 10000 + Math.random() * 5000 + (i * 1000)
        }));

    return (
        <motion.div
            variants={itemVariants}
            className="flex flex-col h-full bg-bg-surface border border-border/10 rounded-sm"
        >
            <div className="flex items-center justify-between p-3 bg-bg-card/30">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <h3 className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider">Balance History</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-bg-hover rounded transition-colors text-text-tertiary hover:text-text-primary">
                        <Filter size={14} />
                    </button>
                    <button className="p-1 hover:bg-bg-hover rounded transition-colors text-text-tertiary hover:text-text-primary">
                        <Maximize2 size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-[250px] relative">
                <div ref={containerRef} className="absolute inset-4">
                    {dimensions.width > 0 && dimensions.height > 0 && (
                        <AreaChart width={dimensions.width} height={dimensions.height} data={historyData}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} horizontal={false} strokeOpacity={0} />
                            <XAxis
                                dataKey="date"
                                stroke="var(--text-tertiary)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="var(--text-tertiary)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value / 1000}k`}
                                dx={-10}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', fontSize: '12px' }}
                                itemStyle={{ color: '#3b82f6' }}
                                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#3b82f6"
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    )}
                </div>

                {/* Time range selector overlay */}
                <div className="absolute top-4 right-4 flex bg-bg-card/50 border border-border/10 rounded-sm overflow-hidden z-10">
                    {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((range, i) => (
                        <button
                            key={range}
                            className={`px-2 py-1 text-[9px] font-mono ${i === 2 ? 'bg-bg-hover text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
