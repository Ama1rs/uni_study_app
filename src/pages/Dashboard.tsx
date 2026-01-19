import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Calendar, BookOpen, Upload, Search as SearchIcon, PanelRightOpen, Play } from 'lucide-react';
import { cn } from '../lib/utils';
import { useUserProfile } from '../contexts/UserProfileContext';
import { itemVariants } from '../lib/animations';
import { Button } from '../components/ui/Button';
import { SkeletonCard, Skeleton } from '../components/ui/Skeleton';

export function Dashboard() {
    const [isLoading, setIsLoading] = useState(true);
    const { profile } = useUserProfile();

    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

    // Simulate loading
    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-screen overflow-hidden bg-bg-primary">
                <div className="w-[300px] border-r border-border bg-bg-surface/50 flex flex-col h-full p-6">
                    <Skeleton width={200} height={32} className="mb-2" />
                    <Skeleton width={150} height={16} className="mb-6" />
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                </div>
                <div className="flex-1 p-6">
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-bg-primary">
            {/* Left Sidebar: Daily Overview */}
            <div className="w-[300px] border-r border-border bg-bg-surface/50 flex flex-col h-full">
                <div className="p-6 border-b border-border">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-2xl font-bold text-text-primary mb-1">
                            {greeting},<br />{profile?.name?.split(' ')[0] || 'Student'}
                        </h1>
                        <p className="text-xs text-text-secondary font-mono">
                            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </motion.div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    {/* Today's Focus */}
                    <div className="p-6 border-b border-border/50">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-mono text-text-tertiary uppercase tracking-widest">Focus</h2>
                            <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-sm">3 LEFT</span>
                        </div>

                        <div className="space-y-4">
                            {/* Active Task (Simulated) */}
                            <div className="p-3 bg-bg-surface border border-border rounded-sm">
                                <h3 className="text-sm font-bold text-text-primary mb-1">Biology Midterm Prep</h3>
                                <p className="text-xs text-text-tertiary font-mono mb-3">09:00 - 11:00</p>
                                <button className="w-full py-1.5 bg-accent text-black text-xs font-bold rounded-sm hover:bg-accent-hover transition-colors">
                                    Start Session
                                </button>
                            </div>

                            <div className="space-y-1">
                                <TaskItem completed text="Review Chapters 4-6" />
                                <TaskItem text="Complete practice questions" />
                                <TaskItem text="Summarize key concepts" />
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Deadlines */}
                    <div className="p-6">
                        <h2 className="text-xs font-mono text-text-tertiary uppercase tracking-widest mb-4">Deadlines</h2>
                        <div className="space-y-1">
                            <DeadlineCard title="History Essay" course="History 101" daysLeft={3} />
                            <DeadlineCard title="Quantum Physics" course="Physics 305" daysLeft={5} />
                            <DeadlineCard title="Project Proposal" course="CS 450" daysLeft={6} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content: Workspace */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-primary relative">

                {/* Top Action Bar (Replacing Dock) */}
                <div className="h-12 border-b border-border flex items-center justify-between px-6 bg-bg-primary">
                    <div className="flex items-center gap-1 text-text-tertiary">
                        <PanelRightOpen size={14} />
                        <span className="text-xs font-mono">Workspace / Overview</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ActionButton icon={Calendar} label="Calendar" />
                        <ActionButton icon={BookOpen} label="Study" />
                        <ActionButton icon={Upload} label="Import" />
                        <ActionButton icon={SearchIcon} label="Search" />
                    </div>
                </div>

                <div className="flex-1 p-8 overflow-y-auto">
                    {/* Placeholder replace with actual Graph/HomeHub content later if needed, but for now structure is key */}
                    <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                        <div className="text-center">
                            <div className="w-16 h-16 border border-border rounded-full flex items-center justify-center mx-auto mb-4 text-text-tertiary">
                                <SearchIcon size={24} />
                            </div>
                            <h3 className="text-base font-bold text-text-secondary mb-2">Workspace Ready</h3>
                            <p className="text-sm max-w-xs mx-auto mb-6 text-text-tertiary leading-relaxed">Select a repository or open the graph view to begin exploring your knowledge base.</p>
                            <Button variant="primary" size="default" aria-label="Start new study session">
                                <Play size={18} />
                                Start Study Session
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActionButton({ icon: Icon, label }: { icon: any; label: string }) {
    return (
        <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-bg-hover rounded-sm text-text-secondary hover:text-text-primary transition-colors text-xs font-bold">
            <Icon size={14} />
            <span>{label}</span>
        </button>
    );
}

function TaskItem({ completed = false, text }: { completed?: boolean; text: string }) {
    return (
        <motion.div
            className="flex items-center gap-3 py-3 border-b border-border/50 hover:bg-bg-hover px-2 -mx-2 rounded-sm transition-colors cursor-pointer min-h-[48px]"
            variants={itemVariants}
            role="button"
            tabIndex={0}
            aria-label={`Task: ${text}`}
        >
            <motion.div animate={{ scale: completed ? 1 : 1 }}>
                {completed ? (
                    <CheckCircle2 size={18} className="text-accent" />
                ) : (
                    <Circle size={18} className="text-text-tertiary" />
                )}
            </motion.div>
            <span className={cn("text-sm leading-normal", completed && "line-through text-text-tertiary")} style={{ color: completed ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                {text}
            </span>
        </motion.div>
    );
}



function DeadlineCard({ title, course, daysLeft }: { title: string; course: string; daysLeft: number }) {
    return (
        <motion.div
            className="py-3 border-b border-border/50 flex items-center justify-between group hover:bg-bg-hover px-2 -mx-2 transition-colors rounded-sm cursor-pointer"
            variants={itemVariants}
        >
            <div>
                <h3 className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">{title}</h3>
                <p className="text-xs text-text-tertiary font-mono mt-0.5">{course}</p>
            </div>
            <span className="text-xs font-bold text-text-secondary">
                {daysLeft} days left
            </span>
        </motion.div>
    );
}
