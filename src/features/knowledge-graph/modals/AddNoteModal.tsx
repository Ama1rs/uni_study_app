import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddNote: (content: string) => void;
    initialContent?: string;
}

export function AddNoteModal({ isOpen, onClose, onAddNote, initialContent = '' }: AddNoteModalProps) {
    const [noteContent, setNoteContent] = useState(initialContent);

    // Sync content if it changes externally (e.g. from template selection)
    // Actually we can just key the component or handle it in parent.
    // Let's use useEffect to sync if initialContent changes.
    useState(() => {
        if (initialContent) setNoteContent(initialContent);
    });

    const handleSubmit = () => {
        if (!noteContent.trim()) return;
        onAddNote(noteContent);
        setNoteContent('');
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
                            <h3 className="text-lg font-bold text-text-primary">Add Smart Note</h3>
                            <motion.select
                                className="px-3 py-1 rounded-lg text-sm border border-border bg-transparent outline-none cursor-pointer text-text-secondary focus:border-accent transition-colors"
                                onChange={(e) => {
                                    const t = e.target.value;
                                    if (t === 'cornell') setNoteContent("# Topic\n\n## Cues\n- Key Point 1\n- Key Point 2\n\n## Notes\nDetailed notes here...\n\n## Summary\nBrief summary...");
                                    if (t === 'meeting') setNoteContent("# Meeting: [Title]\n**Date:** [Today]\n**Attendees:** \n\n## Agenda\n1. \n2. \n\n## Action Items\n- [ ] ");
                                    if (t === 'concept') setNoteContent("# Concept: \n\n**Definition:** \n\n**Examples:** \n- \n- \n\n**Related:**");
                                    if (t === '') setNoteContent('');
                                }}
                                whileHover={{ scale: 1.02 }}
                            >
                                <option value="">No Template</option>
                                <option value="cornell">Cornell Method</option>
                                <option value="meeting">Meeting Notes</option>
                                <option value="concept">Concept Definition</option>
                            </motion.select>
                        </motion.div>
                        <motion.p
                            className="text-sm mb-4 text-text-secondary"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.15 }}
                        >
                            Paste text below. Double newlines will split the text into separate linked nodes.
                        </motion.p>
                        <motion.textarea
                            className="w-full h-64 px-4 py-3 rounded-xl mb-4 outline-none border border-border bg-transparent resize-none text-text-primary focus:border-accent transition-colors placeholder:text-text-tertiary"
                            placeholder="Enter your notes here..."
                            value={noteContent}
                            onChange={e => setNoteContent(e.target.value)}
                            autoFocus
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
                                whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)' }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Process & Add
                            </motion.button>
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
