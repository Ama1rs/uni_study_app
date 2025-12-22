import { motion, AnimatePresence } from 'framer-motion';
import { StressTestPanel } from '../StressTestPanel';

interface StressTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    repositoryId: number;
    onComplete: () => void;
}

export function StressTestModal({ isOpen, onClose, repositoryId, onComplete }: StressTestModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                >
                    <div onClick={e => e.stopPropagation()}>
                        <StressTestPanel
                            repositoryId={repositoryId}
                            onComplete={onComplete}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
