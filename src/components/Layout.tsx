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
            {/* Background Gradient/Glow */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <motion.div
                    className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-[120px]"
                    animate={{
                        opacity: [0.5, 0.8, 0.5],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        repeatType: "loop"
                    }}
                />
                <motion.div
                    className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-[120px]"
                    animate={{
                        opacity: [0.5, 0.8, 0.5],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        repeatType: "loop",
                        delay: 1
                    }}
                />
            </div>

            {/* Content Container */}
            <motion.div
                className="flex-1 flex z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                {children}
            </motion.div>
        </motion.div>
    );
}
