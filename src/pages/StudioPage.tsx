import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import {
    FileText,
    Presentation,
    Clock,
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

            {/* Main Layout: Split View */}
            <motion.div
                className="flex gap-8 h-full"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Left: Create Tools */}
                <motion.div className="w-64 shrink-0 flex flex-col gap-4" variants={itemVariants}>
                    <h3 className="text-xs font-mono text-text-tertiary uppercase tracking-widest mb-2">Create New</h3>

                    <button
                        onClick={() => setActiveView('ai-document-create')}
                        className="flex items-center gap-3 p-3 rounded-sm border border-border hover:bg-bg-hover hover:border-accent/50 transition-all group text-left"
                    >
                        <FileText className="text-blue-400 group-hover:text-blue-300" size={20} />
                        <div>
                            <span className="block text-sm font-bold text-text-primary">Document</span>
                            <span className="text-[10px] text-text-tertiary font-mono">MARKDOWN / LATEX</span>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveView('ai-presentation-create')}
                        className="flex items-center gap-3 p-3 rounded-sm border border-border hover:bg-bg-hover hover:border-accent/50 transition-all group text-left"
                    >
                        <Presentation className="text-purple-400 group-hover:text-purple-300" size={20} />
                        <div>
                            <span className="block text-sm font-bold text-text-primary">Presentation</span>
                            <span className="text-[10px] text-text-tertiary font-mono">SLIDES</span>
                        </div>
                    </button>

                    {/* Studio Tools (PDF/Image) - Assuming StudioResourceTools can render list items if passed a prop, or wrapped */}
                    <div className="mt-4 pt-4 border-t border-border">
                        <StudioResourceTools />
                    </div>
                </motion.div>

                {/* Right: Recent Files Table */}
                <motion.div className="flex-1 min-w-0" variants={itemVariants}>
                    <div className="flex items-center gap-2 mb-6">
                        <Clock size={16} className="text-text-tertiary" />
                        <h3 className="text-xs font-mono text-text-tertiary uppercase tracking-widest">Recent Workspace</h3>
                    </div>

                    <div className="border border-border rounded-sm overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 p-3 bg-bg-surface border-b border-border text-xs font-mono text-text-tertiary uppercase tracking-wider">
                            <div className="col-span-6">Name</div>
                            <div className="col-span-3">Type</div>
                            <div className="col-span-3 text-right">Date</div>
                        </div>
                        <div className="divide-y divide-border">
                            {recentCreations.map((res) => (
                                <div
                                    key={res.id}
                                    onClick={() => onViewResource(res)}
                                    className="grid grid-cols-12 gap-4 p-3 hover:bg-bg-hover cursor-pointer transition-colors group items-center"
                                >
                                    <div className="col-span-6 flex items-center gap-3 overflow-hidden">
                                        {res.type === 'ppt' ? <Presentation size={16} className="text-purple-400 shrink-0" /> : <FileText size={16} className="text-blue-400 shrink-0" />}
                                        <span className="text-sm text-text-primary truncate">{res.title}</span>
                                    </div>
                                    <div className="col-span-3">
                                        <span className="text-[10px] bg-bg-surface border border-border px-1.5 py-0.5 rounded text-text-secondary uppercase">{res.type}</span>
                                    </div>
                                    <div className="col-span-3 text-right text-xs text-text-tertiary font-mono">
                                        {new Date(res.updated_at || res.created_at || '').toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                            {recentCreations.length === 0 && (
                                <div className="p-8 text-center text-text-tertiary text-sm font-mono">No recent files found in studio</div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
