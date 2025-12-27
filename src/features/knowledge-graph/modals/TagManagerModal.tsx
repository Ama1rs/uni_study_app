import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Search } from 'lucide-react';

interface TagManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    tags: string[];
    onDeleteTag: (tag: string) => void;
    onCreateTag: (tag: string) => void;
}

export function TagManagerModal({
    isOpen,
    onClose,
    tags,
    onDeleteTag,
    onCreateTag
}: TagManagerModalProps) {
    const [newTag, setNewTag] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTags = useMemo(() => {
        if (!searchQuery) return tags;
        const lowerSearch = searchQuery.toLowerCase();
        return tags.filter(tag => tag.toLowerCase().includes(lowerSearch));
    }, [tags, searchQuery]);

    const handleAddTag = () => {
        if (!newTag.trim()) return;
        if (tags.some(t => t.toLowerCase() === newTag.toLowerCase())) {
            alert('Tag already exists');
            return;
        }
        onCreateTag(newTag.trim());
        setNewTag('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddTag();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="p-6 rounded-2xl w-96 max-h-[80vh] shadow-xl bg-bg-surface border border-border overflow-hidden flex flex-col"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-text-primary mb-4">Manage Tags</h3>

                        {/* Add New Tag */}
                        <div className="mb-6">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Create new tag..."
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="flex-1 px-3 py-2 rounded-lg outline-none border border-border bg-transparent text-text-primary placeholder-text-tertiary focus:border-accent transition-colors"
                                    autoFocus
                                />
                                <motion.button
                                    onClick={handleAddTag}
                                    className="px-4 py-2 rounded-lg bg-accent text-black font-medium flex items-center gap-1 hover:bg-accent-hover transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Plus size={16} />
                                    Add
                                </motion.button>
                            </div>
                        </div>

                        {/* Search Tags */}
                        <div className="mb-4 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search tags..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-lg outline-none border border-border bg-transparent text-text-primary placeholder-text-tertiary focus:border-accent transition-colors text-sm"
                            />
                        </div>

                        {/* Tags List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                            {filteredTags.length === 0 ? (
                                <div className="text-center py-8 text-text-secondary">
                                    <p className="text-sm">{tags.length === 0 ? 'No tags yet' : 'No matching tags'}</p>
                                </div>
                            ) : (
                                filteredTags.map((tag, index) => (
                                    <motion.div
                                        key={tag}
                                        className="flex items-center justify-between p-3 rounded-lg bg-bg-hover border border-border/50 hover:border-accent/40 transition-colors group"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        exit={{ opacity: 0, x: 10 }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-accent/10 text-accent">
                                                #{tag}
                                            </span>
                                        </div>
                                        <motion.button
                                            onClick={() => {
                                                if (window.confirm(`Delete tag "${tag}"?`)) {
                                                    onDeleteTag(tag);
                                                }
                                            }}
                                            className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Trash2 size={16} />
                                        </motion.button>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Close Button */}
                        <div className="mt-6 flex justify-end">
                            <motion.button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Close
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
