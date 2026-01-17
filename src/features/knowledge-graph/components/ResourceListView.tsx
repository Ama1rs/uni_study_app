import { motion } from 'framer-motion';
import { Resource } from '../RepositoryView';
import { containerVariants, itemVariants } from '@/lib/animations';
import { FileText, FileIcon, Image as ImageIcon, Music, Trash2, Tag, Book, MoreHorizontal } from 'lucide-react';


interface ResourceListViewProps {
    resources: Resource[];
    onOpenResource: (res: Resource) => void;
    onDeleteResource: (e: React.MouseEvent, id: number) => void;
    onEditTags: (res: Resource) => void;
    onShowAddNote: () => void;
    onImportFile: () => void;
}

function getResourceIcon(type: string) {
    switch (type.toLowerCase()) {
        case 'note': return <FileText size={18} />;
        case 'pdf': return <FileIcon size={18} />;
        case 'image': return <ImageIcon size={18} />;
        case 'video': return <Music size={18} />;
        case 'epub': case 'azw3': case 'fb2': case 'ibooks': return <Book size={18} />;
        default: return <FileIcon size={18} />;
    }
}

function getTypeColor(type: string) {
    switch (type.toLowerCase()) {
        case 'pdf': return 'text-red-400 bg-red-400/10 border-red-400/20';
        case 'note': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
        case 'image': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        case 'document': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        case 'video': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
        case 'epub': case 'book': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
        default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
    }
}

export function ResourceListView({
    resources,
    onOpenResource,
    onDeleteResource,
    onEditTags,
    onShowAddNote,
    onImportFile
}: ResourceListViewProps) {
    return (
        <motion.div
            className="absolute inset-0 w-full h-full overflow-y-auto custom-scrollbar bg-bg-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <motion.div
                className="px-6 py-6 w-full"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {resources.length === 0 && (
                    <motion.div
                        className="flex flex-col items-center justify-center text-center mt-20"
                        variants={itemVariants}
                    >
                        <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-border flex items-center justify-center mb-6">
                            <FileText className="text-text-tertiary" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">No resources yet</h3>
                        <p className="text-text-secondary mb-8 max-w-sm">
                            Your repository is empty. Add notes or import files to get started.
                        </p>
                        <div className="flex gap-4">
                            <motion.button
                                onClick={onShowAddNote}
                                className="px-6 py-2.5 rounded-xl bg-text-primary text-bg-primary font-semibold hover:opacity-90 transition-opacity"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Create Note
                            </motion.button>
                            <motion.button
                                onClick={onImportFile}
                                className="px-6 py-2.5 rounded-xl border border-border text-text-primary hover:bg-bg-hover transition-colors font-medium"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Import File
                            </motion.button>
                        </div>
                    </motion.div>
                )}

                {resources.length > 0 && (
                    <div className="w-full space-y-4">
                        {/* Header Row */}
                        <div className="grid grid-cols-12 gap-4 px-6 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                            <div className="col-span-5 pl-2">Name</div>
                            <div className="col-span-1">Type</div>
                            <div className="col-span-2">Date Modified</div>
                            <div className="col-span-3">Tags</div>
                            <div className="col-span-1 text-right pr-2">Actions</div>
                        </div>

                        {/* Resource Rows */}
                        <div className="space-y-3">
                            {resources.map((res, idx) => (
                                <motion.div
                                    key={res.id || `res-${idx}`}
                                    variants={itemVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="group"
                                >
                                    <div
                                        className="grid grid-cols-12 gap-4 px-4 py-3 items-center bg-transparent border border-border/30 rounded-xl hover:border-accent/40 hover:bg-bg-surface/30 transition-all cursor-pointer"
                                        onClick={() => onOpenResource(res)}
                                    >
                                        {/* Name */}
                                        <div className="col-span-5 flex items-center gap-4 min-w-0">
                                            <div
                                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${getTypeColor(res.type)}`}
                                            >
                                                {getResourceIcon(res.type)}
                                            </div>
                                            <span className="text-sm font-medium text-text-primary truncate" title={res.title}>
                                                {res.title}
                                            </span>
                                        </div>

                                        {/* Type */}
                                        <div className="col-span-1">
                                            <span className="text-xs font-bold text-text-secondary uppercase">
                                                {res.type}
                                            </span>
                                        </div>

                                        {/* Date (Mock) */}
                                        <div className="col-span-2">
                                            <span className="text-sm text-text-secondary">
                                                24-Dec-25
                                            </span>
                                        </div>

                                        {/* Tags */}
                                        <div className="col-span-3 flex items-center flex-wrap gap-2 min-w-0 h-7 overflow-hidden">
                                            {res.tags ? (
                                                res.tags.split(',').map(tag => tag.trim()).filter(tag => tag).map((tag, idx) => (
                                                    <span
                                                        key={`${tag}-${idx}`}
                                                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-bg-surface border border-border/50 text-text-secondary"
                                                    >
                                                        #{tag}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-text-tertiary/50 italic">
                                                    No tags
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-1 flex items-center justify-end">
                                            <button
                                                className="p-2 text-text-tertiary hover:text-text-primary transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Dropdown trigger would go here
                                                }}
                                            >
                                                <MoreHorizontal size={18} />
                                            </button>

                                            {/* Hover Actions - kept just in case, but visual design shows dots mostly */}
                                            <div className="hidden group-hover:flex absolute right-14 bg-bg-base border border-border shadow-lg rounded-lg p-1 gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEditTags(res);
                                                    }}
                                                    className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary"
                                                >
                                                    <Tag size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => onDeleteResource(e, res.id)}
                                                    className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-red-400"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div >
    );
}
