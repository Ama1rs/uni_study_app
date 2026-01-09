import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { financeService, FinanceBudget } from '@/lib/financeService';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface BudgetModalProps {
    budget: FinanceBudget | null;
    onClose: () => void;
    onUpdate: () => void;
}

export function BudgetModal({ budget, onClose, onUpdate }: BudgetModalProps) {
    const [category, setCategory] = useState(budget?.category || 'Housing');
    const [limit, setLimit] = useState(budget?.limit_amount.toString() || '');
    const [spent, setSpent] = useState(budget?.spent_amount.toString() || '0');

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        action: () => void;
    }>({ isOpen: false, title: '', description: '', action: () => { } });

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
        setConfirmState({
            isOpen: true,
            title: 'Delete Budget',
            description: 'Are you sure you want to delete this budget?',
            action: async () => {
                try {
                    await financeService.deleteBudget(budget.id!);
                    onUpdate();
                    onClose();
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    console.error('Failed to delete budget:', error);
                }
            }
        });
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
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.action}
                onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                danger
                confirmText="Delete"
            />
        </motion.div>
    );
}
