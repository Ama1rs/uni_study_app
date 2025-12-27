import { motion } from 'framer-motion';
import { FileText, StickyNote, Link as LinkIcon, Edit, Trash2, Video, Image as ImageIcon, File as FileIcon, Tag } from 'lucide-react';
import { Resource } from '../RepositoryView';
import { itemVariants } from '@/lib/animations';

interface ResourceCardProps {
    res: Resource;
    onOpen: (res: Resource) => void;
    onDelete: (e: React.MouseEvent, id: number) => void;
    onEditTags: (res: Resource) => void;
}

export function ResourceCard({ res, onOpen, onDelete, onEditTags }: ResourceCardProps) {
    return (
        <motion.div
            className="rounded-2xl overflow-hidden cursor-pointer flex flex-col relative border border-border/50 bg-bg-surface/30 hover:bg-bg-surface hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300 transform group"
            variants={itemVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <motion.div
                className="aspect-video bg-black/40 relative flex items-center justify-center overflow-hidden"
                onClick={() => onOpen(res)}
                whileHover={{ scale: 1.05 }}
            >
                <motion.div
                    className={`flex flex-col items-center gap-2 ${res.type === 'pdf' ? 'text-red-400' :
                        res.type === 'note' ? 'text-yellow-400' :
                            res.type === 'image' ? 'text-emerald-400' :
                                res.type === 'document' ? 'text-purple-300' :
                                    res.type === 'video' ? 'text-purple-400' :
                                        'text-blue-400'
                        }`}
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                >
                    {res.type === 'pdf' && <FileText size={32} strokeWidth={1.5} />}
                    {res.type === 'note' && <StickyNote size={32} strokeWidth={1.5} />}
                    {res.type === 'file' && <LinkIcon size={32} strokeWidth={1.5} />}
                    {res.type === 'image' && <ImageIcon size={32} strokeWidth={1.5} />}
                    {res.type === 'document' && <FileIcon size={32} strokeWidth={1.5} />}
                    {res.type === 'video' && <Video size={32} strokeWidth={1.5} />}
                </motion.div>
                <motion.div
                    className="absolute top-3 right-3 flex gap-2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    {res.type === 'note' && (
                        <motion.button
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpen(res);
                            }}
                            className="p-2 rounded-xl bg-black/60 text-white/70 hover:text-accent hover:bg-black/80 transition-all backdrop-blur-sm z-10"
                            title="Edit Note"
                            whileHover={{ scale: 1.1, backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Edit size={16} />
                        </motion.button>
                    )}
                    <motion.button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEditTags(res);
                        }}
                        className="p-2 rounded-xl bg-black/60 text-white/70 hover:text-blue-400 hover:bg-black/80 transition-all backdrop-blur-sm z-10"
                        title="Edit Tags"
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Tag size={16} />
                    </motion.button>
                    <motion.button
                        onClick={(e) => onDelete(e, res.id)}
                        className="p-2 rounded-xl bg-black/60 text-white/70 hover:text-red-400 hover:bg-black/80 transition-all backdrop-blur-sm z-10"
                        title="Delete"
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Trash2 size={16} />
                    </motion.button>
                </motion.div>
            </motion.div>
            <motion.div
                className="p-4 relative"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <h3 className="font-semibold text-text-primary line-clamp-2 leading-relaxed mb-2 group-hover:text-accent transition-colors">{res.title}</h3>
                <div className="flex items-center justify-between">
                    <motion.span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${res.type === 'pdf' ? 'bg-red-500/10 text-red-400' :
                            res.type === 'note' ? 'bg-yellow-500/10 text-yellow-400' :
                                res.type === 'image' ? 'bg-emerald-500/10 text-emerald-400' :
                                    res.type === 'document' ? 'bg-purple-500/10 text-purple-400' :
                                        res.type === 'video' ? 'bg-purple-500/10 text-purple-400' :
                                            'bg-blue-500/10 text-blue-400'
                            }`}
                        whileHover={{ scale: 1.1 }}
                    >
                        {res.type}
                    </motion.span>
                    {res.tags && res.tags.split(',').map(tag => tag.trim()).filter(tag => tag).map((tag, index) => (
                        <motion.span
                            key={index}
                            className="text-xs px-2 py-1 rounded bg-accent/10 text-accent ml-1"
                            whileHover={{ scale: 1.05 }}
                        >
                            #{tag}
                        </motion.span>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}
