import { motion, Variants, AnimatePresence } from 'framer-motion';
import {
    Wallet,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    DollarSign,
    CreditCard,
    Target,
    Plus,
    ChevronDown,
    Search,
    X,
    Trash2,
    History as HistoryIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import {
    financeService,
    FinanceSummary,
    FinanceTransaction,
    FinanceBudget,
    SavingsGoal,
    FinanceAsset,
    ExpenseFlow
} from '../lib/financeService';

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

export function Finance() {
    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
    const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [assets, setAssets] = useState<FinanceAsset[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdjustGoalModalOpen, setIsAdjustGoalModalOpen] = useState(false);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<FinanceAsset | null>(null);
    const [selectedBudget, setSelectedBudget] = useState<FinanceBudget | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAssetsCollapsed, setIsAssetsCollapsed] = useState(false);
    const [isSpendingCollapsed, setIsSpendingCollapsed] = useState(false);
    const [flows, setFlows] = useState<any[]>([]);

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
            {/* Header section */}
            <motion.div
                className="flex items-center justify-between"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div>
                    <h1 className="text-3xl font-bold text-text-primary mb-1">Financial Command</h1>
                    <p className="text-text-secondary">Managing your assets and budgets effectively</p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-bg-surface/80 border border-border rounded-lg px-4 py-2 flex items-center gap-3 glass-card">
                        <Search size={16} className="text-text-tertiary" />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm text-text-primary w-48 font-mono"
                        />
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-accent text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                    >
                        <Plus size={18} />
                        Add Entry
                    </button>
                </div>
            </motion.div>

            {/* Bento Grid */}
            <motion.div
                className="grid grid-cols-1 md:grid-cols-4 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* 1. Total Balance Hero (Large) */}
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

                        {/* Sparkline chart */}
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

                {/* 2. Budget Progress */}
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

                {/* 3. Savings Goal */}
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
                        onClick={() => setIsAdjustGoalModalOpen(true)}
                        className="mt-4 w-full py-2 rounded-lg border border-border hover:bg-bg-hover transition-colors text-xs text-text-secondary hover:text-text-primary font-mono"
                    >
                        Adjust Goal
                    </button>
                </motion.div>

                {/* 2. Asset Allocation (Medium) */}
                <motion.div
                    className={cn(
                        "md:col-span-2 glass-card p-6 rounded-2xl flex flex-col transition-all duration-500",
                        isAssetsCollapsed ? "md:row-span-1" : "md:row-span-2"
                    )}
                    variants={itemVariants}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-mono text-text-secondary uppercase tracking-widest">Asset Allocation</h3>
                        <button
                            onClick={() => setIsAssetsCollapsed(!isAssetsCollapsed)}
                            className="p-1 hover:bg-white/5 rounded-md transition-colors"
                        >
                            <ChevronDown
                                size={18}
                                className={cn("text-text-tertiary transition-transform duration-300", isAssetsCollapsed && "-rotate-90")}
                            />
                        </button>
                    </div>

                    <AnimatePresence>
                        {!isAssetsCollapsed && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden flex flex-col flex-1"
                            >
                                <div className="space-y-4 flex-1">
                                    {assets.map((asset) => (
                                        <AssetItem
                                            key={asset.id}
                                            icon={asset.type_ === 'cash' ? DollarSign : asset.type_ === 'stock' ? TrendingUp : asset.type_ === 'crypto' ? CreditCard : Target}
                                            label={asset.label}
                                            amount={`$${asset.amount.toLocaleString()}`}
                                            color={asset.color || 'bg-accent'}
                                            percent={Math.round((asset.amount / (totalAssetsValue || 1)) * 100)}
                                            onClick={() => { setSelectedAsset(asset); setIsAssetModalOpen(true); }}
                                        />
                                    ))}
                                    <button
                                        onClick={() => { setSelectedAsset(null); setIsAssetModalOpen(true); }}
                                        className="w-full p-3 rounded-xl border border-dashed border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-text-tertiary text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <Plus size={14} />
                                        Add New Asset
                                    </button>
                                </div>

                                <div className="mt-8 pt-6 border-t border-border">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[10px] font-mono text-text-tertiary uppercase">Allocation Strategy</span>
                                        <span className="text-xs font-mono text-accent">Balanced</span>
                                    </div>
                                    <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden flex">
                                        {assets.map((asset, i) => (
                                            <div
                                                key={i}
                                                className={cn(asset.color || "bg-accent", "h-full")}
                                                style={{ width: `${(asset.amount / (totalAssetsValue || 1)) * 100}%` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* 3. Spending Trends (Small) */}
                <motion.div
                    className={cn(
                        "md:col-span-2 glass-card p-6 rounded-2xl flex flex-col transition-all duration-500",
                        isSpendingCollapsed ? "md:row-span-1" : "md:row-span-2"
                    )}
                    variants={itemVariants}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-mono text-text-secondary uppercase tracking-widest">Top Spending</h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsHistoryModalOpen(true)}
                                className="text-[10px] text-accent font-mono hover:underline"
                            >
                                View History
                            </button>
                            <button
                                onClick={() => setIsFlowModalOpen(true)}
                                className="p-1 hover:bg-white/5 rounded-md transition-colors"
                                title="Visual Flow"
                            >
                                <PieChart
                                    size={16}
                                    className="text-accent"
                                />
                            </button>
                            <button
                                onClick={() => setIsSpendingCollapsed(!isSpendingCollapsed)}
                                className="p-1 hover:bg-white/5 rounded-md transition-colors"
                            >
                                <ChevronDown
                                    size={16}
                                    className={cn("text-text-tertiary transition-transform duration-300", isSpendingCollapsed && "-rotate-90")}
                                />
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {!isSpendingCollapsed && (
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
                                            onClick={() => { setSelectedBudget(budget); setIsBudgetModalOpen(true); }}
                                        />
                                    ))}
                                    <button
                                        onClick={() => { setSelectedBudget(null); setIsBudgetModalOpen(true); }}
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

                {/* 6. Recent Transactions Footer */}
                <motion.div
                    className="md:col-span-4 glass-card p-4 rounded-2xl"
                    variants={itemVariants}
                >
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h3 className="text-xs font-mono text-text-tertiary uppercase">Recent Activity</h3>
                        <button
                            onClick={() => setIsHistoryModalOpen(true)}
                            className="text-[10px] text-accent font-mono hover:underline flex items-center gap-1"
                        >
                            <HistoryIcon size={12} />
                            Full History
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-4 overflow-x-hidden">
                        {filteredTransactions.slice(0, 4).map((t) => (
                            <TransactionMini
                                key={t.id}
                                label={t.label}
                                amount={`${t.is_positive ? '+' : '-'}$${t.amount.toLocaleString()}`}
                                date={t.date ? new Date(t.date).toLocaleDateString() : 'N/A'}
                                positive={t.is_positive}
                                onClick={() => { /* We could add an edit transaction modal later if needed, but for now history handles it */ }}
                            />
                        ))}
                    </div>
                </motion.div>
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

function AddEntryModal({ onClose, onAdd }: { onClose: () => void, onAdd: () => void }) {
    const [label, setLabel] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Leisure');
    const [type, setType] = useState<'income' | 'expense'>('expense');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await financeService.createTransaction({
                label,
                amount: parseFloat(amount),
                category,
                is_positive: type === 'income'
            });
            onAdd();
            onClose();
        } catch (error) {
            console.error('Failed to add transaction:', error);
        }
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden relative"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl -mr-16 -mt-16" />

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text-primary">Add Entry</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <X size={20} className="text-text-tertiary" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-2 p-1 bg-bg-primary rounded-lg">
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={cn(
                                "flex-1 py-1.5 rounded-md text-xs font-mono transition-all",
                                type === 'expense' ? "bg-bg-surface text-rose-400 shadow-sm" : "text-text-tertiary"
                            )}
                        >
                            EXPENSE
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={cn(
                                "flex-1 py-1.5 rounded-md text-xs font-mono transition-all",
                                type === 'income' ? "bg-bg-surface text-emerald-400 shadow-sm" : "text-text-tertiary"
                            )}
                        >
                            INCOME
                        </button>
                    </div>

                    <div>
                        <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Label</label>
                        <input
                            required
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="e.g. Apple Store"
                            className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Amount</label>
                            <div className="relative">
                                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-bg-primary border border-border rounded-lg pl-9 pr-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors appearance-none"
                            >
                                <option value="Housing">Housing</option>
                                <option value="Equipments">Equipments</option>
                                <option value="Subscriptions">Subscriptions</option>
                                <option value="Leisure">Leisure</option>
                                <option value="Education">Education</option>
                                <option value="Salary">Salary</option>
                                <option value="Investments">Investments</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-accent text-black font-bold py-3 rounded-xl mt-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/20"
                    >
                        Save Transaction
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

function AdjustGoalModal({ goal, onClose, onUpdate }: { goal: SavingsGoal, onClose: () => void, onUpdate: () => void }) {
    const [targetAmount, setTargetAmount] = useState(goal?.target_amount.toString() || '');
    const [currentAmount, setCurrentAmount] = useState(goal?.current_amount.toString() || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const diff = parseFloat(currentAmount) - goal.current_amount;
            await financeService.updateSavingsGoal({
                ...goal,
                target_amount: parseFloat(targetAmount),
                current_amount: parseFloat(currentAmount)
            });

            // If funds were added, create a transaction
            if (diff > 0) {
                await financeService.createTransaction({
                    label: `Saved for ${goal.name}`,
                    amount: diff,
                    category: 'Savings',
                    is_positive: false,
                    date: new Date().toISOString()
                });
            }

            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to update goal:', error);
        }
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden relative"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl -mr-16 -mt-16" />

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text-primary">Adjust Goal</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <X size={20} className="text-text-tertiary" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Target Amount</label>
                        <div className="relative">
                            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                            <input
                                required
                                type="number"
                                value={targetAmount}
                                onChange={(e) => setTargetAmount(e.target.value)}
                                className="w-full bg-bg-primary border border-border rounded-lg pl-9 pr-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Current Savings</label>
                        <div className="relative">
                            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                            <input
                                required
                                type="number"
                                value={currentAmount}
                                onChange={(e) => setCurrentAmount(e.target.value)}
                                className="w-full bg-bg-primary border border-border rounded-lg pl-9 pr-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-accent text-black font-bold py-3 rounded-xl mt-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/20"
                    >
                        Update Goal
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

function AssetItem({ icon: Icon, label, amount, color, percent, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
        >
            <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-lg", color, "bg-opacity-20")}>
                    <Icon size={18} className={color.replace('bg-', 'text-')} />
                </div>
                <div>
                    <p className="text-sm text-text-primary font-medium">{label}</p>
                    <p className="text-[10px] text-text-tertiary font-mono">{percent}% of total</p>
                </div>
            </div>
            <p className="text-sm text-text-primary font-bold">{amount}</p>
        </div>
    );
}

function SpendingItem({ category, amount, trend, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-3 border-b border-border/50 last:border-0 hover:bg-white/5 transition-colors group cursor-pointer"
        >
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{category}</span>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-text-primary font-mono font-bold">{amount}</span>
                {trend === 'up' && <ArrowUpRight size={14} className="text-rose-400" />}
                {trend === 'down' && <ArrowDownRight size={14} className="text-emerald-400" />}
                {trend === 'static' && <div className="w-[14px] h-[1px] bg-text-tertiary" />}
            </div>
        </div>
    );
}

function TransactionMini({ label, amount, date, positive, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className="flex-1 min-w-[200px] p-3 rounded-xl bg-white/5 border border-border/50 flex items-center justify-between hover:border-accent/40 transition-colors cursor-pointer"
        >
            <div>
                <p className="text-xs text-text-primary font-medium">{label}</p>
                <p className="text-[10px] text-text-tertiary">{date}</p>
            </div>
            <p className={cn("text-xs font-bold font-mono", positive ? "text-emerald-400" : "text-rose-400")}>
                {amount}
            </p>
        </div>
    );
}

function AssetModal({ asset, onClose, onUpdate }: { asset: FinanceAsset | null, onClose: () => void, onUpdate: () => void }) {
    const [label, setLabel] = useState(asset?.label || '');
    const [amount, setAmount] = useState(asset?.amount.toString() || '');
    const [type, setType] = useState(asset?.type_ || 'cash');
    const [color, setColor] = useState(asset?.color || 'bg-blue-500');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                id: asset?.id,
                label,
                amount: parseFloat(amount),
                type_: type,
                color
            };
            if (asset) {
                await financeService.updateAsset(data as any);
            } else {
                await financeService.createAsset(data as any);
            }
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to save asset:', error);
        }
    };

    const handleDelete = async () => {
        if (!asset?.id) return;
        if (confirm('Are you sure you want to delete this asset?')) {
            try {
                await financeService.deleteAsset(asset.id);
                onUpdate();
                onClose();
            } catch (error) {
                console.error('Failed to delete asset:', error);
            }
        }
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden relative"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text-primary">{asset ? 'Edit Asset' : 'Add Asset'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <X size={20} className="text-text-tertiary" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Label</label>
                        <input
                            required
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Amount</label>
                        <input
                            required
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors appearance-none"
                            >
                                <option value="cash">Cash</option>
                                <option value="stock">Stock</option>
                                <option value="crypto">Crypto</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Color</label>
                            <select
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors appearance-none"
                            >
                                <option value="bg-blue-500">Blue</option>
                                <option value="bg-emerald-500">Emerald</option>
                                <option value="bg-orange-500">Orange</option>
                                <option value="bg-purple-500">Purple</option>
                                <option value="bg-rose-500">Rose</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        {asset && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="flex-1 bg-rose-500/10 text-rose-500 font-bold py-3 rounded-xl hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 size={18} />
                                Delete
                            </button>
                        )}
                        <button
                            type="submit"
                            className="flex-[2] bg-accent text-black font-bold py-3 rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-accent/20"
                        >
                            {asset ? 'Update Asset' : 'Create Asset'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

function BudgetModal({ budget, onClose, onUpdate }: { budget: FinanceBudget | null, onClose: () => void, onUpdate: () => void }) {
    const [category, setCategory] = useState(budget?.category || 'Housing');
    const [limit, setLimit] = useState(budget?.limit_amount.toString() || '');
    const [spent, setSpent] = useState(budget?.spent_amount.toString() || '0');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                id: budget?.id,
                category,
                limit_amount: parseFloat(limit),
                spent_amount: parseFloat(spent),
                period: 'monthly'
            };
            if (budget) {
                await financeService.updateBudget(data as any);
            } else {
                await financeService.createBudget(data as any);
            }
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to save budget:', error);
        }
    };

    const handleDelete = async () => {
        if (!budget?.id) return;
        if (confirm('Are you sure you want to delete this budget?')) {
            try {
                await financeService.deleteBudget(budget.id);
                onUpdate();
                onClose();
            } catch (error) {
                console.error('Failed to delete budget:', error);
            }
        }
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden relative"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text-primary">{budget ? 'Edit Budget' : 'Add Budget'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <X size={20} className="text-text-tertiary" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Category</label>
                        <select
                            disabled={!!budget}
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors appearance-none"
                        >
                            <option value="Housing">Housing</option>
                            <option value="Equipments">Equipments</option>
                            <option value="Subscriptions">Subscriptions</option>
                            <option value="Leisure">Leisure</option>
                            <option value="Education">Education</option>
                            <option value="Salary">Salary</option>
                            <option value="Investments">Investments</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Limit Amount</label>
                            <input
                                required
                                type="number"
                                value={limit}
                                onChange={(e) => setLimit(e.target.value)}
                                className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Spent Amount</label>
                            <input
                                required
                                type="number"
                                value={spent}
                                onChange={(e) => setSpent(e.target.value)}
                                className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        {budget?.id && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="flex-1 bg-rose-500/10 text-rose-500 font-bold py-3 rounded-xl hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 size={18} />
                                Delete
                            </button>
                        )}
                        <button
                            type="submit"
                            className="flex-[2] bg-accent text-black font-bold py-3 rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-accent/20"
                        >
                            {budget ? 'Update Budget' : 'Create Budget'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

function HistoryModal({ transactions, onClose, onUpdate }: { transactions: FinanceTransaction[], onClose: () => void, onUpdate: () => void }) {
    const [search, setSearch] = useState('');

    const filtered = transactions.filter(t =>
        t.label.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = async (id: number) => {
        if (confirm('Delete this transaction?')) {
            try {
                await financeService.deleteTransaction(id);
                onUpdate();
            } catch (error) {
                console.error('Failed to delete:', error);
            }
        }
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-bg-surface border border-border rounded-2xl p-8 w-full max-w-4xl max-h-[80vh] shadow-2xl overflow-hidden flex flex-col relative"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <HistoryIcon className="text-accent" size={24} />
                        <h2 className="text-2xl font-bold text-text-primary">Transaction History</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-bg-primary border border-border rounded-lg px-4 py-2 flex items-center gap-3">
                            <Search size={16} className="text-text-tertiary" />
                            <input
                                type="text"
                                placeholder="Filter transactions..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm text-text-primary w-48 font-mono"
                            />
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <X size={24} className="text-text-tertiary" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="py-4 text-[10px] font-mono text-text-tertiary uppercase tracking-widest">Date</th>
                                <th className="py-4 text-[10px] font-mono text-text-tertiary uppercase tracking-widest">Label</th>
                                <th className="py-4 text-[10px] font-mono text-text-tertiary uppercase tracking-widest">Category</th>
                                <th className="py-4 text-[10px] font-mono text-text-tertiary uppercase tracking-widest text-right">Amount</th>
                                <th className="py-4 text-[10px] font-mono text-text-tertiary uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filtered.map((t) => (
                                <tr key={t.id} className="group hover:bg-white/5 transition-colors">
                                    <td className="py-4 text-xs font-mono text-text-secondary">{t.date ? new Date(t.date).toLocaleDateString() : 'N/A'}</td>
                                    <td className="py-4 text-sm text-text-primary font-medium">{t.label}</td>
                                    <td className="py-4">
                                        <span className="px-2 py-1 rounded-md bg-white/5 text-[10px] text-text-tertiary uppercase font-mono border border-border">
                                            {t.category}
                                        </span>
                                    </td>
                                    <td className={cn("py-4 text-sm font-bold font-mono text-right", t.is_positive ? "text-emerald-400" : "text-rose-400")}>
                                        {t.is_positive ? '+' : '-'}${t.amount.toLocaleString()}
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleDelete(t.id!)}
                                                className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
}

function FlowModal({ flows, onClose }: { flows: ExpenseFlow[], onClose: () => void }) {
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
