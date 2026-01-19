import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Sparkles, Users, MessageSquare, BookOpen, ChevronRight } from 'lucide-react';
import { useAIGeneration } from '@/contexts/AIGenerationContext';
import logger from '@/lib/logger';

interface AIDocumentCreateProps {
    onBack: () => void;
    onGenerate: (data: DocumentGenerationData) => void;
}

export interface DocumentGenerationData {
    title: string;
    topic: string;
    description: string;
    target_audience: string;
    tone: string;
    length: string;
    language: string;
    document_type: string;
    formatting: string;
    section_structure: string;
    reference_material: string;
}

export function AIDocumentCreate({ onBack, onGenerate }: AIDocumentCreateProps) {
    const { state, setState } = useAIGeneration();
    const formData = state.documentFormData;

const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        logger.debug('AIDocumentCreate handleSubmit called with formData:', formData);
        onGenerate(formData);
    };

    const updateFormData = (field: keyof DocumentGenerationData, value: string) => {
        setState({
            documentFormData: { ...formData, [field]: value }
        });
    };

    return (
        <div className="w-full h-full p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar bg-bg-primary">
            {/* Header */}
            <motion.div
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
            >
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
                        <h1 className="text-2xl font-bold text-text-primary">Create AI Document</h1>
                        <p className="text-text-tertiary text-sm">Generate comprehensive study materials</p>
                    </div>
                </div>
            </motion.div>

            {/* Form */}
            <motion.form
                onSubmit={handleSubmit}
                className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                {/* Left Column - Main Inputs */}
                <div className="space-y-6">
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <Sparkles size={18} className="text-accent" />
                            Content Details
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => updateFormData('title', e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent focus:outline-none"
                                    placeholder="Enter document title..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Topic</label>
                                <input
                                    type="text"
                                    value={formData.topic}
                                    onChange={(e) => updateFormData('topic', e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent focus:outline-none"
                                    placeholder="e.g., Machine Learning, Calculus, History..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => updateFormData('description', e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent focus:outline-none resize-none"
                                    rows={3}
                                    placeholder="Describe what you want to create..."
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <Users size={18} className="text-accent" />
                            Target & Style
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Audience</label>
                                <select
                                    value={formData.target_audience}
                                    onChange={(e) => updateFormData('target_audience', e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                                >
                                    <option value="student">Student</option>
                                    <option value="professional">Professional</option>
                                    <option value="general">General</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Tone</label>
                                <select
                                    value={formData.tone}
                                    onChange={(e) => updateFormData('tone', e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                                >
                                    <option value="formal">Formal</option>
                                    <option value="concise">Concise</option>
                                    <option value="explanatory">Explanatory</option>
                                    <option value="creative">Creative</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Length</label>
                                <select
                                    value={formData.length}
                                    onChange={(e) => updateFormData('length', e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                                >
                                    <option value="short">Short</option>
                                    <option value="medium">Medium</option>
                                    <option value="long">Long</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Language</label>
                                <select
                                    value={formData.language}
                                    onChange={(e) => updateFormData('language', e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                                >
                                    <option value="English">English</option>
                                    <option value="Spanish">Spanish</option>
                                    <option value="French">French</option>
                                    <option value="German">German</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Document Specific */}
                <div className="space-y-6">
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <BookOpen size={18} className="text-accent" />
                            Document Settings
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Document Type</label>
                                <select
                                    value={formData.document_type}
                                    onChange={(e) => updateFormData('document_type', e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                                >
                                    <option value="notes">Study Notes</option>
                                    <option value="report">Report</option>
                                    <option value="article">Article</option>
                                    <option value="study-guide">Study Guide</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Formatting</label>
                                <select
                                    value={formData.formatting}
                                    onChange={(e) => updateFormData('formatting', e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                                >
                                    <option value="markdown">Markdown</option>
                                    <option value="latex">LaTeX</option>
                                    <option value="rich-text">Rich Text</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Section Structure</label>
                                <select
                                    value={formData.section_structure}
                                    onChange={(e) => updateFormData('section_structure', e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                                >
                                    <option value="auto">Auto-generated</option>
                                    <option value="user-defined">User-defined</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <MessageSquare size={18} className="text-accent" />
                            Reference Material
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Optional Notes/Text</label>
                            <textarea
                                value={formData.reference_material}
                                onChange={(e) => updateFormData('reference_material', e.target.value)}
                                className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent focus:outline-none resize-none"
                                rows={6}
                                placeholder="Paste notes, articles, or any reference material to base the document on..."
                            />
                        </div>
                    </div>

                    <motion.button
                        type="submit"
                        className="w-full bg-accent text-black px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-lg shadow-accent/20"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Sparkles size={20} />
                        Generate Document
                        <ChevronRight size={20} />
                    </motion.button>
                </div>
            </motion.form>
        </div>
    );
}