import { motion } from 'framer-motion';
import { History as HistoryIcon } from 'lucide-react';
import { FinanceTransaction } from '@/lib/financeService';
import { cn } from '@/lib/utils';

interface RecentActivityCardProps {
    transactions: FinanceTransaction[];
    onViewHistory: () => void;
    itemVariants: any;
}

export function RecentActivityCard({
    transactions,
    onViewHistory,
    itemVariants
}: RecentActivityCardProps) {
    return (
        <motion.div
            variants={itemVariants}
            className="flex flex-col h-full bg-bg-surface border border-border/10 rounded-sm"
        >
            <div className="flex items-center justify-between p-3 bg-bg-card/20">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <h3 className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider">Recent Activity</h3>
                </div>
                <button
                    onClick={onViewHistory}
                    className="p-1 hover:bg-bg-hover rounded transition-colors text-text-tertiary hover:text-text-primary"
                >
                    <HistoryIcon size={14} />
                </button>
            </div>

            <div className="flex flex-col overflow-y-auto custom-scrollbar max-h-[300px]">
                <div className="grid grid-cols-4 bg-bg-card/10 p-2 text-[10px] font-mono text-text-tertiary uppercase tracking-wider sticky top-0 backdrop-blur-sm z-10">
                    <span className="col-span-2">Description</span>
                    <span className="text-right">Amount</span>
                    <span className="text-right">Time</span>
                </div>
                {transactions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-text-muted font-mono italic">
                        -- NO DATA --
                    </div>
                ) : (
                    transactions.map((t, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-4 p-2.5 hover:bg-bg-hover/50 transition-colors text-xs font-mono group cursor-default border-none"
                        >
                            <div className="col-span-2 flex items-center gap-2 overflow-hidden">
                                <div className={cn(
                                    "w-1 h-3 rounded-full flex-shrink-0",
                                    t.is_positive ? "bg-emerald-500" : "bg-rose-500"
                                )} />
                                <span className="truncate group-hover:text-text-primary text-text-secondary transition-colors">{t.label}</span>
                            </div>
                            <span className={cn(
                                "text-right font-bold",
                                t.is_positive ? "text-emerald-500" : "text-rose-500"
                            )}>
                                {t.is_positive ? '+' : ''}{t.amount.toLocaleString()}
                            </span>
                            <span className="text-right text-text-tertiary text-[10px] pt-0.5">
                                {t.date ? new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                        </div>
                    ))
                )
                }
            </div >
        </motion.div >
    );
}
