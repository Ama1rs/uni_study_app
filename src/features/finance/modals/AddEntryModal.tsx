import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { financeService } from '@/lib/financeService';

interface AddEntryModalProps {
    onClose: () => void;
    onAdd: () => void;
}

export function AddEntryModal({ onClose, onAdd }: AddEntryModalProps) {
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
