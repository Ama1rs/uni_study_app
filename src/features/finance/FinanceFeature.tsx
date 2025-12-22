import { motion, Variants, AnimatePresence } from 'framer-motion';
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
import { FinanceHeader } from './components/FinanceHeader';
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

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

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

    // Collapse states
    const [isAssetsCollapsed, setIsAssetsCollapsed] = useState(false);
    const [isSpendingCollapsed, setIsSpendingCollapsed] = useState(false);

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
        <div className="w-full h-full p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar bg-bg-primary">
            <FinanceHeader
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onAddEntry={() => setIsAddModalOpen(true)}
            />

            <motion.div
                className="grid grid-cols-1 md:grid-cols-4 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <SummaryHero
                    summary={summary}
                    totalAssetsValue={totalAssetsValue}
                    itemVariants={itemVariants}
                />

                <BudgetMetrics
                    budgets={budgets}
                    goals={goals}
                    onAdjustGoal={() => setIsAdjustGoalModalOpen(true)}
                    itemVariants={itemVariants}
                />

                <AssetAllocationCard
                    assets={assets}
                    totalAssetsValue={totalAssetsValue}
                    isCollapsed={isAssetsCollapsed}
                    setIsCollapsed={setIsAssetsCollapsed}
                    onSelectAsset={(asset) => { setSelectedAsset(asset); setIsAssetModalOpen(true); }}
                    itemVariants={itemVariants}
                />

                <SpendingTrendsCard
                    budgets={budgets}
                    summary={summary}
                    isCollapsed={isSpendingCollapsed}
                    setIsCollapsed={setIsSpendingCollapsed}
                    onViewHistory={() => setIsHistoryModalOpen(true)}
                    onViewFlow={() => setIsFlowModalOpen(true)}
                    onSelectBudget={(budget) => { setSelectedBudget(budget); setIsBudgetModalOpen(true); }}
                    itemVariants={itemVariants}
                />

                <RecentActivityCard
                    transactions={filteredTransactions}
                    onViewHistory={() => setIsHistoryModalOpen(true)}
                    itemVariants={itemVariants}
                />
            </motion.div>

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
        </div>
    );
}
