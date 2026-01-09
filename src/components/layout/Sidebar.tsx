import { Home, Calendar, BookOpen, Timer, MessageSquare, GraduationCap, Brain, PenTool, Wallet, Library } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { itemVariants } from '../../lib/animations';

import { useTheme } from '../../contexts/ThemeContext';

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
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const navGroups = [
        {
            items: [
                { id: 'main', label: 'Home', icon: Home },
            ]
        },
        {
            items: [
                { id: 'repository', label: 'Subjects', icon: BookOpen },
                { id: 'library', label: 'Library', icon: Library },
                { id: 'flashcards', label: 'Flashcards', icon: Brain },
                { id: 'planner', label: 'Planner', icon: Calendar },
                { id: 'focus', label: 'Focus', icon: Timer },
                { id: 'grades', label: 'Grades', icon: GraduationCap },
            ]
        },
        {
            items: [
                { id: 'finance', label: 'Finance', icon: Wallet },
                { id: 'chat', label: 'Chat', icon: MessageSquare },
                { id: 'studio', label: 'Studio', icon: PenTool },
            ]
        }
    ];

    return (
        <div className={cn(
            "h-full flex flex-col items-center justify-center relative transition-all duration-500 z-20",
            hidden ? "w-0 opacity-0 -translate-x-full pointer-events-none" : "w-20 ml-2"
        )}>
            {/* The vertical extensions - The "bar" that extends to top and bottom */}
            {!hidden && (
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border/50 to-transparent z-0" />
            )}

            <motion.div
                className={cn(
                    "flex flex-col items-center py-6 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] relative z-10",
                    "w-14 bg-bg-surface/60 backdrop-blur-2xl border border-border/80 rounded-[2.5rem] h-fit shadow-2xl"
                )}
                initial={{ opacity: 0, x: -50, scale: 0.95 }}
                animate={{
                    opacity: hidden ? 0 : 1,
                    x: hidden ? -50 : 0,
                    scale: hidden ? 0.95 : 1
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                role="navigation"
                aria-label="Main navigation"
            >
                <div className="w-full flex flex-col items-center gap-2 overflow-y-auto no-scrollbar px-2 px-1">
                    {navGroups.map((group, groupIndex) => (
                        <div key={groupIndex} className={cn("w-full flex flex-col items-center gap-2 relative", groupIndex > 0 && "mt-4")}>
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeView === item.id;
                                return (
                                    <motion.button
                                        key={item.id}
                                        onClick={() => onViewChange(item.id)}
                                        className={cn(
                                            "w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-500 group relative shrink-0",
                                            isActive
                                                ? (isDark ? "text-white" : "text-black")
                                                : "text-text-secondary hover:text-text-primary"
                                        )}
                                        variants={itemVariants}
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.9 }}
                                        aria-label={item.label}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        {/* Active Pill - Sliding highlight */}
                                        {isActive && (
                                            <motion.div
                                                layoutId="navPill"
                                                className={cn(
                                                    "absolute inset-0 rounded-2xl z-0",
                                                    isDark ? "bg-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" : "bg-black/[0.05] shadow-[inset_0_1px_1px_rgba(0,0,0,0.05)]"
                                                )}
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}

                                        <div className="relative z-10 flex items-center justify-center">
                                            <Icon
                                                size={19}
                                                className={cn(
                                                    "transition-all duration-500",
                                                    isActive
                                                        ? (isDark ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] scale-110" : "drop-shadow-[0_0_8px_rgba(0,0,0,0.2)] scale-110")
                                                        : "group-hover:scale-110"
                                                )}
                                                strokeWidth={isActive ? 2.5 : 1.8}
                                            />

                                            {/* Subtle Dot */}
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeDot"
                                                    className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]"
                                                />
                                            )}
                                        </div>

                                        {/* Tooltip */}
                                        <motion.span
                                            className={cn(
                                                "absolute left-[calc(100%+12px)] px-3 py-1.5 rounded-full backdrop-blur-xl border text-[11px] font-semibold shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 translate-x-1",
                                                isDark ? "bg-black/40 border-white/10 text-white/90" : "bg-white/80 border-black/5 text-black/80"
                                            )}
                                            initial={{ opacity: 0, x: -5 }}
                                            whileHover={{ opacity: 1, x: 0 }}
                                        >
                                            {item.label}
                                        </motion.span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
