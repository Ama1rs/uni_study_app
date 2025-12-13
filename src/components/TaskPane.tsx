import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CheckCircle2, Circle, Plus, Calendar as CalendarIcon, PanelRightClose, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useUserProfile } from '../contexts/UserProfileContext';

interface Task {
    id: number;
    title: string;
    completed: boolean;
    created_at?: string;
}

interface PlannerEvent {
    id: number;
    title: string;
    start_at: string;
    end_at: string;
}

export function TaskPane({ onClose }: { onClose?: () => void }) {
    const { profile } = useUserProfile();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [events, setEvents] = useState<PlannerEvent[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    useEffect(() => {
        loadEvents();
        loadTasks();
    }, []);

    async function loadTasks() {
        try {
            const res = await invoke<Task[]>('get_tasks');
            setTasks(res);
        } catch (e) {
            console.error("Failed to load tasks:", e);
        }
    }

    async function loadEvents() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

        try {
            const res = await invoke<PlannerEvent[]>('get_planner_events', { from: start, to: end });
            res.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
            setEvents(res);
        } catch (e) { console.error(e); }
    }

    async function toggleTask(id: number, currentStatus: boolean) {
        try {
            // Optimistic update
            setTasks(tasks.map(t => t.id === id ? { ...t, completed: !currentStatus } : t));
            await invoke('update_task_status', { id, completed: !currentStatus });
        } catch (e) {
            console.error(e);
            loadTasks(); // Revert on error
        }
    };

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
            loadTasks();
        } catch (e) {
            console.error(e);
        }
    }

    async function deleteTask(e: React.MouseEvent, id: number) {
        e.stopPropagation();
        if (!confirm('Delete this goal?')) return;
        try {
            await invoke('delete_task', { id });
            loadTasks();
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="w-80 h-full flex flex-col glass-card rounded-xl mr-2 my-4 overflow-hidden">
            {/* Header */}
            <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-bg-surface/50">
                <span className="font-medium text-text-primary flex items-center gap-2">
                    <CalendarIcon size={14} className="text-accent" />
                    Today View
                </span>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-bg-hover rounded text-text-secondary hover:text-text-primary transition-colors"
                        title="Hide Panel"
                    >
                        <PanelRightClose size={16} />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {/* Greeting */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-text-primary mb-1">
                        {greeting}, {profile?.name?.split(' ')[0] || 'Student'}
                    </h2>
                    <p className="text-xs text-text-secondary">{today}</p>
                </div>

                {/* Daily Goals */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-text-primary">Daily Goals</h3>
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
                                    className="w-full bg-bg-surface border border-accent rounded px-2 py-1 text-sm outline-none text-text-primary"
                                    placeholder="Enter goal..."
                                    value={newTaskTitle}
                                    onChange={e => setNewTaskTitle(e.target.value)}
                                    onBlur={() => {
                                        if (!newTaskTitle.trim()) setIsAdding(false);
                                    }}
                                />
                            </form>
                        )}
                        {tasks.map(task => (
                            <div
                                key={task.id}
                                className="flex items-start gap-3 group cursor-pointer select-none relative"
                                onClick={() => toggleTask(task.id, task.completed)}
                            >
                                <button className={cn(
                                    "mt-0.5 transition-colors",
                                    task.completed ? "text-accent" : "text-border-light group-hover:text-text-secondary"
                                )}>
                                    {task.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                </button>
                                <span className={cn(
                                    "text-sm transition-all flex-1 break-words",
                                    task.completed ? "text-text-tertiary line-through" : "text-text-secondary group-hover:text-text-primary"
                                )}>
                                    {task.title}
                                </span>
                                <button
                                    onClick={(e) => deleteTask(e, task.id)}
                                    className="absolute right-0 top-0 p-1 text-text-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {!isAdding && tasks.length === 0 && (
                            <p className="text-xs text-text-tertiary text-center py-2">No goals set for today.</p>
                        )}
                    </div>
                </div>

                {/* Schedule */}
                <div>
                    <h3 className="text-sm font-semibold text-text-primary mb-3">Timeline</h3>
                    <div className="space-y-4 relative pl-2">
                        {/* Timeline Line */}
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

                        {events.length === 0 ? (
                            <p className="text-xs text-text-tertiary pl-6">No events scheduled for today.</p>
                        ) : (
                            events.map(event => {
                                const date = new Date(event.start_at);
                                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                // Check if event is currently active (simple check)
                                const now = new Date();
                                const isActive = now >= new Date(event.start_at) && now <= new Date(event.end_at);

                                return (
                                    <ScheduleItem
                                        key={event.id}
                                        time={timeStr}
                                        title={event.title}
                                        active={isActive}
                                    />
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}

function ScheduleItem({ time, title, active }: { time: string; title: string; active?: boolean }) {
    return (
        <div className="flex items-center gap-4 relative z-10">
            <div className={cn(
                "w-2 h-2 rounded-full border-2 bg-bg-primary transition-colors",
                active ? "border-accent bg-accent" : "border-border"
            )} />
            <div>
                <p className={cn(
                    "text-xs font-mono mb-0.5 transition-colors",
                    active ? "text-accent" : "text-text-tertiary"
                )}>{time}</p>
                <p className={cn(
                    "text-sm transition-colors",
                    active ? "text-text-primary font-medium" : "text-text-secondary"
                )}>{title}</p>
            </div>
        </div>
    );
}
