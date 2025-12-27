import { motion } from 'framer-motion';
import { Resource } from '../RepositoryView';
import { containerVariants, itemVariants } from '@/lib/animations';
import { FileText, FileIcon, Image as ImageIcon, Music, Trash2, Tag } from 'lucide-react';
import { useState } from 'react';

interface ResourceListViewProps {
    resources: Resource[];
    onOpenResource: (res: Resource) => void;
    onDeleteResource: (e: React.MouseEvent, id: number) => void;
    onEditTags: (res: Resource) => void;
    onShowAddNote: () => void;
    onImportFile: () => void;
}

function getResourceIcon(type: string) {
    switch (type) {
        case 'note': return <FileText size={18} />;
        case 'pdf': return <FileIcon size={18} />;
        case 'image': return <ImageIcon size={18} />;
        case 'video': return <Music size={18} />;
        case 'document': return <FileIcon size={18} />;
        default: return <FileIcon size={18} />;
    }
}

function getTypeColor(type: string) {
    switch (type) {
        case 'pdf': return '#ef4444';
        case 'note': return '#eab308';
        case 'image': return '#10b981';
        case 'document': return '#8b5cf6';
        case 'video': return '#a855f7';
        default: return '#3b82f6';
    }
}

function getTypeLabel(type: string) {
    return type.charAt(0).toUpperCase() + type.slice(1);
}

export function ResourceListView({
    resources,
    onOpenResource,
    onDeleteResource,
    onEditTags,
    onShowAddNote,
    onImportFile
}: ResourceListViewProps) {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    return (
        <motion.div
            className="absolute inset-0 w-full h-full overflow-y-auto custom-scrollbar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <motion.div
                className="p-6 w-full max-w-7xl mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {resources.length === 0 && (
                    <motion.div
                        className="glass-card p-12 flex flex-col items-center justify-center text-center"
                        variants={itemVariants}
                    >
                        <p style={{ color: 'var(--text-secondary)' }} className="mb-6 text-lg">
                            No resources yet. Add notes or import files to see them here.
                        </p>
                        <motion.div
                            className="flex gap-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <motion.button
                                onClick={onShowAddNote}
                                className="px-4 py-2 rounded-xl border border-border text-text-primary bg-transparent text-sm hover:bg-[var(--bg-hover)] transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Add Note
                            </motion.button>
                            <motion.button
                                onClick={onImportFile}
                                className="px-4 py-2 rounded-xl border border-border text-text-secondary text-sm hover:bg-[var(--bg-hover)] transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Import File
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}

                {resources.length > 0 && (
                    <div className="space-y-2">
                        {/* Header Row */}
                        <div
                            className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide rounded-lg"
                            style={{ 
                                backgroundColor: 'var(--bg-hover)',
                                color: 'var(--text-tertiary)'
                            }}
                        >
                            <div className="col-span-5">Title</div>
                            <div className="col-span-2">Type</div>
                            <div className="col-span-3">Tags</div>
                            <div className="col-span-2 text-right">Actions</div>
                        </div>

                        {/* Resource Rows */}
                        {resources.map((res) => (
                            <motion.div
                                key={res.id}
                                variants={itemVariants}
                                className="group"
                            >
                                <div
                                    className="grid grid-cols-12 gap-4 px-4 py-3 rounded-lg border transition-all duration-200 cursor-pointer hover:border-accent/30"
                                    style={{
                                        borderColor: 'var(--border)',
                                        backgroundColor: expandedId === res.id ? 'var(--bg-hover)' : 'transparent'
                                    }}
                                    onClick={() => setExpandedId(expandedId === res.id ? null : res.id)}
                                >
                                    {/* Title with Icon */}
                                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                                        <div
                                            className="p-2 rounded-lg flex-shrink-0 flex items-center justify-center"
                                            style={{
                                                backgroundColor: `${getTypeColor(res.type)}20`,
                                                color: getTypeColor(res.type)
                                            }}
                                        >
                                            {getResourceIcon(res.type)}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenResource(res);
                                            }}
                                            className="text-left min-w-0 flex-1 font-medium hover:text-accent transition-colors truncate"
                                            style={{ color: 'var(--text-primary)' }}
                                            title={res.title}
                                        >
                                            {res.title}
                                        </button>
                                    </div>

                                    {/* Type */}
                                    <div className="col-span-2 flex items-center">
                                        <span
                                            className="inline-block px-2.5 py-1 rounded-md text-xs font-medium"
                                            style={{
                                                backgroundColor: `${getTypeColor(res.type)}20`,
                                                color: getTypeColor(res.type)
                                            }}
                                        >
                                            {getTypeLabel(res.type)}
                                        </span>
                                    </div>

                                    {/* Tags */}
                                    <div className="col-span-3 flex items-center flex-wrap gap-1 min-w-0">
                                        {res.tags ? (
                                            res.tags.split(',').map((tag) => (
                                                <span
                                                    key={tag.trim()}
                                                    className="inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                                                    style={{
                                                        backgroundColor: 'var(--accent)',
                                                        color: 'black'
                                                    }}
                                                >
                                                    #{tag.trim()}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ color: 'var(--text-tertiary)' }} className="text-xs italic">
                                                No tags
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <motion.button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditTags(res);
                                            }}
                                            className="p-2 rounded-lg hover:bg-accent/10 transition-colors flex items-center justify-center"
                                            style={{ color: 'var(--text-secondary)' }}
                                            title="Edit tags"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Tag size={16} />
                                        </motion.button>
                                        <motion.button
                                            onClick={(e) => onDeleteResource(e, res.id)}
                                            className="p-2 rounded-lg hover:bg-red-500/10 transition-colors flex items-center justify-center"
                                            style={{ color: 'var(--text-secondary)' }}
                                            title="Delete resource"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Trash2 size={16} />
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
