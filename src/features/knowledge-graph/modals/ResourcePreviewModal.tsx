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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                >
                    {/* Top Bar - Title and Controls */}
                    <div
                        className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"
                    >
                        <div className="flex flex-col text-white pointer-events-auto">
                            <h3 className="text-lg font-bold drop-shadow-md">{resource.title}</h3>
                            <p className="text-xs uppercase tracking-wider opacity-70 drop-shadow-md">{resource.type}</p>
                        </div>

                        <div className="flex items-center gap-3 pointer-events-auto">
                            <motion.button
                                onClick={() => onOpenExternally(resource.path)}
                                className="px-4 py-2 text-sm font-medium text-white/90 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-md transition-colors border border-white/10"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Open externally
                            </motion.button>
                            <motion.button
                                onClick={onClose}
                                className="p-2 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-md transition-colors border border-white/10"
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <X size={24} />
                            </motion.button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <motion.div
                        className="w-full h-full p-4 flex items-center justify-center overflow-hidden"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {resource.type === 'pdf' && previewUrl && (
                            <embed
                                src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                className="w-full h-full max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
                                type="application/pdf"
                                title={resource.title}
                            />
                        )}

                        {resource.type === 'image' && previewUrl && (
                            <div className="w-full h-full max-w-[95vw] max-h-[95vh] flex items-center justify-center">
                                <ImageViewer
                                    src={previewUrl}
                                    alt={resource.title}
                                    title={resource.title}
                                />
                            </div>
                        )}

                        {resource.type === 'document' && (
                            <div className="flex flex-col items-center justify-center gap-6 text-white/80 p-6 text-center">
                                <p className="text-xl">Document preview is not supported in-app.</p>
                                <motion.button
                                    onClick={() => onOpenExternally(resource.path)}
                                    className="px-6 py-3 rounded-xl bg-accent text-white font-medium hover:brightness-110 transition-all shadow-lg shadow-accent/20"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Open in Default App
                                </motion.button>
                            </div>
                        )}

                        {resource.type === 'file' && (
                            <div className="flex flex-col items-center justify-center gap-6 text-white/80 p-6 text-center">
                                <p className="text-xl">Preview not available for this file type.</p>
                                <motion.button
                                    onClick={() => onOpenExternally(resource.path)}
                                    className="px-6 py-3 rounded-xl bg-accent text-white font-medium hover:brightness-110 transition-all shadow-lg shadow-accent/20"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Open in Default App
                                </motion.button>
                            </div>
                        )}

                        {resource.type === 'video' && previewUrl && (
                            <div className="w-full h-full max-w-[90vw] max-h-[90vh] flex items-center justify-center bg-black rounded-lg overflow-hidden shadow-2xl">
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full"
                                    title={resource.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                        )}

                        {!previewUrl && ['pdf', 'image', 'video'].includes(resource.type) && (
                            <div className="text-white/60 text-lg">Unable to preview this file.</div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
