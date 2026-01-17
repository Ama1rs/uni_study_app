import { motion, AnimatePresence } from 'framer-motion';
import { containerVariants, itemVariants } from '@/lib/animations';

interface Template {
    id: string;
    name: string;
    desc: string;
    content: string;
}

const TEMPLATES: Template[] = [
    { id: 'cornell', name: 'Cornell Method', desc: 'Structured notes with cues and summary', content: "# Topic\n\n## Cues\n- Key Point 1\n- Key Point 2\n\n## Notes\nDetailed notes here...\n\n## Summary\nBrief summary..." },
    { id: 'meeting', name: 'Meeting Notes', desc: 'Agenda, attendees, and action items', content: "# Meeting: [Title]\n**Date:** [Today]\n**Attendees:** \n\n## Agenda\n1. \n2. \n\n## Action Items\n- [ ] " },
    { id: 'concept', name: 'Concept Definition', desc: 'Deep dive into a single concept', content: "# Concept: \n\n**Definition:** \n\n**Examples:** \n- \n- \n\n**Related:**" },
    { id: 'feynman', name: 'Feynman Technique', desc: 'Explain it like I am 5', content: "# Concept Name\n\n## Explanation\n(Explain in simple terms)\n\n## Analogies\n\n## Knowledge Gaps\n" }
];

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (content: string) => void;
}

export function TemplateModal({ isOpen, onClose, onSelectTemplate }: TemplateModalProps) {
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
                    <motion.div
                        className="p-6 rounded-2xl w-[500px] shadow-xl bg-bg-surface border border-border"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.3 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.h3
                            className="text-lg font-bold mb-4 text-text-primary"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            Choose a Template
                        </motion.h3>
                        <motion.div
                            className="grid grid-cols-2 gap-4"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {TEMPLATES.map(t => (
                                <motion.button
                                    key={t.id}
                                    onClick={() => onSelectTemplate(t.content)}
                                    className="p-4 rounded-xl border border-border hover:bg-white/5 hover:border-accent/50 text-left transition-all group"
                                    variants={itemVariants}
                                    whileHover={{ scale: 1.05, borderColor: 'var(--accent)' }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className="font-semibold text-text-primary group-hover:text-accent mb-1">{t.name}</div>
                                    <div className="text-xs text-text-secondary">{t.desc}</div>
                                </motion.button>
                            ))}
                        </motion.div>
                        <motion.div
                            className="flex justify-end gap-2 mt-6"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
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
                </motion.div>
            )}
        </AnimatePresence>
    );
}
