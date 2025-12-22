import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Zap } from 'lucide-react';
import { Repository } from '../RepositoryView';

interface RepositoryHeaderProps {
    repository: Repository;
    activeView: 'graph' | 'list' | 'videos' | 'editor';
    setActiveView: (view: 'graph' | 'list' | 'videos' | 'editor') => void;
    showStressTest: boolean;
    setShowStressTest: (show: boolean) => void;
    onBack: () => void;
}

export function RepositoryHeader({
    repository,
    activeView,
    setActiveView,
    showStressTest,
    setShowStressTest,
    onBack
}: RepositoryHeaderProps) {
    if (activeView === 'editor') return null;

    return (
        <motion.div
            className="flex-shrink-0 flex flex-col md:flex-row items-center justify-between p-6 border-b border-border bg-bg-base z-10"
            style={{ borderColor: 'var(--border)' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <motion.div
                className="flex flex-col items-center md:items-start md:flex-row gap-4 w-full"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <motion.button
                    onClick={onBack}
                    className="p-2 rounded-xl hover:bg-white/5 transition-colors self-start md:self-center"
                    style={{ color: 'var(--text-secondary)' }}
                    whileHover={{ scale: 1.1, x: -4 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <ArrowLeft size={20} />
                </motion.button>
                <motion.div
                    className="flex flex-col items-center md:items-start"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                >
                    <div className="flex items-center gap-3 mb-1">
                        <motion.div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: 'var(--accent)' }}
                            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        />
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{repository.name}</h1>
                    </div>
                    <p className="text-sm text-center md:text-left" style={{ color: 'var(--text-secondary)' }}>{repository.description || 'No description'}</p>
                </motion.div>
            </motion.div>

            <motion.div
                className="flex items-center gap-2"
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
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === 'graph' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Graph
                    </motion.button>
                    <motion.button
                        onClick={() => setActiveView('list')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === 'list' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        List
                    </motion.button>
                </motion.div>
                <motion.button
                    onClick={() => setActiveView('videos')}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${activeView === 'videos' ? 'bg-white/10 text-white border-accent/70' : 'text-gray-300 hover:text-white hover:border-accent/50'}`}
                    style={{ borderColor: 'var(--border)' }}
                    title="YouTube Videos"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Video
                </motion.button>

                <motion.button
                    onClick={() => setShowStressTest(!showStressTest)}
                    className={`p-2.5 rounded-xl border transition-colors ${showStressTest ? 'bg-red-500/20 border-red-500 text-red-500' : 'hover:bg-white/5 text-gray-400 border-border'}`}
                    style={{ borderColor: showStressTest ? 'var(--red-500)' : 'var(--border)' }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    title="Stress Test Generator"
                >
                    <Zap size={20} />
                </motion.button>
                <motion.button
                    className="p-2.5 rounded-xl border hover:bg-white/5 transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                >
                    <Settings size={20} />
                </motion.button>
            </motion.div>
        </motion.div>
    );
}
