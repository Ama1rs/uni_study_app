import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ExpenseFlow } from '@/lib/financeService';

interface FlowModalProps {
    flows: ExpenseFlow[];
    onClose: () => void;
}

export function FlowModal({ flows, onClose }: FlowModalProps) {
    // Basic Sankey Layout logic
    const level0 = ['Raw Income'];
    const level1 = ['Net Income'];
    const level2 = Array.from(new Set(flows.filter(f => level1.includes(f.source)).map(f => f.target)));
    const levels = [level0, level1, level2].filter(l => l.length > 0);

    const nodeMetadata: Record<string, { x: number, y: number, height: number, color: string, totalIn: number, totalOut: number }> = {};
    const width = 800;
    const height = 480;
    const nodeWidth = 16;
    const levelSpacing = (width - 160) / (levels.length - 1);

    // Premium Color mapping
    const colors: Record<string, string> = {
        'Raw Income': '#3b82f6',
        'Net Income': '#10b981',
        'Taxes': '#ef4444',
        'Savings': '#fbbf24',
        'Equipments': '#06b6d4',
        'Housing': '#8b5cf6',
        'Leisure': '#ec4899',
        'Education': '#f97316',
        'Investments': '#6366f1',
        'Default': '#94a3b8'
    };

    // Calculate total values for node sizing
    levels.flat().forEach(name => {
        nodeMetadata[name] = {
            x: 0, y: 0, height: 0,
            color: colors[name] || colors.Default,
            totalIn: flows.filter(f => f.target === name).reduce((s, f) => s + f.value, 0),
            totalOut: flows.filter(f => f.source === name).reduce((s, f) => s + f.value, 0)
        };
    });

    // Calculate node positions with stable vertical balance
    levels.forEach((level, lIndex) => {
        const totalValue = level.reduce((sum, name) => sum + Math.max(nodeMetadata[name].totalIn, nodeMetadata[name].totalOut), 0) || 1;
        const totalPadding = (level.length - 1) * 40;
        const availableHeight = height - 120 - totalPadding;

        // Center the level vertically
        let currentY = 60 + (height - 120 - (((level.reduce((s, n) => s + Math.max(nodeMetadata[n].totalIn, nodeMetadata[n].totalOut), 0) / totalValue) * availableHeight) + totalPadding)) / 2;

        level.forEach((name) => {
            const nodeValue = Math.max(nodeMetadata[name].totalIn, nodeMetadata[name].totalOut);
            const nodeHeight = Math.max((nodeValue / totalValue) * availableHeight, 24);

            nodeMetadata[name].x = 80 + lIndex * levelSpacing;
            nodeMetadata[name].y = currentY;
            nodeMetadata[name].height = nodeHeight;
            currentY += nodeHeight + 40;
        });
    });

    const sourceOffsets: Record<string, number> = {};
    const targetOffsets: Record<string, number> = {};

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-8"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] p-10 w-full max-w-6xl shadow-2xl relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Subtle light leak effect */}
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full" />

                <div className="flex justify-between items-start mb-10 relative z-10">
                    <div>
                        <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Net Revenue Stream</h2>
                        <p className="text-emerald-500 text-[11px] font-mono mt-3 uppercase tracking-[0.4em] font-black opacity-80 flex items-center gap-2">
                            Visual Financial Engine v3.1 <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> Stable
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-4 hover:bg-white/5 bg-white/[0.02] rounded-2xl transition-all group border border-white/5 shadow-lg"
                    >
                        <X size={24} className="text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>

                <div className="relative w-full aspect-[16/8] flex items-center justify-center bg-black/30 rounded-[2rem] border border-white/[0.03] shadow-inner overflow-hidden">
                    <svg className="w-full h-full p-12 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                        <defs>
                            {flows.map((flow, i) => (
                                <linearGradient key={`grad-${i}`} id={`grad-flow-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={nodeMetadata[flow.source]?.color} stopOpacity="0.4" />
                                    <stop offset="100%" stopColor={nodeMetadata[flow.target]?.color} stopOpacity="0.1" />
                                </linearGradient>
                            ))}
                        </defs>

                        {/* Links */}
                        {flows.map((flow, i) => {
                            const source = nodeMetadata[flow.source];
                            const target = nodeMetadata[flow.target];
                            if (!source || !target) return null;

                            const sourceVal = source.totalOut || 1;
                            const targetVal = target.totalIn || 1;

                            const linkHeight = (flow.value / sourceVal) * source.height;
                            const targetLinkHeight = (flow.value / targetVal) * target.height;

                            const sY = source.y + (sourceOffsets[flow.source] || 0) + linkHeight / 2;
                            const tY = target.y + (targetOffsets[flow.target] || 0) + targetLinkHeight / 2;

                            sourceOffsets[flow.source] = (sourceOffsets[flow.source] || 0) + linkHeight;
                            targetOffsets[flow.target] = (targetOffsets[flow.target] || 0) + targetLinkHeight;

                            const path = `M ${source.x + nodeWidth} ${sY} 
                                          C ${source.x + nodeWidth + levelSpacing * 0.4} ${sY},
                                            ${target.x - levelSpacing * 0.4} ${tY},
                                            ${target.x} ${tY}`;

                            return (
                                <motion.path
                                    key={`link-${i}`}
                                    d={path}
                                    fill="none"
                                    stroke={`url(#grad-flow-${i})`}
                                    strokeWidth={linkHeight}
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 1.2, delay: i * 0.05, ease: "easeInOut" }}
                                    className="hover:stroke-opacity-100 transition-all cursor-crosshair"
                                />
                            );
                        })}

                        {/* Nodes */}
                        {Object.entries(nodeMetadata).map(([name, data]) => {
                            const isMiddle = data.x > 100 && data.x < width - 150;
                            const isEnd = data.x > width - 150;

                            return (
                                <g key={name}>
                                    <motion.rect
                                        x={data.x}
                                        y={data.y}
                                        width={nodeWidth}
                                        height={data.height}
                                        fill={data.color}
                                        rx={4}
                                        initial={{ opacity: 0, scaleY: 0 }}
                                        animate={{ opacity: 1, scaleY: 1 }}
                                        className="shadow-3xl"
                                    />
                                    {/* Labels */}
                                    <text
                                        x={isMiddle ? data.x + nodeWidth / 2 : data.x + (isEnd ? 28 : -15)}
                                        y={isMiddle ? data.y - 15 : data.y + data.height / 2}
                                        textAnchor={isMiddle ? "middle" : (isEnd ? "start" : "end")}
                                        dominantBaseline={isMiddle ? "auto" : "middle"}
                                        className="fill-white text-[10px] font-mono font-black uppercase tracking-widest"
                                    >
                                        {name}
                                    </text>
                                    <text
                                        x={isMiddle ? data.x + nodeWidth / 2 : data.x + (isEnd ? 28 : -15)}
                                        y={isMiddle ? data.y + data.height + 18 : data.y + data.height / 2 + 14}
                                        textAnchor={isMiddle ? "middle" : (isEnd ? "start" : "end")}
                                        className="fill-text-tertiary text-[9px] font-mono font-bold opacity-40"
                                    >
                                        ${Math.max(data.totalIn, data.totalOut).toLocaleString()}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>

                <div className="mt-10 flex justify-center gap-12 text-[10px] font-mono text-white/20 uppercase tracking-[0.5em] font-black">
                    <span className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" /> Origin</span>
                    <span className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" /> Distribution</span>
                    <span className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]" /> Allocation</span>
                </div>
            </motion.div>
        </motion.div>
    );
}
