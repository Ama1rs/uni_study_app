import { motion } from 'framer-motion';

interface FinanceHeaderProps { }

export function FinanceHeader({ }: FinanceHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-10 bg-bg-surface/60 backdrop-blur-xl flex items-center justify-between px-4 sticky top-0 z-20"
        >
            <div className="flex items-center gap-2">
                <h1 className="text-xs font-mono font-bold text-text-primary uppercase tracking-widest">
                    PERSONAL FINANCE
                </h1>
                <span className="px-1.5 py-0.5 rounded-[2px] bg-bg-card/50 text-[9px] font-mono text-text-tertiary">
                    ACTIVE
                </span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono text-text-tertiary">
            </div>
        </motion.div>
    );
}
