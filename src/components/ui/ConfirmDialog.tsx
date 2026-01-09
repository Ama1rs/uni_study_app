import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean; // If true, confirm button is red
}

export function ConfirmDialog({
    isOpen,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    danger = false
}: ConfirmDialogProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onCancel}
                >
                    <motion.div
                        className="w-[400px] p-6 rounded-2xl bg-bg-surface border border-border relative overflow-hidden"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Content */}
                        <div className="flex gap-4">
                            <div className={`p-3 rounded-full h-fit flex-shrink-0 ${danger ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'}`}>
                                <AlertTriangle size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
                                <p className="text-sm text-text-secondary leading-relaxed mb-6">{description}</p>

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={onCancel}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                                    >
                                        {cancelText}
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-transform active:scale-95 ${danger
                                            ? 'bg-red-500 hover:bg-red-600 text-white'
                                            : 'bg-accent hover:bg-accent-hover text-bg-primary'
                                            }`}
                                    >
                                        {confirmText}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
