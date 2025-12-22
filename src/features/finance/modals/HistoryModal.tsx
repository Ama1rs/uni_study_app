import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search, History as HistoryIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { financeService, FinanceTransaction } from '@/lib/financeService';

interface HistoryModalProps {
    transactions: FinanceTransaction[];
    onClose: () => void;
    onUpdate: () => void;
}

export function HistoryModal({ transactions, onClose, onUpdate }: HistoryModalProps) {
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
