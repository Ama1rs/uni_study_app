import { motion } from 'framer-motion';
import { Search, Filter, LayoutTemplate, Upload } from 'lucide-react';
import { SearchFilterPanel } from '../SearchFilterPanel';

interface RepositoryToolbarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    filterTypes: string[];
    onToggleType: (type: string) => void;
    availableTypes: string[];
    filterStatus: string[];
    onToggleStatus: (status: string) => void;
    onShowTemplates: () => void;
    onImportFile: () => void;
    isImporting: boolean;
    activeView: 'graph' | 'list' | 'videos' | 'editor';
}

export function RepositoryToolbar({
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    filterTypes,
    onToggleType,
    availableTypes,
    filterStatus,
    onToggleStatus,
    onShowTemplates,
    onImportFile,
    isImporting,
    activeView
}: RepositoryToolbarProps) {
    if (activeView === 'videos' || activeView === 'editor') return null;

    return (
        <motion.div
            className="flex-shrink-0 flex gap-4 p-6 border-b border-border bg-bg-base relative"
            style={{ borderColor: 'var(--border)' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
        >
            <motion.div
                className="flex-1 relative"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.05 }}
            >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                    type="text"
                    placeholder="Search nodes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-transparent outline-none focus:border-blue-500 transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
            </motion.div>

            <motion.div
                className="relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <motion.button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 transition-colors ${(filterTypes.length > 0 || filterStatus.length > 0)
                        ? 'bg-accent/10 border-accent text-accent'
                        : 'hover:bg-white/5 text-text-secondary'
                        }`}
                    style={{ borderColor: (filterTypes.length > 0) ? '' : 'var(--border)' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Filter size={18} />
                    Filter
                    {(filterTypes.length > 0) && (
                        <motion.span
                            className="bg-accent text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.2em] text-center"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.3 }}
                        >
                            {filterTypes.length}
                        </motion.span>
                    )}
                </motion.button>

                <SearchFilterPanel
                    isOpen={showFilters}
                    onClose={() => setShowFilters(false)}
                    selectedTypes={filterTypes}
                    onToggleType={onToggleType}
                    availableTypes={availableTypes}
                    selectedStatus={filterStatus}
                    onToggleStatus={onToggleStatus}
                    availableStatuses={[]}
                />
            </motion.div>

            <motion.button
                onClick={onShowTemplates}
                className="px-4 py-2.5 rounded-xl border flex items-center gap-2 hover:bg-white/5 transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                title="Templates"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.15 }}
            >
                <LayoutTemplate size={18} /> Template
            </motion.button>
            <motion.button
                onClick={onImportFile}
                disabled={isImporting}
                className="px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)' }}
                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)' }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
            >
                <Upload size={18} /> Import
            </motion.button>
        </motion.div>
    );
}
