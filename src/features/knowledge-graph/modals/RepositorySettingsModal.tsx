import { useState, useEffect, useMemo } from 'react';
import { X, Trash2, Search } from 'lucide-react';

interface RepositorySettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteWidth: number;
    onNoteWidthChange: (width: number) => void;
    allTags: string[];
    onDeleteTag: (tag: string) => void;
    listViewType?: 'grid' | 'list';
    onListViewTypeChange?: (type: 'grid' | 'list') => void;
}

export function RepositorySettingsModal({
    isOpen,
    onClose,
    noteWidth,
    onNoteWidthChange,
    allTags,
    onDeleteTag,
    listViewType = 'grid',
    onListViewTypeChange
}: RepositorySettingsModalProps) {
    const [localWidth, setLocalWidth] = useState(noteWidth);
    const [activeTab, setActiveTab] = useState<'display' | 'tags'>('display');
    const [tagSearchQuery, setTagSearchQuery] = useState('');
    const [localListViewType, setLocalListViewType] = useState<'grid' | 'list'>(listViewType);

    useEffect(() => {
        setLocalWidth(noteWidth);
        setLocalListViewType(listViewType);
    }, [noteWidth, listViewType, isOpen]);

    const filteredTags = useMemo(() => {
        if (!tagSearchQuery) return allTags;
        const lowerSearch = tagSearchQuery.toLowerCase();
        return allTags.filter(tag => tag.toLowerCase().includes(lowerSearch));
    }, [allTags, tagSearchQuery]);

    if (!isOpen) return null;

    const handleSave = () => {
        onNoteWidthChange(localWidth);
        if (onListViewTypeChange && localListViewType !== listViewType) {
            onListViewTypeChange(localListViewType);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            {/* Modal */}
            <div
                className="relative rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-border"
                style={{ backgroundColor: 'var(--bg-surface)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        Repository Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        title="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
                    <button
                        onClick={() => setActiveTab('display')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'display'
                                ? 'border-accent text-accent'
                                : 'border-transparent text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        Display Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('tags')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tags'
                                ? 'border-accent text-accent'
                                : 'border-transparent text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        Manage Tags
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-6 max-h-96 overflow-y-auto">
                    {/* Display Settings Tab */}
                    {activeTab === 'display' && (
                        <div className="space-y-6">
                            {/* List View Type */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    List View Type
                                </label>
                                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                    Choose how to display resources in list view
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setLocalListViewType('grid')}
                                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${localListViewType === 'grid'
                                                ? 'border-accent bg-accent/10 text-accent'
                                                : 'border-border text-text-secondary hover:text-text-primary'
                                            }`}
                                    >
                                        Grid View
                                    </button>
                                    <button
                                        onClick={() => setLocalListViewType('list')}
                                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${localListViewType === 'list'
                                                ? 'border-accent bg-accent/10 text-accent'
                                                : 'border-border text-text-secondary hover:text-text-primary'
                                            }`}
                                    >
                                        Compact List
                                    </button>
                                </div>
                            </div>

                            {/* Note Editor Width */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    Note Editor Width
                                </label>
                                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                    Adjust the width of the note editor when editing notes
                                </p>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="400"
                                        max="1400"
                                        step="10"
                                        value={localWidth}
                                        onChange={(e) => setLocalWidth(Number(e.target.value))}
                                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                                        style={{
                                            backgroundColor: 'var(--bg-hover)',
                                            accentColor: 'var(--accent)'
                                        }}
                                    />
                                    <span className="text-sm font-mono font-semibold w-16 text-right" style={{ color: 'var(--accent)' }}>
                                        {localWidth}px
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tags Tab */}
                    {activeTab === 'tags' && (
                        <div className="space-y-3">
                            <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                Manage Tags
                            </label>
                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                View and delete tags used in this repository
                            </p>

                            {/* Search Tags */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search tags..."
                                    value={tagSearchQuery}
                                    onChange={(e) => setTagSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 rounded-lg outline-none border text-sm bg-transparent transition-colors"
                                    style={{
                                        borderColor: 'var(--border)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </div>

                            {/* Tags List */}
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {filteredTags.length === 0 ? (
                                    <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                                        {allTags.length === 0 ? 'No tags yet' : 'No matching tags'}
                                    </p>
                                ) : (
                                    filteredTags.filter(t => t && t.trim()).map((tag, idx) => (
                                        <div
                                            key={`${tag}-${idx}`}
                                            className="flex items-center justify-between p-2.5 rounded-lg transition-colors"
                                            style={{ backgroundColor: 'var(--bg-hover)' }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: 'var(--accent)', color: 'black' }}>
                                                    #{tag}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`Delete tag "${tag}"? This will remove it from all resources.`)) {
                                                        onDeleteTag(tag);
                                                    }
                                                }}
                                                className="p-1.5 rounded-lg transition-colors hover:text-red-400"
                                                style={{ color: 'var(--text-secondary)' }}
                                                title="Delete tag"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 mt-8">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            backgroundColor: 'var(--bg-hover)',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        Close
                    </button>
                    {activeTab === 'display' && (
                        <button
                            onClick={handleSave}
                            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: 'var(--accent)' }}
                        >
                            Save
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
