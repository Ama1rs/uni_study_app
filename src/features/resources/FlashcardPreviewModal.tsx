import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, Plus } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface PreviewCard {
    front: string;
    back: string;
    heading_path?: string;
}

interface FlashcardPreviewModalProps {
    noteId: number;
    initialCards: PreviewCard[];
    onClose: () => void;
    onSave: () => void;
}

export function FlashcardPreviewModal({ noteId, initialCards, onClose, onSave }: FlashcardPreviewModalProps) {
    const [cards, setCards] = useState<PreviewCard[]>(initialCards);
    const [isSaving, setIsSaving] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const handleRemove = (index: number) => {
        setCards(prev => prev.filter((_, i) => i !== index));
    };

    const handleCardChange = (index: number, field: 'front' | 'back', value: string) => {
        setCards(prev => prev.map((card, i) =>
            i === index ? { ...card, [field]: value } : card
        ));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save one by one or batch if backend supported it (current backend is one by one)
            // Parallel execution for speed
            await Promise.all(cards.map(card =>
                invoke('create_flashcard', {
                    noteId,
                    front: card.front,
                    back: card.back,
                    headingPath: card.heading_path
                })
            ));

            onSave();
            onClose();
        } catch (e) {
            console.error("Failed to save flashcards", e);
            alert("Failed to save some flashcards. Check console.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddCard = () => {
        setCards([...cards, { front: "New Question", back: "New Answer" }]);
        setEditingIndex(cards.length); // Edit the new card immediately
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-4xl h-[80vh] bg-bg-base border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-bg-surface/50">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                            <span className="text-purple-400">✨</span> Review Flashcards
                        </h2>
                        <p className="text-sm text-text-tertiary mt-1">
                            Generated from your note. Review, edit, or remove cards before saving.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-text-tertiary hover:text-text-primary transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                        {cards.map((card, index) => (
                            <motion.div
                                key={index}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className={`group relative bg-bg-surface border border-border rounded-2xl p-6 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5 transition-all overflow-hidden ${editingIndex === index ? 'ring-2 ring-accent/20 border-accent/50 bg-accent/5' : ''}`}
                                onClick={() => setEditingIndex(index)}
                            >
                                {/* Decorative Pattern for items */}
                                <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] card-pattern pointer-events-none" />

                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemove(index); }}
                                        className="p-2 hover:bg-red-500/10 text-text-tertiary hover:text-red-400 rounded-xl transition-colors backdrop-blur-sm border border-transparent hover:border-red-500/20"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-4 bg-accent rounded-full" />
                                            <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Front (Question)</label>
                                        </div>
                                        <textarea
                                            value={card.front}
                                            onChange={(e) => handleCardChange(index, 'front', e.target.value)}
                                            className="w-full bg-bg-base/30 border border-white/5 rounded-xl p-4 text-sm text-text-primary focus:border-accent/50 focus:ring-4 focus:ring-accent/5 outline-none resize-none transition-all h-28 custom-scrollbar"
                                            placeholder="Enter question..."
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
                                            <label className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">Back (Answer)</label>
                                        </div>
                                        <textarea
                                            value={card.back}
                                            onChange={(e) => handleCardChange(index, 'back', e.target.value)}
                                            className="w-full bg-bg-base/30 border border-white/5 rounded-xl p-4 text-sm text-text-primary focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 outline-none resize-none transition-all h-28 custom-scrollbar"
                                            placeholder="Enter answer..."
                                        />
                                    </div>
                                </div>
                                {card.heading_path && (
                                    <div className="mt-4 text-[9px] text-text-tertiary bg-white/5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 font-medium">
                                        <span className="opacity-50">Context:</span>
                                        <span className="text-text-secondary">{card.heading_path}</span>
                                    </div>
                                )}
                            </motion.div>

                        ))}
                    </AnimatePresence>

                    <button
                        onClick={handleAddCard}
                        className="w-full py-4 border-2 border-dashed border-border/50 rounded-xl text-text-tertiary hover:text-text-primary hover:border-purple-500/30 hover:bg-purple-500/5 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        <span>Add Manual Card</span>
                    </button>

                    <div className="h-12" /> {/* Spacer */}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-bg-surface/50 flex justify-between items-center">
                    <div className="text-sm text-text-tertiary">
                        {cards.length} cards in this pack
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || cards.length === 0}
                            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save {cards.length} Cards
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
