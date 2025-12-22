import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FinanceBudget, FinanceSummary } from '@/lib/financeService';
import { SpendingItem } from './SpendingItem';

interface SpendingTrendsCardProps {
    budgets: FinanceBudget[];
    summary: FinanceSummary | null;
    isCollapsed: boolean;
    setIsCollapsed: (v: boolean) => void;
    onViewHistory: () => void;
    onViewFlow: () => void;
    onSelectBudget: (budget: FinanceBudget | null) => void;
    itemVariants: any;
}

export function SpendingTrendsCard({
    budgets,
    summary,
    isCollapsed,
    setIsCollapsed,
    onViewHistory,
    onViewFlow,
    onSelectBudget,
    itemVariants
}: SpendingTrendsCardProps) {
    return (
        <motion.div
            className={cn(
                "md:col-span-2 glass-card p-6 rounded-2xl flex flex-col transition-all duration-500",
                isCollapsed ? "md:row-span-1" : "md:row-span-2"
            )}
            variants={itemVariants}
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-mono text-text-secondary uppercase tracking-widest">Top Spending</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onViewHistory}
                        className="text-[10px] text-accent font-mono hover:underline"
                    >
                        View History
                    </button>
                    <button
                        onClick={onViewFlow}
                        className="p-1 hover:bg-white/5 rounded-md transition-colors"
                        title="Visual Flow"
                    >
                        <PieChart
                            size={16}
                            className="text-accent"
                        />
                    </button>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 hover:bg-white/5 rounded-md transition-colors"
                    >
                        <ChevronDown
                            size={16}
                            className={cn("text-text-tertiary transition-transform duration-300", isCollapsed && "-rotate-90")}
                        />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden flex flex-col flex-1"
                    >
                        <div className="space-y-1">
                            {budgets.map((budget) => (
                                <SpendingItem
                                    key={budget.id}
                                    category={budget.category}
                                    amount={`$${budget.spent_amount.toLocaleString()}`}
                                    trend={budget.spent_amount > (budget.limit_amount * 0.8) ? 'up' : 'static'}
                                    onClick={() => onSelectBudget(budget)}
                                />
                            ))}
                            <button
                                onClick={() => onSelectBudget(null)}
                                className="w-full p-2 mt-2 rounded-lg border border-dashed border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-text-tertiary text-[10px] font-mono uppercase flex items-center justify-center gap-2"
                            >
                                <Plus size={12} />
                                Add Budget
                            </button>
                        </div>

                        <div className="mt-auto pt-6">
                            <div className="p-4 rounded-xl bg-bg-primary/50 border border-border">
                                <h4 className="text-[10px] font-mono text-text-tertiary uppercase mb-2">Smart Suggestion</h4>
                                <p className="text-xs text-text-secondary leading-relaxed">
                                    {summary && summary.monthly_spent > summary.monthly_income * 0.7
                                        ? "You've spent over 70% of your income this month. Consider reducing leisure expenses."
                                        : "Your spending is within healthy limits. You're doing great!"}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
