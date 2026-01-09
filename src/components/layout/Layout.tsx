import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface LayoutProps {
    children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <motion.div
            className="flex-1 flex h-full overflow-hidden relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >


            {/* Content Container */}
            <motion.div
                className="flex-1 flex flex-col z-10 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                    duration: 0.3,
                    ease: "easeOut"
                }}
            >
                {children}
            </motion.div>
        </motion.div>
    );
}
