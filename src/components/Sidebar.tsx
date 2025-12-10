import { Home, Calendar, BookOpen, Timer, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

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
        { id: 'planner', label: 'Planner', icon: Calendar },
        { id: 'focus', label: 'Focus', icon: Timer },
        { id: 'chat', label: 'Chat', icon: MessageSquare },
    ];

    return (
        <div
            className={cn(
                "h-full flex flex-col items-center py-4 transition-all duration-300 ease-in-out z-20",
                hidden ? "w-0 opacity-0 overflow-hidden" : "w-14 opacity-100",
                "bg-bg-surface/50 border-r border-border"
            )}
        >
            {/* Logo Icon */}
            <div className="mb-6 p-1.5 rounded-lg bg-accent/10">
                <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
                    <span className="text-[9px] font-bold text-black">A</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-2 w-full px-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onViewChange(item.id)}
                            title={item.label}
                            className={cn(
                                "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 group relative",
                                isActive
                                    ? "bg-accent text-black"
                                    : "text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
                            )}
                        >
                            <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />

                            {/* Tooltip */}
                            <span className="absolute left-12 px-2 py-1 rounded-md bg-bg-surface border border-border text-xs text-text-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 font-mono">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
