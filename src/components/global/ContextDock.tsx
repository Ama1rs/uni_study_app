import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Circle, Plus, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUserProfile } from '../../contexts/UserProfileContext';

interface Task {
    id: number;
    title: string;
    completed: boolean;
}

interface PlannerEvent {
    id: number;
    title: string;
    start_at: string;
    end_at: string;
}

export function ContextDock() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [tasks, setTasks] = useState<Task[]>([]);
    const [events, setEvents] = useState<PlannerEvent[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { profile } = useUserProfile();

    // Time update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Load data
    useEffect(() => {
        loadData();
    }, []);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        };

        if (isExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isExpanded]);

    async function loadData() {
        try {
            const tasksRes = await invoke<Task[]>('get_tasks');
            setTasks(tasksRes);

            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
            const eventsRes = await invoke<PlannerEvent[]>('get_planner_events', { from: start, to: end });
            eventsRes.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
            setEvents(eventsRes);
        } catch (e) {
            console.error("Failed to load dock data:", e);
        }
    }

    async function toggleTask(id: number, currentStatus: boolean) {
        try {
            setTasks(tasks.map(t => t.id === id ? { ...t, completed: !currentStatus } : t));
            await invoke('update_task_status', { id, completed: !currentStatus });
        } catch (e) {
            console.error(e);
            loadData();
        }
    }

    async function addTask(e: React.FormEvent) {
        e.preventDefault();
        if (!newTaskTitle.trim()) {
            setIsAdding(false);
            return;
        }

        try {
            await invoke('create_task', { title: newTaskTitle });
            setNewTaskTitle('');
            setIsAdding(false);
            loadData();
        } catch (e) {
            console.error(e);
        }
    }

    async function deleteTask(e: React.MouseEvent, id: number) {
        e.stopPropagation();
        try {
            await invoke('delete_task', { id });
            loadData();
        } catch (e) {
            console.error(e);
        }
    }

    const completedTasks = tasks.filter(t => t.completed).length;
    const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    // Greeting logic
    const currentHour = currentTime.getHours();
    const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

    const [activeTab, setActiveTab] = useState<'today' | 'context'>('today');
    const [contextData, setContextData] = useState<string[]>([]);

    // ... (existing loadData and other functions)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const text = e.dataTransfer.getData('text');
        if (text) {
            setContextData(prev => [...prev, text]);
            setActiveTab('context');
            if (!isExpanded) setIsExpanded(true);
        }
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            ref={containerRef}
            className="fixed bottom-6 right-6 z-[100] flex flex-col items-end"
            initial={false}
        >
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                        className="mb-4 w-80 bg-bg-surface/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[70vh] cursor-auto"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-border select-none">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-text-primary">{greeting}, {profile?.name?.split(' ')[0] || 'Student'}</h3>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="p-1 hover:bg-bg-hover rounded-full text-text-tertiary hover:text-text-primary transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex bg-bg-primary/90 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('today')}
                                    className={cn(
                                        "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
                                        activeTab === 'today' ? "bg-bg-surface text-text-primary shadow-sm" : "text-text-tertiary hover:text-text-secondary"
                                    )}
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => setActiveTab('context')}
                                    className={cn(
                                        "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
                                        activeTab === 'context' ? "bg-bg-surface text-text-primary shadow-sm" : "text-text-tertiary hover:text-text-secondary"
                                    )}
                                >
                                    Context
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {activeTab === 'today' ? (
                                <>
                                    {/* Goals Section */}
                                    <div className="mb-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-mono uppercase text-text-tertiary tracking-wider">Daily Goals</h4>
                                            <button
                                                onClick={() => setIsAdding(true)}
                                                className="text-accent hover:bg-accent/10 p-1 rounded transition-colors"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {isAdding && (
                                                <form onSubmit={addTask} className="mb-2">
                                                    <input
                                                        autoFocus
                                                        className="w-full bg-bg-primary/50 border border-accent rounded px-2 py-1.5 text-sm outline-none text-text-primary placeholder-text-tertiary"
                                                        placeholder="New goal..."
                                                        value={newTaskTitle}
                                                        onChange={e => setNewTaskTitle(e.target.value)}
                                                        onBlur={() => !newTaskTitle.trim() && setIsAdding(false)}
                                                    />
                                                </form>
                                            )}

                                            {tasks.length === 0 && !isAdding ? (
                                                <div className="text-center py-4 text-xs text-text-tertiary border border-dashed border-border rounded-lg">
                                                    No goals yet
                                                </div>
                                            ) : (
                                                tasks.map(task => (
                                                    <div
                                                        key={task.id}
                                                        className="group flex items-start gap-3 p-1.5 rounded-md hover:bg-bg-hover/50 cursor-pointer transition-colors relative"
                                                        onClick={() => toggleTask(task.id, task.completed)}
                                                    >
                                                        <div className={cn(
                                                            "mt-0.5 transition-colors",
                                                            task.completed ? "text-accent" : "text-text-tertiary group-hover:text-text-secondary"
                                                        )}>
                                                            {task.completed ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                                        </div>
                                                        <span className={cn(
                                                            "text-sm flex-1 break-words transition-all",
                                                            task.completed ? "text-text-tertiary line-through" : "text-text-secondary group-hover:text-text-primary"
                                                        )}>
                                                            {task.title}
                                                        </span>
                                                        <button
                                                            onClick={(e) => deleteTask(e, task.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-text-tertiary hover:text-red-400 transition-all absolute right-0 top-1/2 -translate-y-1/2"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Timeline Section */}
                                    <div>
                                        <h4 className="text-xs font-mono uppercase text-text-tertiary tracking-wider mb-3">Timeline</h4>
                                        <div className="space-y-3 relative pl-2">
                                            <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-border" />
                                            {events.length === 0 ? (
                                                <p className="text-xs text-text-tertiary pl-4">No events today</p>
                                            ) : (
                                                events.map(event => {
                                                    const now = new Date();
                                                    const isActive = now >= new Date(event.start_at) && now <= new Date(event.end_at);
                                                    return (
                                                        <div key={event.id} className="relative pl-4">
                                                            <div className={cn(
                                                                "absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-bg-surface transition-colors z-10",
                                                                isActive ? "border-accent bg-accent" : "border-border"
                                                            )} />
                                                            <div className="flex flex-col">
                                                                <span className={cn(
                                                                    "text-xs font-mono mb-0.5",
                                                                    isActive ? "text-accent" : "text-text-tertiary"
                                                                )}>
                                                                    {new Date(event.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                <span className={cn(
                                                                    "text-sm font-medium",
                                                                    isActive ? "text-text-primary" : "text-text-secondary"
                                                                )}>
                                                                    {event.title}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col">
                                    <div className="flex-1 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center p-6 text-center text-text-tertiary hover:border-accent/50 hover:bg-accent/5 transition-all mb-4">
                                        <p className="text-sm mb-1">Drag & Drop text here</p>
                                        <p className="text-xs opacity-50">to save context</p>
                                    </div>

                                    <div className="space-y-3">
                                        {contextData.map((data, idx) => (
                                            <div key={idx} className="bg-bg-primary/50 p-3 rounded-md text-sm text-text-secondary border border-border group relative">
                                                <p className="line-clamp-3">{data}</p>
                                                <button
                                                    onClick={() => setContextData(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute -top-1.5 -right-1.5 bg-bg-surface border border-border rounded-full p-0.5 text-text-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pill Trigger */}
            <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={cn(
                    "pointer-events-auto h-12 bg-bg-surface/90 backdrop-blur-md border border-border rounded-full flex items-center justify-center px-6 shadow-xl hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5 transition-all group z-[101] cursor-grab active:cursor-grabbing",
                    isExpanded ? "bg-bg-surface border-accent" : ""
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                layout
            >
                <div className="flex flex-col items-end">
                    <span className="text-base font-mono font-medium text-text-primary leading-none">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider group-hover:text-accent transition-colors">
                        {tasks.length > 0 ? `${Math.round(progress)}% Done` : 'Focus'}
                    </span>
                </div>
            </motion.button>
        </motion.div>
    );
}
