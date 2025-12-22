import { motion } from 'framer-motion';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { FinanceSummary } from '@/lib/financeService';

interface SummaryHeroProps {
    summary: FinanceSummary | null;
    totalAssetsValue: number;
    itemVariants: any;
}

export function SummaryHero({ summary, totalAssetsValue, itemVariants }: SummaryHeroProps) {
    return (
        <motion.div
            className="md:col-span-2 md:row-span-1 glass-card p-6 rounded-2xl relative overflow-hidden group"
            variants={itemVariants}
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-accent/20 transition-colors duration-500" />

            <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-accent/10 rounded-xl">
                    <Wallet className="text-accent" size={24} />
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-mono bg-emerald-400/10 px-2 py-1 rounded-md">
                    <TrendingUp size={14} />
                    +{summary?.income_change_pct || 0}%
                </div>
            </div>

            <div className="flex justify-between items-end">
                <div>
                    <p className="text-text-tertiary text-sm font-mono uppercase tracking-wider mb-1">Total Net Worth</p>
                    <h2 className="text-5xl font-bold text-gradient-accent">
                        ${totalAssetsValue.toLocaleString()}
                    </h2>
                    <div className="mt-6 flex gap-8">
                        <div>
                            <p className="text-text-tertiary text-[10px] uppercase font-mono mb-1">Monthly Income</p>
                            <p className="text-emerald-400 font-bold flex items-center gap-1">
                                <ArrowUpRight size={14} />
                                ${summary?.monthly_income.toLocaleString() || '0'}
                            </p>
                        </div>
                        <div>
                            <p className="text-text-tertiary text-[10px] uppercase font-mono mb-1">Monthly Spent</p>
                            <p className="text-rose-400 font-bold flex items-center gap-1">
                                <ArrowDownRight size={14} />
                                ${summary?.monthly_spent.toLocaleString() || '0'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex justify-end h-24 max-w-[200px]">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40">
                        <defs>
                            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <motion.path
                            d={(() => {
                                const history = summary?.net_worth_history || [0, 0, 0, 0, 0];
                                const min = Math.min(...history);
                                const max = Math.max(...history);
                                const range = max - min || 1;
                                const points = history.map((val: number, i: number) => {
                                    const x = (i / (history.length - 1)) * 100;
                                    const y = 40 - ((val - min) / range) * 30 - 5;
                                    return `${x},${y}`;
                                });
                                return `M ${points.join(' L ')}`;
                            })()}
                            fill="none"
                            stroke="#4ade80"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                        />
                        <motion.path
                            d={(() => {
                                const history = summary?.net_worth_history || [0, 0, 0, 0, 0];
                                const min = Math.min(...history);
                                const max = Math.max(...history);
                                const range = max - min || 1;
                                const points = history.map((val: number, i: number) => {
                                    const x = (i / (history.length - 1)) * 100;
                                    const y = 40 - ((val - min) / range) * 30 - 5;
                                    return `${x},${y}`;
                                });
                                return `M ${points.join(' L ')} L 100,40 L 0,40 Z`;
                            })()}
                            fill="url(#chartGradient)"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.5 }}
                        />
                    </svg>
                </div>
            </div>
        </motion.div>
    );
}
