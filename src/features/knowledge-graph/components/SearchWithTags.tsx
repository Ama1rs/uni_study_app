import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';

interface SearchWithTagsProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    availableTags: string[];
}

export function SearchWithTags({
    searchQuery,
    setSearchQuery,
    availableTags
}: SearchWithTagsProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // Extract the current search term being typed (after the last space or comma)
    const getCurrentSearchTerm = () => {
        const lastCommaIndex = searchQuery.lastIndexOf(',');
        const lastSpaceIndex = searchQuery.lastIndexOf(' ');
        const lastDelimiterIndex = Math.max(lastCommaIndex, lastSpaceIndex);
        
        if (lastDelimiterIndex === -1) {
            return searchQuery.trim();
        }
        
        return searchQuery.slice(lastDelimiterIndex + 1).trim();
    };

    const currentTerm = getCurrentSearchTerm();

    // Filter tags based on current search term
    const suggestions = useMemo(() => {
        if (!currentTerm) return availableTags.slice(0, 10); // Show first 10 if no filter
        
        const lowerTerm = currentTerm.toLowerCase();
        return availableTags
            .filter(tag => tag.toLowerCase().includes(lowerTerm))
            .slice(0, 10); // Limit to 10 suggestions
    }, [currentTerm, availableTags]);

    const handleTagSelect = (tag: string) => {
        const lastCommaIndex = searchQuery.lastIndexOf(',');
        const lastSpaceIndex = searchQuery.lastIndexOf(' ');
        const lastDelimiterIndex = Math.max(lastCommaIndex, lastSpaceIndex);

        let newQuery: string;
        if (lastDelimiterIndex === -1) {
            newQuery = tag;
        } else {
            newQuery = searchQuery.slice(0, lastDelimiterIndex + 1) + ' ' + tag;
        }

        setSearchQuery(newQuery);
        setShowSuggestions(false);
        setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    handleTagSelect(suggestions[selectedIndex]);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setSelectedIndex(-1);
                break;
        }
    };

    const shouldShowSuggestions = showSuggestions && currentTerm.length > 0 && suggestions.length > 0;

    return (
        <motion.div
            className="flex-1 relative z-10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.05 }}
        >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
            <input
                type="text"
                placeholder="Search nodes or tags..."
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                    setSelectedIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-transparent outline-none focus:border-blue-500 transition-colors relative z-20"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />

            {/* Tag Suggestions Dropdown */}
            <AnimatePresence>
                {shouldShowSuggestions && (
                    <motion.div
                        className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-bg-surface shadow-xl max-h-64 overflow-y-auto z-[9999]"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                    >
                        {suggestions.map((tag, index) => (
                            <motion.button
                                key={tag}
                                onClick={() => handleTagSelect(tag)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                className={`w-full px-4 py-2.5 text-left flex items-center gap-2 transition-colors ${
                                    selectedIndex === index
                                        ? 'bg-accent/20 text-accent'
                                        : 'hover:bg-bg-hover text-text-primary'
                                }`}
                                whileHover={{ x: 4 }}
                            >
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-accent/10 text-accent">
                                    #{tag}
                                </span>
                                <span className="text-xs text-text-secondary ml-auto">
                                    {availableTags.filter(t => t.toLowerCase() === tag.toLowerCase()).length} items
                                </span>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
