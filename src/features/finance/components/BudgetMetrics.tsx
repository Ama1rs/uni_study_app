import { motion } from 'framer-motion';
import { PieChart, Target } from 'lucide-react';
import { FinanceBudget, SavingsGoal } from '@/lib/financeService';

interface BudgetMetricsProps {
    budgets: FinanceBudget[];
    goals: SavingsGoal[];
    onAdjustGoal: () => void;
    itemVariants: any;
}

export function BudgetMetrics({ budgets, goals, onAdjustGoal, itemVariants }: BudgetMetricsProps) {
    return (
        <>
            {/* Budget Progress */}
            <motion.div
                className="md:col-span-1 glass-card p-6 rounded-2xl flex flex-col justify-between"
                variants={itemVariants}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-mono text-text-secondary uppercase">Monthly Budget</h3>
                    <PieChart size={18} className="text-text-tertiary" />
                </div>

                {budgets.length > 0 ? (
                    <>
                        <div className="relative flex items-center justify-center p-4">
                            <svg className="w-32 h-32 transform -rotate-90">
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="58"
                                    stroke="var(--border)"
                                    strokeWidth="8"
                                    fill="transparent"
                                />
                                <motion.circle
                                    cx="64"
                                    cy="64"
                                    r="58"
                                    stroke="var(--accent)"
                                    strokeWidth="8"
                                    fill="transparent"
                                    strokeDasharray={364}
                                    initial={{ strokeDashoffset: 364 }}
                                    animate={{ strokeDashoffset: 364 * (1 - (budgets.reduce((a, b) => a + b.spent_amount, 0) / budgets.reduce((a, b) => a + b.limit_amount, 0))) }}
                                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute text-center">
                                <span className="text-2xl font-bold text-text-primary">
                                    {Math.round((budgets.reduce((a, b) => a + b.spent_amount, 0) / budgets.reduce((a, b) => a + b.limit_amount, 0)) * 100)}%
                                </span>
                                <p className="text-[10px] text-text-tertiary font-mono">USED</p>
                            </div>
                        </div>

                        <div className="mt-4">
                            <p className="text-xs text-text-tertiary text-center">
                                ${budgets.reduce((a, b) => a + b.spent_amount, 0).toLocaleString()} / ${budgets.reduce((a, b) => a + b.limit_amount, 0).toLocaleString()}
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-text-tertiary text-xs">No budgets set</div>
                )}
            </motion.div>

            {/* Savings Goal */}
            <motion.div
                className="md:col-span-1 glass-card p-6 rounded-2xl flex flex-col justify-between"
                variants={itemVariants}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-mono text-text-secondary uppercase">Savings Goal</h3>
                    <Target size={18} className="text-text-tertiary" />
                </div>

                {goals.length > 0 ? (
                    <div>
                        <p className="text-text-primary font-bold mb-1">{goals[0].name}</p>
                        <p className="text-[10px] text-text-tertiary mb-4">Target: ${goals[0].target_amount.toLocaleString()}</p>

                        <div className="h-2 w-full bg-border rounded-full overflow-hidden mb-2">
                            <motion.div
                                className="h-full bg-accent"
                                initial={{ width: 0 }}
                                animate={{ width: `${(goals[0].current_amount / goals[0].target_amount) * 100}%` }}
                                transition={{ duration: 1, delay: 0.8 }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-text-secondary">
                            <span>${goals[0].current_amount.toLocaleString()} saved</span>
                            <span>{Math.round((goals[0].current_amount / goals[0].target_amount) * 100)}%</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-text-tertiary text-xs">No goals set</div>
                )}

                <button
                    onClick={onAdjustGoal}
                    className="mt-4 w-full py-2 rounded-lg border border-border hover:bg-bg-hover transition-colors text-xs text-text-secondary hover:text-text-primary font-mono"
                >
                    Adjust Goal
                </button>
            </motion.div>
        </>
    );
}
