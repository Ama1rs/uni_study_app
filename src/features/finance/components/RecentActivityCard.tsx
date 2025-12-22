import { motion } from 'framer-motion';
import { History as HistoryIcon } from 'lucide-react';
import { FinanceTransaction } from '@/lib/financeService';
import { TransactionMini } from './TransactionMini';

interface RecentActivityCardProps {
    transactions: FinanceTransaction[];
    onViewHistory: () => void;
    itemVariants: any;
}

export function RecentActivityCard({
    transactions,
    onViewHistory,
    itemVariants
}: RecentActivityCardProps) {
    return (
        <motion.div
            className="md:col-span-4 glass-card p-4 rounded-2xl"
            variants={itemVariants}
        >
            <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-mono text-text-tertiary uppercase">Recent Activity</h3>
                <button
                    onClick={onViewHistory}
                    className="text-[10px] text-accent font-mono hover:underline flex items-center gap-1"
                >
                    <HistoryIcon size={12} />
                    Full History
                </button>
            </div>
            <div className="flex flex-wrap gap-4 overflow-x-hidden">
                {transactions.slice(0, 4).map((t) => (
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
    );
}
