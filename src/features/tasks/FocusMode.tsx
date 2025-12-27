import { useState, useEffect, useMemo } from 'react';
import { Play, Pause, RotateCcw, Music, Settings2, Timer, Calendar, CheckCircle2, Circle, BarChart3 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '../../lib/utils';
import { Layout } from '../../components/layout/Layout';
import { motion, AnimatePresence } from 'framer-motion';

interface Repository {
    id: number;
    name: string;
}

interface DDay {
    id: number;
    title: string;
    target_date: string;
    color?: string;
}

interface Task {
    id: number;
    title: string;
    completed: boolean;
}

interface StudySession {
    id: number;
    repository_id: number | null;
    start_at: string;
    end_at: string | null;
    duration: number | null;
    is_break: boolean;
}

export function FocusMode() {
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [elapsedTime, setElapsedTime] = useState(0); // For stopwatch
    const [sessionType, setSessionType] = useState<'focus' | 'break' | 'stopwatch'>('focus');
    const [selectedRepo, setSelectedRepo] = useState<number | null>(null);
    const [repos, setRepos] = useState<Repository[]>([]);
    const [dDays, setDDays] = useState<DDay[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [sessions, setSessions] = useState<StudySession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [showStats, setShowStats] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    async function loadInitialData() {
        try {
            const [reposRes, dDaysRes, tasksRes, sessionsRes] = await Promise.all([
                invoke<Repository[]>('get_repositories'),
                invoke<DDay[]>('get_d_days'),
                invoke<Task[]>('get_tasks'),
                invoke<StudySession[]>('get_study_sessions', { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() })
            ]);
            setRepos(reposRes);
            setDDays(dDaysRes);
            setTasks(tasksRes);
            setSessions(sessionsRes);
        } catch (e) { console.error(e); }
    }

    // --- Statistics Calculations ---
    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todaySessions = sessions.filter(s => s.start_at.startsWith(today) && !s.is_break);
        const totalToday = todaySessions.reduce((acc, s) => acc + (s.duration || 0), 0);

        // Subject Breakdown
        const subjectMap: Record<number, number> = {};
        todaySessions.forEach(s => {
            const repoId = s.repository_id || 0; // 0 for general
            subjectMap[repoId] = (subjectMap[repoId] || 0) + (s.duration || 0);
        });

        const subjectData = Object.entries(subjectMap).map(([id, dur]) => ({
            name: id === '0' ? 'General' : repos.find(r => r.id === Number(id))?.name || 'Unknown',
            duration: dur,
            color: id === '0' ? '#94a3b8' : `hsl(${(Number(id) * 137) % 360}, 70%, 60%)`
        })).sort((a, b) => b.duration - a.duration);

        // Heatmap Data (Last 14 days)
        const heatmap = [];
        for (let i = 13; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const dayDur = sessions
                .filter(s => s.start_at.startsWith(date) && !s.is_break)
                .reduce((acc, s) => acc + (s.duration || 0), 0);
            heatmap.push({ date, duration: dayDur });
        }

        return { totalToday, subjectData, heatmap };
    }, [sessions, repos]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isActive) {
            interval = setInterval(() => {
                if (sessionType === 'stopwatch') {
                    setElapsedTime(prev => prev + 1);
                } else {
                    setTimeLeft(prev => {
                        if (prev <= 1) {
                            handleSessionComplete();
                            return 0;
                        }
                        return prev - 1;
                    });
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, sessionType]);

    const handleSessionComplete = async () => {
        setIsActive(false);
        if (currentSessionId) {
            const endAt = new Date().toISOString();
            const duration = sessionType === 'stopwatch' ? elapsedTime : (sessionType === 'focus' ? 25 * 60 : 5 * 60);
            await invoke('stop_study_session', { id: currentSessionId, endAt: endAt, duration });
            setCurrentSessionId(null);
            // Refresh data
            loadInitialData();
        }
    };

    const toggleTimer = async () => {
        if (!isActive) {
            // Start session
            const startAt = new Date().toISOString();
            try {
                const id = await invoke<number>('start_study_session', {
                    repository_id: selectedRepo,
                    start_at: startAt,
                    is_break: sessionType === 'break'
                });
                setCurrentSessionId(id);
                setIsActive(true);
            } catch (e) {
                console.error("Failed to start session:", e);
            }
        } else {
            handleSessionComplete();
        }
    };

    const resetTimer = () => {
        setIsActive(false);
        setElapsedTime(0);
        if (sessionType === 'focus') setTimeLeft(25 * 60);
        else if (sessionType === 'break') setTimeLeft(5 * 60);
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const calculateDaysLeft = (date: string) => {
        const diff = new Date(date).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    return (
        <Layout>
            <div className="flex-1 h-full flex overflow-hidden relative">
                {/* Main Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 transition-all duration-500">
                    <div className={cn("z-10 flex flex-col items-center gap-12 w-full max-w-2xl transition-all duration-500", showStats && "scale-90 opacity-60 pointer-events-none blur-sm")}>
                        {/* Session Type Toggle */}
                        <div className="flex items-center gap-2 p-1 rounded-full border border-border bg-bg-hover backdrop-blur-sm">
                            {(['focus', 'stopwatch', 'break'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => {
                                        if (isActive) return;
                                        setSessionType(type);
                                        resetTimer();
                                    }}
                                    className={cn(
                                        "px-6 py-2 rounded-full text-sm font-medium transition-all text-text-secondary",
                                        sessionType === type && "bg-accent/10 text-accent shadow-sm"
                                    )}
                                >
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Subject Selection */}
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-xs text-text-tertiary uppercase tracking-widest font-bold">studying for</span>
                            <select
                                value={selectedRepo || ''}
                                onChange={(e) => setSelectedRepo(e.target.value ? Number(e.target.value) : null)}
                                disabled={isActive}
                                className="bg-transparent text-text-primary text-lg font-medium outline-none border-b border-border-light hover:border-accent transition-colors py-1 cursor-pointer appearance-none text-center min-w-[200px]"
                            >
                                <option value="" className="bg-bg-primary">General Study</option>
                                {repos.map(r => <option key={r.id} value={r.id} className="bg-bg-primary">{r.name}</option>)}
                            </select>
                        </div>

                        {/* Timer Display */}
                        <div className="relative group cursor-default select-none flex flex-col items-center">
                            <motion.div
                                className="text-[10rem] leading-none font-bold tracking-tighter tabular-nums text-text-primary"
                                animate={{ scale: isActive ? [1, 1.02, 1] : 1 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            >
                                {formatTime(sessionType === 'stopwatch' ? elapsedTime : timeLeft)}
                            </motion.div>
                            <p className="text-xl font-medium mt-4 opacity-50 text-text-secondary">
                                {isActive ? (sessionType === 'break' ? 'Time to recharge' : 'Deep focus active') : 'Ready to start?'}
                            </p>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-6">
                            <button
                                onClick={toggleTimer}
                                className={cn(
                                    "w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl shadow-accent/20",
                                    isActive ? "bg-bg-surface border-2 border-accent text-accent" : "bg-accent text-black"
                                )}
                            >
                                {isActive ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                            </button>

                            <button
                                onClick={resetTimer}
                                className="w-14 h-14 rounded-full flex items-center justify-center border border-border transition-all hover:bg-bg-hover active:scale-95 text-text-secondary hover:text-text-primary"
                            >
                                <RotateCcw size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Statistics Overlay */}
                    <AnimatePresence>
                        {showStats && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="absolute inset-0 z-20 flex items-center justify-center p-8 pointer-events-none"
                            >
                                <div className="bg-bg-surface/90 backdrop-blur-xl border border-border p-8 rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-y-auto pointer-events-auto custom-scrollbar">
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                                            <BarChart3 className="text-accent" />
                                            Study Insights
                                        </h2>
                                        <button onClick={() => setShowStats(false)} className="text-text-secondary hover:text-text-primary">Close</button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        {/* Heatmap */}
                                        <section>
                                            <h3 className="text-sm font-bold text-text-tertiary uppercase tracking-widest mb-4">Consistency (Last 14 Days)</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {stats.heatmap.map((day) => {
                                                    const intensity = Math.min(day.duration / (4 * 3600), 1); // 4 hours max intensity
                                                    return (
                                                        <div
                                                            key={day.date}
                                                            className="w-8 h-8 rounded-md relative group transition-transform hover:scale-110"
                                                            style={{
                                                                backgroundColor: day.duration > 0
                                                                    ? `rgba(var(--accent-rgb), ${0.2 + intensity * 0.8})`
                                                                    : 'var(--bg-hover)'
                                                            }}
                                                        >
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded bg-bg-primary border border-border text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                                                {new Date(day.date).toLocaleDateString()}: {formatDuration(day.duration)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>

                                        {/* Subject Breakdown */}
                                        <section>
                                            <h3 className="text-sm font-bold text-text-tertiary uppercase tracking-widest mb-4">Subject Breakdown (Today)</h3>
                                            <div className="space-y-4">
                                                {stats.subjectData.map(item => (
                                                    <div key={item.name} className="flex flex-col gap-1">
                                                        <div className="flex items-center justify-between text-xs font-medium">
                                                            <span className="text-text-secondary">{item.name}</span>
                                                            <span className="text-text-primary">{formatDuration(item.duration)}</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-bg-hover rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${(item.duration / stats.totalToday) * 100}%` }}
                                                                className="h-full"
                                                                style={{ backgroundColor: item.color }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                                {stats.subjectData.length === 0 && <p className="text-xs text-text-tertiary italic text-center py-8">No data for today</p>}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Sidebar - D-Days & Integrated Tasks */}
                <div className="w-80 border-l border-border bg-bg-surface/30 p-6 flex flex-col gap-8 overflow-y-auto z-10">
                    {/* D-Day Section */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                                <Calendar size={14} className="text-accent" />
                                COUNTDOWNS
                            </h3>
                            <button className="text-xs text-accent hover:underline">Manage</button>
                        </div>
                        <div className="space-y-3">
                            {dDays.map(day => (
                                <div key={day.id} className="p-3 rounded-xl bg-bg-primary border border-border flex items-center justify-between group hover:border-accent/50 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium text-text-primary">{day.title}</p>
                                        <p className="text-[10px] text-text-tertiary">{new Date(day.target_date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-accent">D-{calculateDaysLeft(day.target_date)}</p>
                                    </div>
                                </div>
                            ))}
                            {dDays.length === 0 && <p className="text-xs text-text-tertiary italic text-center py-4">No countdowns set</p>}
                        </div>
                    </section>

                    {/* Today's Goals Section */}
                    <section className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-accent" />
                                GOALS
                            </h3>
                        </div>
                        <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            {tasks.map(task => (
                                <div key={task.id} className="flex items-center gap-3 group">
                                    <button className={cn("transition-colors", task.completed ? "text-accent" : "text-border-light")}>
                                        {task.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                    </button>
                                    <span className={cn("text-xs transition-colors", task.completed ? "text-text-tertiary line-through" : "text-text-secondary group-hover:text-text-primary")}>
                                        {task.title}
                                    </span>
                                </div>
                            ))}
                            {tasks.length === 0 && <p className="text-xs text-text-tertiary italic text-center py-4">No goals for today</p>}
                        </div>
                    </section>
                </div>

                {/* Bottom Analytics Overlay */}
                <div className="absolute bottom-6 left-8 flex items-center gap-4 z-10">
                    <button
                        onClick={() => setShowStats(!showStats)}
                        className="flex items-center gap-2 p-3 rounded-2xl bg-bg-surface/80 backdrop-blur-md border border-border shadow-lg hover:border-accent transition-colors group"
                    >
                        <Timer size={16} className="text-accent" />
                        <div className="text-left">
                            <p className="text-[10px] uppercase font-bold text-text-tertiary leading-none">Total Today</p>
                            <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors">{formatDuration(stats.totalToday)}</p>
                        </div>
                    </button>
                </div>

                {/* Settings & Sound Overlay */}
                <div className="absolute bottom-6 right-[22rem] flex items-center gap-3 z-10">
                    <button className="p-3 rounded-full border border-border bg-bg-surface/80 hover:bg-bg-hover transition-colors text-text-secondary" title="Ambient Sounds">
                        <Music size={18} />
                    </button>
                    <button className="p-3 rounded-full border border-border bg-bg-surface/80 hover:bg-bg-hover transition-colors text-text-secondary" title="Timer Settings">
                        <Settings2 size={18} />
                    </button>
                </div>
            </div>
        </Layout>
    );
}
