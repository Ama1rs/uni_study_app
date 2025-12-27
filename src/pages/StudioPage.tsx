import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import {
    FileText,
    Presentation,
    Clock,
    Star,
    Plus,
    Search,
    PenTool
} from 'lucide-react';
import { Resource } from '../types/node-system';
import { containerVariants, itemVariants } from '@/lib/animations';
import { StudioResourceTools } from '@/features/resources/StudioResourceTools';

interface StudioPageProps {
    onViewResource: (res: Resource) => void;
    setActiveView: (view: string) => void;
}

export function StudioPage({ onViewResource, setActiveView }: StudioPageProps) {
    const [recentCreations, setRecentCreations] = useState<Resource[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadRecentResources();
    }, []);

    async function loadRecentResources() {
        try {
            const res = await invoke<Resource[]>('get_resources', { repositoryId: null });
            setRecentCreations(res.slice(0, 4));
        } catch (e) {
            console.error("Failed to load resources:", e);
        }
    }

    return (
        <div className="w-full h-full p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar bg-bg-primary">
            {/* Header section */}
            <motion.div
                className="flex items-center justify-between"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div>
                    <div className="flex items-center gap-2 text-accent mb-1">
                        <PenTool size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] font-mono">Creative Studio</span>
                    </div>
                    <h1 className="text-3xl font-bold text-text-primary">Content Forge</h1>
                </div>
                <div className="flex gap-3">
                    <div className="bg-bg-surface/80 border border-border rounded-lg px-4 py-2 flex items-center gap-3 glass-card">
                        <Search size={16} className="text-text-tertiary" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            className="bg-transparent border-none outline-none text-sm text-text-primary w-48 font-mono"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="bg-accent text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-accent/20">
                        <Plus size={18} />
                        New Project
                    </button>
                </div>
            </motion.div>

            {/* Bento Grid */}
            <motion.div
                className="grid grid-cols-1 md:grid-cols-4 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* 1. Quick Create: Document */}
                <motion.button
                    className="md:col-span-1 glass-card p-6 rounded-3xl flex flex-col justify-between hover:border-accent/50 transition-colors group text-left shadow-xl"
                    variants={itemVariants}
                    onClick={() => setActiveView('ai-document-create')}
                >
                    <div className="p-3 bg-blue-400/10 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                        <FileText className="text-blue-400" size={24} />
                    </div>
                    <div>
                        <h4 className="text-xl font-bold text-text-primary group-hover:text-accent transition-colors">New Document</h4>
                        <p className="text-text-tertiary text-xs mt-1">Rich text & LaTeX support</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-widest">MD / TXT</span>
                        <Plus size={16} className="text-text-tertiary group-hover:text-accent" />
                    </div>
                </motion.button>

                {/* 2. Quick Create: Presentation */}
                <motion.button
                    className="md:col-span-1 glass-card p-6 rounded-3xl flex flex-col justify-between hover:border-accent/50 transition-colors group text-left shadow-xl"
                    variants={itemVariants}
                    onClick={() => setActiveView('ai-presentation-create')}
                >
                    <div className="p-3 bg-purple-400/10 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                        <Presentation className="text-purple-400" size={24} />
                    </div>
                    <div>
                        <h4 className="text-xl font-bold text-text-primary group-hover:text-accent transition-colors">Presentation</h4>
                        <p className="text-text-tertiary text-xs mt-1">Dynamic slide creation</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-widest">SLIDES / PPT</span>
                        <Plus size={16} className="text-text-tertiary group-hover:text-accent" />
                    </div>
                </motion.button>

                {/* 3. Resource Manipulation Tools (PDF/Image) */}
                <StudioResourceTools />

                {/* 4. Recent Work (Horizontal List) */}
                <motion.div
                    className="md:col-span-4 glass-card p-6 rounded-3xl shadow-xl overflow-hidden"
                    variants={itemVariants}
                >
                    <div className="flex items-center gap-2 mb-6">
                        <Clock size={18} className="text-text-tertiary" />
                        <h3 className="text-sm font-mono text-text-secondary uppercase tracking-widest">Recent Workspace</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {recentCreations.length > 0 ? (
                            recentCreations.map((res) => (
                                <button
                                    key={res.id}
                                    onClick={() => onViewResource(res)}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-accent/30 hover:bg-accent/5 transition-all group text-left min-w-0"
                                >
                                    <div className="p-3 bg-bg-primary rounded-xl text-text-tertiary group-hover:text-accent transition-colors h-fit">
                                        {res.type === 'ppt' ? <Presentation size={20} /> : <FileText size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-text-primary truncate group-hover:text-accent transition-colors">{res.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-text-tertiary font-mono uppercase truncate">{res.type}</span>
                                            <span className="text-[10px] text-text-tertiary opacity-40">•</span>
                                            <span className="text-[10px] text-text-tertiary truncate">{new Date(res.updated_at || res.created_at || '').toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <Star size={14} className="text-text-tertiary hover:text-yellow-400 shrink-0" />
                                </button>
                            ))
                        ) : (
                            <div className="md:col-span-4 py-8 text-center border border-dashed border-white/10 rounded-2xl">
                                <p className="text-text-tertiary text-sm font-mono">No recent files found in studio</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
