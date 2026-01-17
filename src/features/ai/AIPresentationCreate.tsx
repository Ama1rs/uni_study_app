import { motion } from 'framer-motion';
import { ArrowLeft, Presentation, Sparkles, Users, MessageSquare, ChevronRight, Image } from 'lucide-react';
import { useAIGeneration } from '@/contexts/AIGenerationContext';

interface AIPresentationCreateProps {
    onBack: () => void;
    onGenerate: (data: PresentationGenerationData) => void;
}

export interface PresentationGenerationData {
    title: string;
    topic: string;
    description: string;
    target_audience: string;
    tone: string;
    slide_count: string;
    language: string;
    slide_style: string;
    bullet_preference: string;
    include_speaker_notes: boolean;
    reference_material: string;
}

export function AIPresentationCreate({ onBack, onGenerate }: AIPresentationCreateProps) {
    const { state, setState } = useAIGeneration();
    const formData = state.presentationFormData;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(formData);
    };

    const updateFormData = (field: keyof PresentationGenerationData, value: string | boolean) => {
        setState({
            presentationFormData: { ...formData, [field]: value }
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
                    <div className="p-3 bg-purple-400/10 rounded-2xl">
                        <Presentation className="text-purple-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Create AI Presentation</h1>
                        <p className="text-text-tertiary text-sm">Generate dynamic slide decks</p>
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
                                    placeholder="Enter presentation title..."
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
                                    placeholder="Describe what you want to present..."
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
                                <label className="block text-sm font-medium text-text-secondary mb-2">Slides</label>
                                <select
                                    value={formData.slide_count}
                                    onChange={(e) => updateFormData('slide_count', e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                                >
                                    <option value="5">5 slides</option>
                                    <option value="10">10 slides</option>
                                    <option value="15">15 slides</option>
                                    <option value="20">20 slides</option>
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

                {/* Right Column - Presentation Specific */}
                <div className="space-y-6">
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <Image size={18} className="text-accent" />
                            Presentation Settings
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Slide Style</label>
                                <select
                                    value={formData.slide_style}
                                    onChange={(e) => updateFormData('slide_style', e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                                >
                                    <option value="minimal">Minimal</option>
                                    <option value="academic">Academic</option>
                                    <option value="visual">Visual</option>
                                    <option value="corporate">Corporate</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Bullet Points</label>
                                <select
                                    value={formData.bullet_preference}
                                    onChange={(e) => updateFormData('bullet_preference', e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                                >
                                    <option value="minimal">Minimal bullets</option>
                                    <option value="balanced">Balanced</option>
                                    <option value="detailed">Detailed bullets</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="speaker-notes"
                                    checked={formData.include_speaker_notes}
                                    onChange={(e) => updateFormData('include_speaker_notes', e.target.checked)}
                                    className="w-4 h-4 text-accent bg-bg-surface border-border rounded focus:ring-accent focus:ring-2"
                                />
                                <label htmlFor="speaker-notes" className="text-sm font-medium text-text-secondary">
                                    Include speaker notes
                                </label>
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
                                placeholder="Paste notes, articles, or any reference material to base the presentation on..."
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
                        Generate Presentation
                        <ChevronRight size={20} />
                    </motion.button>
                </div>
            </motion.form>
        </div>
    );
}