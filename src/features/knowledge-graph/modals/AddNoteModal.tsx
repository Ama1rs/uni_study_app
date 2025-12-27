import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddNote: (content: string, tags?: string) => void;
    initialContent?: string;
}

const TEMPLATES = [
    { id: 'blank', name: 'Blank Note', desc: 'Start with empty page' },
    { id: 'cornell', name: 'Cornell Method', desc: 'Structured notes with cues and summary', content: "# Topic\n\n## Cues\n- Key Point 1\n- Key Point 2\n\n## Notes\nDetailed notes here...\n\n## Summary\nBrief summary..." },
    { id: 'meeting', name: 'Meeting Notes', desc: 'Agenda, attendees, and action items', content: "# Meeting: [Title]\n**Date:** [Today]\n**Attendees:** \n\n## Agenda\n1. \n2. \n\n## Action Items\n- [ ] " },
    { id: 'concept', name: 'Concept Definition', desc: 'Define a concept with examples', content: "# Concept: \n\n**Definition:** \n\n**Examples:** \n- \n- \n\n**Related:**" },
];

export function AddNoteModal({ isOpen, onClose, onAddNote, initialContent = '' }: AddNoteModalProps) {
    const [noteContent, setNoteContent] = useState(initialContent);
    const [tags, setTags] = useState('');
    const [step, setStep] = useState<'template' | 'edit'>('template');

    useEffect(() => {
        setNoteContent(initialContent || '');
        setTags('');
        setStep('template');
    }, [isOpen, initialContent]);

    const handleTemplateSelect = (template: typeof TEMPLATES[0]) => {
        if (template.id === 'blank' || !template.content) {
            setNoteContent('');
        } else {
            setNoteContent(template.content);
        }
        setStep('edit');
    };

    const handleSubmit = () => {
        if (!noteContent.trim()) return;
        onAddNote(noteContent, tags.trim() || undefined);
        setNoteContent('');
        setTags('');
        setStep('template');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                >
                    {step === 'template' ? (
                        <motion.div
                            className="p-8 rounded-2xl w-[700px] shadow-xl bg-bg-surface border border-border max-h-[80vh] overflow-y-auto"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.3 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <motion.h3 className="text-xl font-bold text-text-primary mb-2">Create Note</motion.h3>
                            <motion.p className="text-sm text-text-secondary mb-6">Choose a template or start blank</motion.p>
                            
                            <motion.div
                                className="grid grid-cols-2 gap-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                            >
                                {TEMPLATES.map((template) => (
                                    <motion.button
                                        key={template.id}
                                        onClick={() => handleTemplateSelect(template)}
                                        className="p-4 rounded-xl border border-border bg-transparent hover:bg-[var(--bg-hover)] hover:border-border text-left transition-all group"
                                        whileHover={{ scale: 1.02, borderColor: 'var(--accent)' }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="font-semibold text-text-primary group-hover:text-accent transition-colors">{template.name}</div>
                                        <div className="text-xs text-text-tertiary mt-1">{template.desc}</div>
                                    </motion.button>
                                ))}
                            </motion.div>

                            <motion.div
                                className="flex justify-end gap-2 mt-6"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <motion.button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Cancel
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    ) : (
                        <motion.div
                            className="p-6 rounded-2xl w-[600px] shadow-xl bg-bg-surface border border-border"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.3 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <motion.div
                                className="flex justify-between items-center mb-4"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <h3 className="text-lg font-bold text-text-primary">Edit Note</h3>
                                <motion.button
                                    onClick={() => setStep('template')}
                                    className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    ← Change Template
                                </motion.button>
                            </motion.div>
                            <motion.textarea
                                className="w-full h-64 px-4 py-3 rounded-xl mb-4 outline-none border border-border bg-transparent resize-none text-text-primary focus:border-accent transition-colors placeholder:text-text-tertiary"
                                placeholder="Enter your notes here..."
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                autoFocus
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            />
                            <motion.input
                                type="text"
                                className="w-full px-4 py-2 rounded-lg outline-none border border-border bg-transparent text-text-primary placeholder-text-tertiary focus:border-accent transition-colors"
                                placeholder="Tags (comma-separated, optional)"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            />
                            <motion.div
                                className="flex justify-end gap-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                            >
                                <motion.button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 rounded-lg text-sm text-white bg-accent hover:opacity-90 transition-opacity"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Create & Add
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
