import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Resource } from '../RepositoryView';
import { BookReader } from '@/features/books/BookReader';
import { ImageViewer } from '@/features/resources/ImageViewer';

interface ResourcePreviewModalProps {
    resource: Resource | null;
    previewUrl: string | null;
    onClose: () => void;
    onOpenExternally: (path?: string) => void;
}

export function ResourcePreviewModal({
    resource,
    previewUrl,
    onClose,
    onOpenExternally
}: ResourcePreviewModalProps) {
    // Check if resource is a book format
    const isBookFormat = resource && ['epub', 'azw3', 'fb2', 'ibooks'].includes(resource.type.toLowerCase());

    // If it's a book, render BookReader directly without the modal wrapper
    if (isBookFormat && resource) {
        return <BookReader resource={resource} onClose={onClose} />;
    }

    return (
        <AnimatePresence>
            {resource && (
                <motion.div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="p-6 rounded-2xl w-[900px] max-w-[95vw] shadow-2xl bg-bg-surface border border-border"
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        transition={{ duration: 0.3 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.div
                            className="flex justify-between items-start gap-4 mb-4"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div>
                                <h3 className="text-lg font-bold text-text-primary">{resource.title}</h3>
                                <p className="text-xs uppercase tracking-wider text-text-secondary">{resource.type}</p>
                            </div>
                            <motion.button
                                onClick={onClose}
                                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
                                title="Close preview"
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                            >
                                <X size={20} />
                            </motion.button>
                        </motion.div>

                        <motion.div
                            className="bg-black/20 rounded-xl border border-border/70 overflow-hidden h-[70vh] flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {resource.type === 'pdf' && previewUrl && (
                                <embed
                                    src={`${previewUrl}#toolbar=1`}
                                    className="w-full h-full"
                                    type="application/pdf"
                                    title={resource.title}
                                />
                            )}

                            {resource.type === 'image' && previewUrl && (
                                <ImageViewer
                                    src={previewUrl}
                                    alt={resource.title}
                                    title={resource.title}
                                />
                            )}

                            {resource.type === 'document' && (
                                <div className="flex flex-col items-center justify-center gap-3 text-text-secondary p-6 text-center">
                                    <p>Document preview is not supported in-app. Open with your system viewer.</p>
                                    <motion.button
                                        onClick={() => onOpenExternally(resource.path)}
                                        className="px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Open in default app
                                    </motion.button>
                                </div>
                            )}

                            {resource.type === 'file' && (
                                <div className="flex flex-col items-center justify-center gap-3 text-text-secondary p-6 text-center">
                                    <p>Preview not available for this file type.</p>
                                    <motion.button
                                        onClick={() => onOpenExternally(resource.path)}
                                        className="px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Open in default app
                                    </motion.button>
                                </div>
                            )}

                            {resource.type === 'video' && previewUrl && (
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full"
                                    title={resource.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    referrerPolicy="no-referrer"
                                />
                            )}

                            {!previewUrl && ['pdf', 'image', 'video'].includes(resource.type) && (
                                <div className="text-text-secondary">Unable to preview this file.</div>
                            )}
                        </motion.div>

                        <motion.div
                            className="flex justify-between items-center mt-4"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                        >
                            <div className="text-xs text-text-secondary truncate">
                                {resource.path}
                            </div>
                            <motion.div
                                className="flex gap-2"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                <motion.button
                                    onClick={() => onOpenExternally(resource.path)}
                                    className="px-4 py-2 rounded-lg text-sm border border-border text-text-primary hover:bg-white/5 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Open externally
                                </motion.button>
                                <motion.button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg text-sm bg-accent text-white hover:opacity-90 transition-opacity"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Close
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
