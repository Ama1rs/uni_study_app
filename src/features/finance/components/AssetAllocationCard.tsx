import { motion } from 'framer-motion';
import { Plus, MoreHorizontal } from 'lucide-react';
import { FinanceAsset } from '@/lib/financeService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useState, useEffect, useRef } from 'react';

interface AssetAllocationCardProps {
    assets: FinanceAsset[];
    totalAssetsValue: number;
    onSelectAsset: (asset: FinanceAsset | null) => void;
    itemVariants: any;
}

export function AssetAllocationCard({
    assets,
    onSelectAsset,
    itemVariants
}: AssetAllocationCardProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setIsVisible(width > 0 && height > 0);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const data = assets.map(asset => ({
        name: asset.label,
        value: asset.amount,
        color: asset.color === 'bg-accent' ? '#f59e0b' : // amber-500
            asset.type_ === 'cash' ? '#10b981' : // emerald-500
                asset.type_ === 'stock' ? '#3b82f6' : // blue-500
                    asset.type_ === 'crypto' ? '#a855f7' : // purple-500
                        '#71717a' // zinc-500
    }));

    return (
        <motion.div
            variants={itemVariants}
            className="flex flex-col h-full bg-bg-surface border border-border/10 rounded-sm"
        >
            <div className="flex items-center justify-between p-3 bg-bg-card/20">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <h3 className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider">Asset Allocation</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onSelectAsset(null)}
                        className="p-1 hover:bg-bg-hover rounded transition-colors text-text-tertiary hover:text-text-primary"
                    >
                        <Plus size={14} />
                    </button>
                    <button className="p-1 hover:bg-bg-hover rounded transition-colors text-text-tertiary hover:text-text-primary">
                        <MoreHorizontal size={14} />
                    </button>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-6">
                {/* CHART */}
                <div ref={containerRef} className="h-[180px] w-full relative">
                    {isVisible && (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', fontSize: '12px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                    formatter={(value: number) => `$${value.toLocaleString()}`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                    {/* Center Text */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <span className="text-xs text-text-tertiary font-mono uppercase display-block">Total</span>
                        <span className="text-lg font-mono font-bold text-text-primary block">
                            ${(assets.reduce((a, b) => a + b.amount, 0) / 1000).toFixed(1)}k
                        </span>
                    </div>
                </div>

                {/* ASSET TABLE */}
                <div className="flex flex-col rounded-sm overflow-hidden bg-bg-card/5">
                    <div className="grid grid-cols-3 bg-bg-card/10 p-2 text-[10px] font-mono text-text-tertiary uppercase tracking-wider">
                        <span>Asset</span>
                        <span className="text-right">Value</span>
                        <span className="text-right">Alloc</span>
                    </div>
                    {assets.map((asset, i) => {
                        const total = assets.reduce((a, b) => a + b.amount, 0) || 1;
                        const pct = Math.round((asset.amount / total) * 100);
                        return (
                            <button
                                key={asset.id}
                                onClick={() => onSelectAsset(asset)}
                                className="grid grid-cols-3 p-2 hover:bg-bg-hover/50 transition-colors text-xs font-mono border-none text-text-secondary hover:text-text-primary text-left group"
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: data[i].color }} />
                                    <span className="truncate group-hover:text-accent transition-colors">{asset.label}</span>
                                </div>
                                <span className="text-right">${asset.amount.toLocaleString()}</span>
                                <span className="text-right text-text-tertiary">{pct}%</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}
