import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Sparkles, Download, Save, Edit3, RotateCcw, CheckCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import ReactMarkdown from 'react-markdown';

interface AIDocumentReviewProps {
    onBack: () => void;
    generationData: any; // Will be defined properly
    generatedContent: string;
    onRefine: (instructions: string) => void;
    onExport: (format: string) => void;
    onSave: (repositoryId: string, content: string) => void;
    isGenerating?: boolean;
    error?: string;
}

export function AIDocumentReview({
    onBack,
    generationData,
    generatedContent,
    onRefine,
    onExport,
    onSave,
    isGenerating = false,
    error
}: AIDocumentReviewProps) {
    const [refineInstructions, setRefineInstructions] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(generatedContent);
    const [selectedRepository, setSelectedRepository] = useState('');
    const [repositories, setRepositories] = useState<any[]>([]);

    useEffect(() => {
        setEditedContent(generatedContent);
    }, [generatedContent]);

    useEffect(() => {
        // Load repositories
        loadRepositories();
    }, []);

    const loadRepositories = async () => {
        try {
            const repos: any[] = await invoke('get_repositories');
            setRepositories(repos);
            if (repos.length > 0) {
                setSelectedRepository(repos[0].id.toString());
            }
        } catch (e) {
            console.error("Failed to load repositories:", e);
        }
    };

    const handleRefine = () => {
        if (refineInstructions.trim()) {
            onRefine(refineInstructions);
            setRefineInstructions('');
        }
    };

    const handleSave = () => {
        if (selectedRepository) {
            onSave(selectedRepository, editedContent);
        }
    };

    return (
        <div className="w-full h-full flex flex-col gap-8 overflow-y-auto custom-scrollbar">
            <motion.div
                className="flex items-center justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-text-secondary" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-400/10 rounded-2xl">
                            <FileText className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary">{generationData?.title || 'Generated Document'}</h1>
                            <p className="text-text-tertiary text-sm">Review and refine your AI-generated content</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-400/10 border border-green-400/20 rounded-full text-xs text-green-400 font-mono">
                        AI Generated
                    </span>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Content Preview */}
                    <motion.div
                        className="glass-card p-6 rounded-2xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-text-primary">Generated Content</h3>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <Edit3 size={16} className="text-text-secondary" />
                            </button>
                        </div>

                        {error ? (
                            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                                <div className="text-red-400">⚠️</div>
                                <div>
                                    <p className="text-red-400 font-medium">Generation Failed</p>
                                    <p className="text-red-300 text-sm">{error}</p>
                                </div>
                            </div>
                        ) : null}

                        {isGenerating ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                                    <span className="text-text-secondary">Generating content...</span>
                                </div>
                            </div>
                        ) : (
                            <div className="prose prose-invert max-w-none">
                                {isEditing ? (
                                    <textarea
                                        value={editedContent}
                                        onChange={(e) => setEditedContent(e.target.value)}
                                        className="w-full h-96 px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent focus:outline-none resize-none font-mono text-sm"
                                    />
                                ) : (
                                    <div className="prose prose-invert max-w-none">
                                        <ReactMarkdown>{editedContent}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>

                    {/* Refine Section */}
                    <motion.div
                        className="glass-card p-6 rounded-2xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <RotateCcw size={18} className="text-accent" />
                            Refine Content
                        </h3>
                        <div className="space-y-4">
                            <textarea
                                value={refineInstructions}
                                onChange={(e) => setRefineInstructions(e.target.value)}
                                className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent focus:outline-none resize-none"
                                rows={3}
                                placeholder="e.g., Make it shorter, add examples, change tone to more formal..."
                            />
                            <button
                                onClick={handleRefine}
                                disabled={!refineInstructions.trim() || isGenerating}
                                className="bg-accent text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Sparkles size={16} />
                                Refine
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    {/* Export Options */}
                    <motion.div
                        className="glass-card p-6 rounded-2xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <Download size={18} className="text-accent" />
                            Export
                        </h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => onExport('markdown')}
                                className="w-full p-3 bg-bg-surface hover:bg-white/5 border border-border rounded-lg text-left transition-colors"
                            >
                                <div className="font-medium text-text-primary">Markdown (.md)</div>
                                <div className="text-xs text-text-tertiary">Rich text formatting</div>
                            </button>
                            <button
                                onClick={() => onExport('pdf')}
                                className="w-full p-3 bg-bg-surface hover:bg-white/5 border border-border rounded-lg text-left transition-colors"
                            >
                                <div className="font-medium text-text-primary">PDF Document</div>
                                <div className="text-xs text-text-tertiary">Print-ready format</div>
                            </button>
                            <button
                                onClick={() => onExport('docx')}
                                className="w-full p-3 bg-bg-surface hover:bg-white/5 border border-border rounded-lg text-left transition-colors"
                            >
                                <div className="font-medium text-text-primary">Word Document (.docx)</div>
                                <div className="text-xs text-text-tertiary">Microsoft Word compatible</div>
                            </button>
                        </div>
                    </motion.div>

                    {/* Save to Repository */}
                    <motion.div
                        className="glass-card p-6 rounded-2xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <Save size={18} className="text-accent" />
                            Save to Repository
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Repository</label>
                                {repositories.length === 0 ? (
                                    <div className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-tertiary text-sm">
                                        No repositories found. Please create a repository first.
                                    </div>
                                ) : (
                                    <select
                                        value={selectedRepository}
                                        onChange={(e) => setSelectedRepository(e.target.value)}
                                        className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                                    >
                                        {repositories.map(repo => (
                                            <option key={repo.id} value={repo.id}>{repo.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={!selectedRepository || repositories.length === 0}
                                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckCircle size={16} />
                                Save Document
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}