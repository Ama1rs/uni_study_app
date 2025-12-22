import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, DollarSign } from 'lucide-react';
import { financeService, SavingsGoal } from '@/lib/financeService';

interface AdjustGoalModalProps {
    goal: SavingsGoal;
    onClose: () => void;
    onUpdate: () => void;
}

export function AdjustGoalModal({ goal, onClose, onUpdate }: AdjustGoalModalProps) {
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
