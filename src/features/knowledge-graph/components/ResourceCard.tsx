import { motion } from 'framer-motion';
import { FileText, StickyNote, Link as LinkIcon, Edit, Trash2, Video, Image as ImageIcon, File as FileIcon, Tag, Book } from 'lucide-react';
import { Resource } from '../RepositoryView';
import { itemVariants } from '@/lib/animations';

interface ResourceCardProps {
    res: Resource;
    onOpen: (res: Resource) => void;
    onDelete: (e: React.MouseEvent, id: number) => void;
    onEditTags: (res: Resource) => void;
}

export function ResourceCard({ res, onOpen, onDelete, onEditTags }: ResourceCardProps) {
    const isBookType = ['epub', 'azw3', 'fb2', 'ibooks'].includes(res.type.toLowerCase());

    return (
        <motion.div
            className="flex items-center gap-4 p-4 border border-border/40 bg-bg-surface/30 hover:bg-bg-surface/80 hover:border-accent/30 rounded-xl transition-all cursor-pointer group shadow-sm hover:shadow-md"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            onClick={() => onOpen(res)}
            whileHover={{ y: -2 }}
        >
            {/* Icon Column */}
            <div className={`shrink-0 ${res.type === 'pdf' ? 'text-red-400' :
                res.type === 'note' ? 'text-yellow-400' :
                    res.type === 'image' ? 'text-emerald-400' :
                        res.type === 'document' ? 'text-purple-300' :
                            res.type === 'video' ? 'text-purple-400' :
                                isBookType ? 'text-amber-400' :
                                    'text-blue-400'
                }`}>
                {res.type === 'pdf' && <FileText size={18} />}
                {res.type === 'note' && <StickyNote size={18} />}
                {res.type === 'file' && <LinkIcon size={18} />}
                {res.type === 'image' && <ImageIcon size={18} />}
                {res.type === 'document' && <FileIcon size={18} />}
                {res.type === 'video' && <Video size={18} />}
                {isBookType && <Book size={18} />}
            </div>

            {/* Title Column */}
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-text-primary line-clamp-2 break-words group-hover:text-accent transition-colors">
                    {res.title}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                    {res.tags && res.tags.split(',').map(tag => tag.trim()).filter(tag => tag).map((tag, index) => (
                        <span key={`${tag}-${index}`} className="text-[10px] text-text-tertiary">#{tag}</span>
                    ))}
                </div>
            </div>

            {/* Type Column */}
            <div className="w-20 shrink-0 text-right">
                <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider">{res.type}</span>
            </div>

            {/* Actions Column (Hover only) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {res.type === 'note' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onOpen(res); }}
                        className="p-1.5 rounded-sm hover:bg-bg-active text-text-tertiary hover:text-text-primary"
                        title="Edit Note"
                    >
                        <Edit size={14} />
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onEditTags(res); }}
                    className="p-1.5 rounded-sm hover:bg-bg-active text-text-tertiary hover:text-blue-400"
                    title="Edit Tags"
                >
                    <Tag size={14} />
                </button>
                <button
                    onClick={(e) => onDelete(e, res.id)}
                    className="p-1.5 rounded-sm hover:bg-bg-active text-text-tertiary hover:text-red-400"
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </motion.div>
    );
}
