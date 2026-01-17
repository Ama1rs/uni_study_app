import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { FinanceBudget, SavingsGoal } from '@/lib/financeService';
import { cn } from '@/lib/utils';

interface BudgetMetricsProps {
    budgets: FinanceBudget[];
    goals: SavingsGoal[];
    onAdjustGoal: () => void;
    itemVariants: any;
}

export function BudgetMetrics({ budgets, goals, onAdjustGoal, itemVariants }: BudgetMetricsProps) {
    return (
        <motion.div
            variants={itemVariants}
            className="flex flex-col h-full bg-bg-surface border border-border/10 rounded-sm"
        >
            <div className="flex items-center justify-between p-3 bg-bg-card/20">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h3 className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider">Budget Monitor</h3>
                </div>
            </div>

            <div className="flex-1 p-0 overflow-y-auto custom-scrollbar">
                {/* GOALS SECTION */}
                {goals.length > 0 && (
                    <div className="p-3 bg-bg-card/5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-text-tertiary uppercase">Savings Goal</span>
                            <button onClick={onAdjustGoal} className="text-[10px] text-accent hover:text-accent-hover font-mono">ADJUST</button>
                        </div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-text-primary">{goals[0].name}</span>
                            <span className="text-xs font-mono text-emerald-500">
                                {Math.round((goals[0].current_amount / goals[0].target_amount) * 100)}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-bg-hover rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${(goals[0].current_amount / goals[0].target_amount) * 100}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] font-mono text-text-tertiary">
                            <span>${goals[0].current_amount.toLocaleString()}</span>
                            <span>TARGET: ${goals[0].target_amount.toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {/* BUDGETS GRID */}
                <div className="grid grid-cols-1 divide-y-0">
                    {budgets.map(budget => {
                        const pct = (budget.spent_amount / budget.limit_amount) * 100;
                        const isOver = pct > 100;
                        const isWarn = pct > 80;

                        return (
                            <div key={budget.id} className="p-3 hover:bg-bg-hover transition-colors group">
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="flex items-center gap-2">
                                        {isWarn && <AlertTriangle size={10} className={isOver ? "text-rose-500" : "text-amber-500"} />}
                                        <span className="text-xs font-medium text-text-secondary">{budget.category}</span>
                                    </div>
                                    <span className={cn(
                                        "text-xs font-mono",
                                        isOver ? "text-rose-500 font-bold" : isWarn ? "text-amber-500" : "text-text-tertiary"
                                    )}>
                                        ${budget.spent_amount.toLocaleString()} <span className="text-text-muted">/ ${budget.limit_amount.toLocaleString()}</span>
                                    </span>
                                </div>
                                <div className="h-1 w-full bg-bg-hover rounded-full overflow-hidden flex">
                                    <div
                                        className={cn("h-full", isOver ? "bg-rose-500" : isWarn ? "bg-amber-500" : "bg-accent")}
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {budgets.length === 0 && (
                        <div className="p-4 text-center text-xs text-text-muted font-mono italic">
                            No active budgets
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
