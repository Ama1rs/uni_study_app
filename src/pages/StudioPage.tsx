import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import {
    FileText,
    Presentation,
    Sparkles,
    ArrowRight,
    Library,
    Clock,
    Star,
    ChevronRight,
    PenTool,
    Plus,
    Search,
    BookOpen,
    Cpu
} from 'lucide-react';
import { Resource } from '../types/node-system';
import { cn } from '../lib/utils';
import { containerVariants, itemVariants } from '@/lib/animations';
import { StudioResourceTools } from '@/features/resources/StudioResourceTools';

interface StudioPageProps {
    onViewResource: (res: Resource) => void;
}

export function StudioPage({ onViewResource }: StudioPageProps) {
    const [templates] = useState<any[]>([
        { id: 'cornell', title: 'Cornell Notes', type: 'note', description: 'Structured note-taking', icon: FileText, color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
        { id: 'pitch', title: 'Pitch Deck', type: 'ppt', description: 'Professional slides', icon: Presentation, color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
        { id: 'math', title: 'Problem Set', type: 'note', description: 'Formulas & proofs', icon: BookOpen, color: 'text-green-400', bgColor: 'bg-green-400/10' },
        { id: 'flash', title: 'Smart Deck', type: 'note', description: 'AI-first flashcards', icon: Sparkles, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
    ]);

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

    async function handleQuickCreate(type: 'note' | 'ppt', templateId?: string) {
        try {
            const repos = await invoke<any[]>('get_repositories');
            if (repos.length === 0) {
                alert("Please create a repository first!");
                return;
            }

            const repoId = repos[0].id;
            const title = templateId ? `New ${templateId} ${type}` : `Untitled ${type}`;
            const content = "";

            const newRes = await invoke<Resource>('add_resource', {
                repositoryId: repoId,
                title,
                resourceType: type,
                content
            });

            onViewResource(newRes);
        } catch (e) {
            console.error("Failed to create resource:", e);
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
                {/* 1. AI Workspace Hero (Large) */}
                <motion.div
                    className="md:col-span-2 md:row-span-2 glass-card p-8 rounded-3xl relative overflow-hidden group border-white/5 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent shadow-2xl"
                    variants={itemVariants}
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px] -mr-32 -mt-32 rounded-full group-hover:bg-accent/20 transition-all duration-700 pointer-events-none" />

                    <div className="flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-accent/10 rounded-2xl">
                                <Cpu className="text-accent" size={28} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-text-primary">AI Copilot Workspace</h3>
                                <p className="text-text-tertiary text-xs font-mono uppercase tracking-widest mt-0.5">Automated Generation</p>
                            </div>
                        </div>

                        <p className="text-text-secondary text-lg leading-relaxed mb-8">
                            Transform your research into comprehensive study guides, slide decks, and quizzes with a single prompt. Our AI understands your context.
                        </p>

                        <div className="mt-auto flex flex-col gap-4">
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-text-tertiary font-mono">NEURAL-LINK v2</span>
                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-text-tertiary font-mono">MARKDOWN READY</span>
                            </div>
                            <button className="w-fit bg-white/5 hover:bg-accent hover:text-black border border-white/10 hover:border-accent p-4 rounded-2xl flex items-center gap-3 transition-all group/btn font-bold">
                                <span>Initialize AI Workspace</span>
                                <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* 2. Quick Create: Document */}
                <motion.button
                    className="md:col-span-1 glass-card p-6 rounded-3xl flex flex-col justify-between hover:border-accent/50 transition-colors group text-left shadow-xl"
                    variants={itemVariants}
                    onClick={() => handleQuickCreate('note')}
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

                {/* 3. Quick Create: Presentation */}
                <motion.button
                    className="md:col-span-1 glass-card p-6 rounded-3xl flex flex-col justify-between hover:border-accent/50 transition-colors group text-left shadow-xl"
                    variants={itemVariants}
                    onClick={() => handleQuickCreate('ppt')}
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

                {/* 4. Templates Section */}
                <motion.div
                    className="md:col-span-2 glass-card p-6 rounded-3xl flex flex-col shadow-xl"
                    variants={itemVariants}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Library size={18} className="text-text-tertiary" />
                            <h3 className="text-sm font-mono text-text-secondary uppercase tracking-widest">Template Library</h3>
                        </div>
                        <button className="text-[10px] text-accent font-mono hover:underline flex items-center gap-1 group">
                            ALL TEMPLATES <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => handleQuickCreate(template.type, template.id)}
                                className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all text-left group"
                            >
                                <div className={cn("p-2 rounded-xl group-hover:scale-110 transition-transform", template.bgColor)}>
                                    <template.icon size={18} className={template.color} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-text-primary truncate">{template.title}</p>
                                    <p className="text-[10px] text-text-tertiary truncate">{template.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* 6. Resource Manipulation Tools (PDF/Image) */}
                <StudioResourceTools />

                {/* 5. Recent Work (Horizontal List) */}
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
