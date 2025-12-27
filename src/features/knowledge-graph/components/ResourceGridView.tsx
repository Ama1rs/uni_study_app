import { motion } from 'framer-motion';
import { Resource } from '../RepositoryView';
import { containerVariants, itemVariants } from '@/lib/animations';
import { ResourceCard } from './ResourceCard';

interface ResourceGridViewProps {
    resources: Resource[];
    onOpenResource: (res: Resource) => void;
    onDeleteResource: (e: React.MouseEvent, id: number) => void;
    onEditTags: (res: Resource) => void;
    onShowAddNote: () => void;
    onImportFile: () => void;
}

export function ResourceGridView({
    resources,
    onOpenResource,
    onDeleteResource,
    onEditTags,
    onShowAddNote,
    onImportFile
}: ResourceGridViewProps) {
    return (
        <motion.div
            className="absolute inset-0 w-full h-full overflow-y-auto custom-scrollbar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <motion.div
                className="inline-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 w-full"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {resources.length === 0 && (
                    <motion.div
                        className="glass-card p-8 flex flex-col items-center justify-center text-center w-full h-full min-h-[300px] col-span-full"
                        variants={itemVariants}
                    >
                        <p style={{ color: 'var(--text-secondary)' }} className="mb-4">No resources yet. Add notes or import files to see the graph.</p>
                        <motion.div
                            className="flex gap-2"
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
                {resources.map((res) => (
                    <ResourceCard
                        key={res.id}
                        res={res}
                        onOpen={onOpenResource}
                        onDelete={onDeleteResource}
                        onEditTags={onEditTags}
                    />
                ))}
            </motion.div>
        </motion.div>
    );
}
