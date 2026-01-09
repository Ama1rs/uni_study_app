import { Variants, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Maximize2, RotateCcw, TrendingUp, ChevronRight, Activity, DollarSign, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    financeService,
    FinanceSummary,
    FinanceTransaction,
    FinanceBudget,
    SavingsGoal,
    FinanceAsset,
} from '@/lib/financeService';

// Components
import { SummaryHero } from './components/SummaryHero';
import { BudgetMetrics } from './components/BudgetMetrics';
import { AssetAllocationCard } from './components/AssetAllocationCard';
import { SpendingTrendsCard } from './components/SpendingTrendsCard';
import { RecentActivityCard } from './components/RecentActivityCard';

// Modals
import { AddEntryModal } from './modals/AddEntryModal';
import { AdjustGoalModal } from './modals/AdjustGoalModal';
import { AssetModal } from './modals/AssetModal';
import { BudgetModal } from './modals/BudgetModal';
import { HistoryModal } from './modals/HistoryModal';
import { FlowModal } from './modals/FlowModal';



const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: "easeOut"
        }
    }
};

export function FinanceFeature() {
    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
    const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [assets, setAssets] = useState<FinanceAsset[]>([]);
    const [flows, setFlows] = useState<any[]>([]);

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdjustGoalModalOpen, setIsAdjustGoalModalOpen] = useState(false);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);

    // Selection states
    const [selectedAsset, setSelectedAsset] = useState<FinanceAsset | null>(null);
    const [selectedBudget, setSelectedBudget] = useState<FinanceBudget | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async () => {
        try {
            const [s, t, b, g, a, f] = await Promise.all([
                financeService.getSummary(),
                financeService.getTransactions(),
                financeService.getBudgets(),
                financeService.getSavingsGoals(),
                financeService.getAssets(),
                financeService.getExpenseFlows()
            ]);
            setSummary(s);
            setTransactions(t);
            setBudgets(b);
            setGoals(g || []);
            setAssets(a);
            setFlows(f);
        } catch (error) {
            console.error('Failed to fetch finance data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredTransactions = transactions.filter(t =>
        t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalAssetsValue = assets.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="w-full h-full flex flex-col bg-bg-primary overflow-hidden font-sans">
            {/* Header Ticker */}
            <SummaryHero
                summary={summary}
                totalAssetsValue={totalAssetsValue}
                itemVariants={itemVariants}
            />

            <div className="flex-1 overflow-auto custom-scrollbar flex flex-col">
                {/* Action Bar */}
                <div className="h-14 flex items-center justify-between px-4 pt-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-64 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-accent transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="SEARCH TRANSACTIONS..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-bg-card/50 border border-border/10 rounded-sm pl-9 pr-4 py-1.5 text-xs text-text-primary outline-none focus:border-accent/60 transition-colors font-mono placeholder:text-text-muted uppercase"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-1.5 hover:bg-bg-hover rounded transition-colors text-text-tertiary">
                            <Clock size={16} />
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-accent text-white hover:opacity-90 px-3 py-1.5 rounded-sm font-mono font-bold text-xs flex items-center gap-2 transition-colors uppercase tracking-wider shadow-lg shadow-accent/20"
                        >
                            <Plus size={14} />
                            New Transaction
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 min-h-full">
                    {/* Left Column: Metrics & Activity */}
                    <div className="lg:col-span-8 flex flex-col gap-4">
                        {/* Recent Activity Section */}
                        <div className="flex-1 min-h-[400px]">
                            <RecentActivityCard
                                transactions={filteredTransactions}
                                onViewHistory={() => setIsHistoryModalOpen(true)}
                                itemVariants={itemVariants}
                            />
                        </div>

                        {/* Performance Chart Section */}
                        <div className="h-[300px]">
                            <SpendingTrendsCard
                                budgets={budgets}
                                summary={summary}
                                onViewHistory={() => setIsHistoryModalOpen(true)}
                                onViewFlow={() => setIsFlowModalOpen(true)}
                                onSelectBudget={(budget) => { setSelectedBudget(budget); setIsBudgetModalOpen(true); }}
                                itemVariants={itemVariants}
                            />
                        </div>
                    </div>

                    {/* Right Column: Allocation & Budgets */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <div className="flex-1">
                            <AssetAllocationCard
                                assets={assets}
                                totalAssetsValue={totalAssetsValue}
                                onSelectAsset={(asset) => { setSelectedAsset(asset); setIsAssetModalOpen(true); }}
                                itemVariants={itemVariants}
                            />
                        </div>

                        {/* Budget Monitor */}
                        <div className="flex-1 min-h-[300px]">
                            <BudgetMetrics
                                budgets={budgets}
                                goals={goals}
                                onAdjustGoal={() => setIsAdjustGoalModalOpen(true)}
                                itemVariants={itemVariants}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isAddModalOpen && (
                    <AddEntryModal onClose={() => setIsAddModalOpen(false)} onAdd={fetchData} />
                )}
                {isAdjustGoalModalOpen && (
                    <AdjustGoalModal
                        goal={goals[0]}
                        onClose={() => setIsAdjustGoalModalOpen(false)}
                        onUpdate={fetchData}
                    />
                )}
                {isAssetModalOpen && (
                    <AssetModal
                        asset={selectedAsset}
                        onClose={() => { setIsAssetModalOpen(false); setSelectedAsset(null); }}
                        onUpdate={fetchData}
                    />
                )}
                {isBudgetModalOpen && (
                    <BudgetModal
                        budget={selectedBudget}
                        onClose={() => { setIsBudgetModalOpen(false); setSelectedBudget(null); }}
                        onUpdate={fetchData}
                    />
                )}
                {isHistoryModalOpen && (
                    <HistoryModal
                        transactions={transactions}
                        onClose={() => setIsHistoryModalOpen(false)}
                        onUpdate={fetchData}
                    />
                )}
                {isFlowModalOpen && (
                    <FlowModal
                        flows={flows}
                        onClose={() => setIsFlowModalOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div >
    );
}
