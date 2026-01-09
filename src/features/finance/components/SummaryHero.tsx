import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { FinanceSummary } from '@/lib/financeService';
import { cn } from '@/lib/utils';

interface SummaryHeroProps {
    summary: FinanceSummary | null;
    totalAssetsValue: number;
    itemVariants: any;
}

export function SummaryHero({ summary, totalAssetsValue, itemVariants }: SummaryHeroProps) {
    const netWorthChange = summary?.income_change_pct || 0;
    const isPositive = netWorthChange >= 0;

    return (
        <div className="p-4 bg-bg-surface/40 flex items-center justify-between">
            <div className="flex items-center gap-12">
                {/* Metric 1: Total Balance */}
                <motion.div
                    variants={itemVariants}
                    className="flex flex-col gap-1 pr-12"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest">TOTAL BALANCE</span>
                        <div className={cn(
                            "flex items-center gap-1 text-[10px] font-mono",
                            isPositive ? "text-emerald-500" : "text-rose-500"
                        )}>
                            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {Math.abs(netWorthChange)}%
                        </div>
                    </div>
                    <div className="text-2xl font-mono font-bold text-text-primary tracking-tight">
                        ${totalAssetsValue?.toLocaleString() || '0'}
                    </div>
                </motion.div>

                {/* Metric 2: Monthly Income */}
                <motion.div
                    variants={itemVariants}
                    className="flex items-center gap-3"
                >
                    <div className="p-1.5 rounded-sm bg-emerald-500/10 border border-emerald-500/20">
                        <DollarSign size={12} className="text-emerald-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest">MONTHLY INCOME</span>
                        <span className="text-sm font-mono font-bold text-text-secondary">
                            ${summary?.monthly_income?.toLocaleString() || '0'}
                        </span>
                    </div>
                </motion.div>

                {/* Metric 3: Monthly Spent */}
                <motion.div
                    variants={itemVariants}
                    className="flex items-center gap-3"
                >
                    <div className="p-1.5 rounded-sm bg-rose-500/10 border border-rose-500/20">
                        <Activity size={12} className="text-rose-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest">MONTHLY SPENT</span>
                        <span className="text-sm font-mono font-bold text-text-secondary">
                            ${summary?.monthly_spent?.toLocaleString() || '0'}
                        </span>
                    </div>
                </motion.div>
            </div>

        </div>
    );
}
