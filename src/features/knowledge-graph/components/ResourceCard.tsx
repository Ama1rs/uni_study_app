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

    const getTypeColor = () => {
        switch (res.type.toLowerCase()) {
            case 'pdf': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'note': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'image': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'document': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'video': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
            case 'epub': case 'book': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
        }
    };

    return (
        <motion.div
            className="group relative flex items-center p-3 h-[90px] border border-border/50 bg-transparent hover:bg-bg-surface/30 rounded-xl transition-all cursor-pointer hover:border-accent/40"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            onClick={() => onOpen(res)}
            whileHover={{ y: -2 }}
        >
            {/* Icon */}
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center border shrink-0 ${getTypeColor()}`}>
                {res.type === 'pdf' && <FileText size={20} />}
                {res.type === 'note' && <StickyNote size={20} />}
                {res.type === 'file' && <LinkIcon size={20} />}
                {res.type === 'image' && <ImageIcon size={20} />}
                {res.type === 'document' && <FileIcon size={20} />}
                {res.type === 'video' && <Video size={20} />}
                {isBookType && <Book size={20} />}
            </div>

            {/* Content */}
            <div className="flex-1 ml-4 min-w-0 flex flex-col justify-center h-full">
                <h3 className="text-sm font-semibold text-text-primary line-clamp-2 leading-snug group-hover:text-accent transition-colors" title={res.title}>
                    {res.title}
                </h3>
            </div>

            {/* Right Side: Type & Actions */}
            <div className="flex flex-col items-end justify-between h-full py-1 ml-2">
                <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                    {res.type}
                </span>

                {/* Actions (Absolute in design, or flex) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEditTags(res); }}
                        className="p-1.5 rounded hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors"
                        title="Edit Tags"
                    >
                        <Tag size={12} />
                    </button>
                    {res.type === 'note' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpen(res); }}
                            className="p-1.5 rounded hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors"
                            title="Edit"
                        >
                            <Edit size={12} />
                        </button>
                    )}
                    <button
                        onClick={(e) => onDelete(e, res.id)}
                        className="p-1.5 rounded hover:bg-bg-hover text-text-tertiary hover:text-red-400 transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
