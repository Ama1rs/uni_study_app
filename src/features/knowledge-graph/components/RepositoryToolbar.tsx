import { motion } from 'framer-motion';
import { Plus, Upload } from 'lucide-react';
import { SearchWithTags } from './SearchWithTags';

interface RepositoryToolbarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    availableTags: string[];
    onShowAddNote: () => void;
    onImportFile: () => void;
    isImporting: boolean;
    activeView: 'graph' | 'list' | 'videos' | 'editor';
}

export function RepositoryToolbar({
    searchQuery,
    setSearchQuery,
    availableTags,
    onShowAddNote,
    onImportFile,
    isImporting,
    activeView
}: RepositoryToolbarProps) {
    if (activeView === 'videos' || activeView === 'editor') return null;

    return (
        <motion.div
            className="flex-shrink-0 flex gap-4 px-6 py-4 border-b border-border bg-bg-base relative z-40"
            style={{ borderColor: 'var(--border)' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
        >
            <SearchWithTags
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                availableTags={availableTags}
            />

            <motion.button
                onClick={onShowAddNote}
                className="px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 text-white transition-colors"
                style={{ backgroundColor: 'var(--accent)' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.15 }}
            >
                <Plus size={18} /> Create Note
            </motion.button>
            <motion.button
                onClick={onImportFile}
                disabled={isImporting}
                className="px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 text-white shadow-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)' }}
                whileHover={{ scale: 1.05 }}
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
