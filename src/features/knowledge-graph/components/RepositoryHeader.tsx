import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Zap } from 'lucide-react';
import { Repository } from '../RepositoryView';

interface RepositoryHeaderProps {
    repository: Repository;
    activeView: 'graph' | 'list' | 'videos' | 'editor';
    setActiveView: (view: 'graph' | 'list' | 'videos' | 'editor') => void;
    showStressTest: boolean;
    setShowStressTest: (show: boolean) => void;
    showRepositorySettings: boolean;
    setShowRepositorySettings: (show: boolean) => void;
    onBack: () => void;
}

export function RepositoryHeader({
    repository,
    activeView,
    setActiveView,
    showStressTest,
    setShowStressTest,
    showRepositorySettings,
    setShowRepositorySettings,
    onBack
}: RepositoryHeaderProps) {
    if (activeView === 'editor') return null;

    return (
        <motion.div
            className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-bg-base z-10 gap-4"
            style={{ borderColor: 'var(--border)' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <motion.div
                className="flex items-center gap-3 overflow-hidden"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <motion.button
                    onClick={onBack}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
                    style={{ color: 'var(--text-secondary)' }}
                    whileHover={{ scale: 1.1, x: -2 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <ArrowLeft size={18} />
                </motion.button>

                <motion.div
                    className="flex items-center gap-3 overflow-hidden whitespace-nowrap"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                >
                    <div className="flex items-center gap-2">
                        <motion.div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: 'var(--accent)' }}
                            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        />
                        <h1 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{repository.name}</h1>
                    </div>
                    {repository.description && (
                        <>
                            <div className="w-px h-4 bg-border/50 flex-shrink-0 mx-1" />
                            <p className="text-xs truncate max-w-[300px]" style={{ color: 'var(--text-secondary)' }}>{repository.description}</p>
                        </>
                    )}
                </motion.div>
            </motion.div>

            <motion.div
                className="flex items-center gap-2 flex-shrink-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <motion.div
                    className="flex bg-black/20 p-1 rounded-lg border"
                    style={{ borderColor: 'var(--border)' }}
                    whileHover={{ scale: 1.02 }}
                >
                    <motion.button
                        onClick={() => setActiveView('graph')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeView === 'graph' ? 'bg-white/10 text-white shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
                        whileTap={{ scale: 0.95 }}
                    >
                        Concept Map
                    </motion.button>
                    <motion.button
                        onClick={() => setActiveView('list')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeView === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
                        whileTap={{ scale: 0.95 }}
                    >
                        List
                    </motion.button>
                    <div className="w-px bg-white/10 my-0.5 mx-0.5" />
                    <motion.button
                        onClick={() => setActiveView('videos')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeView === 'videos' ? 'bg-white/10 text-white shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
                        whileTap={{ scale: 0.95 }}
                    >
                        Video
                    </motion.button>
                </motion.div>

                <div className="h-6 w-px bg-border/50 mx-1" />

                <motion.button
                    onClick={() => setShowStressTest(!showStressTest)}
                    className={`p-2 rounded-lg border transition-colors ${showStressTest ? 'bg-red-500/20 border-red-500 text-red-500' : 'hover:bg-white/5 text-gray-400 border-border'}`}
                    style={{ borderColor: showStressTest ? 'var(--red-500)' : 'var(--border)' }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    title="Stress Test Generator"
                >
                    <Zap size={16} />
                </motion.button>
                <motion.button
                    onClick={() => setShowRepositorySettings(!showRepositorySettings)}
                    className="p-2 rounded-lg border hover:bg-white/5 transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    title="Repository Settings"
                >
                    <Settings size={16} />
                </motion.button>
            </motion.div>
        </motion.div>
    );
}
