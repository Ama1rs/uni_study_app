import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import {
    FileText,
    Presentation,
    Clock,
    PenTool,
    Sparkles,
    Trash2,
    Image as ImageIcon
} from 'lucide-react';
import { Resource } from '../types/node-system';
import { StudioResourceTools } from '@/features/resources/StudioResourceTools';
import { useAIGeneration } from '@/contexts/AIGenerationContext';

interface StudioPageProps {
    onViewResource: (res: Resource) => void;
    setActiveView: (view: string) => void;
}

export function StudioPage({ onViewResource, setActiveView }: StudioPageProps) {
    const { state, reset } = useAIGeneration();
    const [recentCreations, setRecentCreations] = useState<Resource[]>([]);

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

    // PDF Tool handlers - TODO: Integrate with StudioResourceTools dialogs
    // Image Tool handlers - TODO: Integrate with StudioResourceTools dialogs


    return (
        <div className="w-full h-full min-h-0 flex flex-col flex-1 bg-bg-primary" style={{flex: 1, minHeight: 0, height: '100%'}}>
            {/* Header section */}
            <motion.div
                className="flex items-center justify-between"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div>
                    <div className="flex items-center gap-3 text-accent mb-2">
                        <PenTool size={20} />
                        <span className="text-sm font-bold uppercase tracking-[0.2em] font-mono">Creative Studio</span>
                    </div>
                    <h1 className="text-4xl font-bold text-text-primary">Content Forge</h1>
                </div>
            </motion.div>

            {/* Resume Banner */}
            {state.generatedContent && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-between shadow-lg backdrop-blur-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-accent/20 rounded-xl">
                            <Sparkles size={24} className="text-accent" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-text-primary">Unsaved Generation Found</h4>
                            <p className="text-sm text-text-tertiary">
                                You have an unsaved {state.generationData?.document_type ? 'document' : 'presentation'}
                                {state.generationData?.title ? `: "${state.generationData.title}"` : ''}
                                ready for review.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => reset()}
                            className="p-3 text-text-tertiary hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                            title="Discard"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button
                            onClick={() => setActiveView(state.generationData?.document_type ? 'ai-document-review' : 'ai-presentation-review')}
                            className="bg-accent text-black px-6 py-3 rounded-xl text-sm font-bold hover:scale-105 transition-transform shadow-lg shadow-accent/20"
                        >
                            Continue Review
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Top Section: Feature Cards */}
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                <motion.button
                    onClick={() => setActiveView('ai-document-create')}
                    className="flex items-start gap-4 p-4 rounded-2xl border border-border hover:bg-bg-hover hover:border-accent/50 transition-all group bg-bg-surface/60 backdrop-blur-sm h-32"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30">
                        <FileText className="text-blue-400" size={18} />
                    </div>
                    <div className="flex-1">
                        <div className="text-lg font-bold text-text-primary">Document</div>
                        <div className="text-xs text-text-tertiary font-mono uppercase tracking-wider mt-1">MARKDOWN</div>
                    </div>
                </motion.button>

                <motion.button
                    onClick={() => setActiveView('ai-presentation-create')}
                    className="flex items-start gap-4 p-4 rounded-2xl border border-border hover:bg-bg-hover hover:border-accent/50 transition-all group bg-bg-surface/60 backdrop-blur-sm h-32"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30">
                        <Presentation className="text-purple-400" size={18} />
                    </div>
                    <div className="flex-1">
                        <div className="text-lg font-bold text-text-primary">Presentation</div>
                        <div className="text-xs text-text-tertiary font-mono uppercase tracking-wider mt-1">SLIDES</div>
                    </div>
                </motion.button>
            </motion.div>

            {/* Bottom Section: two equal cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="p-6 bg-bg-surface/60 border border-border rounded-2xl min-h-[220px]">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock size={18} className="text-text-tertiary" />
                        <h3 className="text-sm font-mono text-text-tertiary uppercase tracking-widest">Recent Workspace</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                        {recentCreations.map((res) => (
                            <button
                                key={res.id}
                                onClick={() => onViewResource(res)}
                                className="w-full flex items-center gap-3 p-4 rounded-lg hover:bg-bg-hover transition-colors text-left"
                            >
                                <div className="w-10 h-10 flex items-center justify-center rounded-md bg-bg-primary/30 border border-border">
                                    {res.type === 'ppt' ? <Presentation size={18} className="text-purple-400" /> : res.type === 'image' ? <ImageIcon size={18} className="text-cyan-400" /> : <FileText size={18} className="text-blue-400" />}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-sm text-text-primary truncate">{res.title}</div>
                                    <div className="text-xs text-text-tertiary font-mono">{new Date(res.updated_at || res.created_at || '').toLocaleDateString()}</div>
                                </div>
                                <div className="ml-3"><span className="text-[10px] uppercase font-mono px-2 py-1 rounded-full bg-bg-primary/20 text-text-tertiary">{res.type === 'image' ? 'IMAGE' : res.type === 'ppt' ? 'PRESENTATION' : 'NOTE'}</span></div>
                            </button>
                        ))}
                        {recentCreations.length === 0 && (
                            <div className="p-6 text-center text-text-tertiary text-sm font-mono">No recent files</div>
                        )}
                    </div>
                </section>

                <section className="p-6 bg-bg-surface/60 border border-border rounded-2xl min-h-[220px]">
                    <div className="flex items-center gap-3 mb-4">
                        <FileText size={14} className="text-red-400" />
                        <h3 className="text-sm font-bold text-text-tertiary uppercase tracking-widest font-mono">Tools</h3>
                    </div>
                    <div className="min-h-0 overflow-y-auto">
                        <StudioResourceTools />
                    </div>
                </section>
            </div>
        </div>
    );
}
