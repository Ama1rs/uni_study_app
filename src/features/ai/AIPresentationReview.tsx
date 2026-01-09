import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Presentation, Sparkles, Download, Save, RotateCcw, CheckCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface Slide {
    title: string;
    content: string;
    notes?: string;
}

interface AIPresentationReviewProps {
    onBack: () => void;
    generationData: any; // Will be defined properly
    generatedContent: any; // Presentation data structure
    onRefine: (instructions: string) => void;
    onExport: (format: string) => void;
    onSave: (repositoryId: string) => void;
    isGenerating?: boolean;
    error?: string;
}

export function AIPresentationReview({
    onBack,
    generationData,
    generatedContent,
    onRefine,
    onExport,
    onSave,
    isGenerating = false,
    error
}: AIPresentationReviewProps) {
    const [refineInstructions, setRefineInstructions] = useState('');
    const [selectedRepository, setSelectedRepository] = useState('');
    const [repositories, setRepositories] = useState<any[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);

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
            onSave(selectedRepository);
        }
    };

    // Mock slide data - in real implementation this would be parsed from generatedContent
    const slides: Slide[] = generatedContent?.slides || [
        { title: 'Title Slide', content: 'Presentation Title\nSubtitle', notes: 'Introduction notes' },
        { title: 'Slide 2', content: '• Point 1\n• Point 2\n• Point 3', notes: 'Detailed explanation' },
        { title: 'Slide 3', content: 'Key Concept\n\nExplanation here', notes: 'More notes' }
    ];

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
                        <div className="p-3 bg-purple-400/10 rounded-2xl">
                            <Presentation className="text-purple-400" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary">{generationData?.title || 'Generated Presentation'}</h1>
                            <p className="text-text-tertiary text-sm">Review and refine your AI-generated slides</p>
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
                    {/* Slide Preview */}
                    <motion.div
                        className="glass-card p-6 rounded-2xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-text-primary">Slide Preview</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                                    disabled={currentSlide === 0}
                                    className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                                >
                                    ‹
                                </button>
                                <span className="text-sm text-text-secondary">
                                    {currentSlide + 1} / {slides.length}
                                </span>
                                <button
                                    onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                                    disabled={currentSlide === slides.length - 1}
                                    className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                                >
                                    ›
                                </button>
                            </div>
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
                            <div className="flex items-center justify-center py-24">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                                    <span className="text-text-secondary">Generating presentation...</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-bg-surface rounded-lg p-8 min-h-[400px] flex flex-col">
                                <h2 className="text-xl font-bold text-text-primary mb-6">
                                    {slides[currentSlide]?.title}
                                </h2>
                                <div className="flex-1">
                                    <div className="prose prose-invert max-w-none">
                                        <ReactMarkdown>{slides[currentSlide]?.content}</ReactMarkdown>
                                    </div>
                                </div>
                                {slides[currentSlide]?.notes && (
                                    <div className="mt-6 pt-4 border-t border-border">
                                        <div className="text-xs text-text-tertiary mb-2">Speaker Notes:</div>
                                        <div className="text-sm text-text-secondary">
                                            {slides[currentSlide].notes}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>

                    {/* Slide Thumbnails */}
                    <motion.div
                        className="glass-card p-6 rounded-2xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h3 className="text-lg font-semibold text-text-primary mb-4">All Slides</h3>
                        <div className="grid grid-cols-5 gap-3">
                            {slides.map((slide: Slide, index: number) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={cn(
                                        "aspect-video bg-bg-surface rounded-lg p-3 text-left hover:bg-white/5 transition-colors border-2",
                                        currentSlide === index ? "border-accent" : "border-transparent"
                                    )}
                                >
                                    <div className="text-xs font-medium text-text-primary mb-1 truncate">
                                        {slide.title}
                                    </div>
                                    <div className="text-xs text-text-tertiary line-clamp-3">
                                        {slide.content.substring(0, 50)}...
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Refine Section */}
                    <motion.div
                        className="glass-card p-6 rounded-2xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <RotateCcw size={18} className="text-accent" />
                            Refine Presentation
                        </h3>
                        <div className="space-y-4">
                            <textarea
                                value={refineInstructions}
                                onChange={(e) => setRefineInstructions(e.target.value)}
                                className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent focus:outline-none resize-none"
                                rows={3}
                                placeholder="e.g., Add more slides, change style to corporate, reduce bullet points..."
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
                        transition={{ delay: 0.4 }}
                    >
                        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <Download size={18} className="text-accent" />
                            Export
                        </h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => onExport('pptx')}
                                className="w-full p-3 bg-bg-surface hover:bg-white/5 border border-border rounded-lg text-left transition-colors"
                            >
                                <div className="font-medium text-text-primary">PowerPoint (.pptx)</div>
                                <div className="text-xs text-text-tertiary">Microsoft PowerPoint compatible</div>
                            </button>
                            <button
                                onClick={() => onExport('pdf')}
                                className="w-full p-3 bg-bg-surface hover:bg-white/5 border border-border rounded-lg text-left transition-colors"
                            >
                                <div className="font-medium text-text-primary">PDF Presentation</div>
                                <div className="text-xs text-text-tertiary">Print-ready slides</div>
                            </button>
                        </div>
                    </motion.div>

                    {/* Save to Repository */}
                    <motion.div
                        className="glass-card p-6 rounded-2xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <Save size={18} className="text-accent" />
                            Save to Repository
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Repository</label>
                                <select
                                    value={selectedRepository}
                                    onChange={(e) => setSelectedRepository(e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                                >
                                    {repositories.map(repo => (
                                        <option key={repo.id} value={repo.id}>{repo.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={!selectedRepository}
                                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckCircle size={16} />
                                Save Presentation
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}