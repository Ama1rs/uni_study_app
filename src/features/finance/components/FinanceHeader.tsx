import { motion } from 'framer-motion';
import { Search, Plus } from 'lucide-react';

interface FinanceHeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    onAddEntry: () => void;
}

export function FinanceHeader({ searchQuery, setSearchQuery, onAddEntry }: FinanceHeaderProps) {
    return (
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
                    onClick={onAddEntry}
                    className="bg-accent text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                >
                    <Plus size={18} />
                    Add Entry
                </button>
            </div>
        </motion.div>
    );
}
