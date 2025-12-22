import { Home, Calendar, BookOpen, Timer, MessageSquare, GraduationCap, Brain, PenTool, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { containerVariants, itemVariants } from '../../lib/animations';

interface SidebarProps {
    activeView: string;
    onViewChange: (view: string) => void;
    hidden?: boolean;
}

export function Sidebar({
    activeView,
    onViewChange,
    hidden = false
}: SidebarProps) {
    const navItems = [
        { id: 'main', label: 'Home', icon: Home },
        { id: 'repository', label: 'Repository', icon: BookOpen },
        { id: 'flashcards', label: 'Flashcards', icon: Brain },
        { id: 'planner', label: 'Planner', icon: Calendar },
        { id: 'focus', label: 'Focus', icon: Timer },
        { id: 'grades', label: 'Grades', icon: GraduationCap },
        { id: 'finance', label: 'Finance', icon: Wallet },
        { id: 'chat', label: 'Chat', icon: MessageSquare },
        { id: 'studio', label: 'Studio', icon: PenTool },
    ];

    return (
        <motion.div
            className={cn(
                "h-full flex flex-col items-center py-4 transition-all duration-300 ease-in-out z-20",
                hidden ? "w-0 opacity-0 overflow-hidden" : "w-14 opacity-100",
                "bg-bg-surface/50 border-r border-border"
            )}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: hidden ? 0 : 1, x: hidden ? -50 : 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Logo Icon */}
            <motion.div
                className="mb-6 p-1.5 rounded-lg bg-accent/10"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
                    <span className="text-[9px] font-bold text-black">A</span>
                </div>
            </motion.div>

            {/* Navigation */}
            <motion.nav
                className="flex-1 flex flex-col gap-2 w-full px-2"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => onViewChange(item.id)}
                            title={item.label}
                            className={cn(
                                "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 group relative",
                                isActive
                                    ? "bg-accent text-black"
                                    : "text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
                            )}
                            variants={itemVariants}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />

                            {/* Tooltip */}
                            <motion.span
                                className="absolute left-12 px-2 py-1 rounded-md bg-bg-surface border border-border text-xs text-text-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 font-mono"
                                initial={{ opacity: 0, x: -10 }}
                                whileHover={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {item.label}
                            </motion.span>
                        </motion.button>
                    );
                })}
            </motion.nav>
        </motion.div>
    );
}
