import { useState, useEffect, useMemo } from 'react';
import { Play, Pause, RotateCcw, Music, Settings2, Calendar, CheckCircle2, Circle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

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

interface FocusModeProps {
    activeView: string;
}

export function FocusMode({ activeView }: FocusModeProps) {
    const [isActive, setIsActive] = useState(false);
    const { mode } = useTheme();
    const isDarkMode = mode === 'dark';
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
    const [showStopConfirmation, setShowStopConfirmation] = useState(false);
    const [shouldPulse, setShouldPulse] = useState(false);
    const [lastPulseMinute, setLastPulseMinute] = useState(-1);
    const [canTakeBreak, setCanTakeBreak] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (isActive && activeView === 'focus') {
            document.body.classList.add('nav-locked');
        } else {
            document.body.classList.remove('nav-locked');
        }
        return () => document.body.classList.remove('nav-locked');
    }, [isActive, activeView]);


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
                    setElapsedTime(prev => {
                        const next = prev + 1;
                        if (Math.floor(next / 60) > Math.floor(prev / 60)) {
                            setShouldPulse(true);
                        }
                        return next;
                    });
                } else {
                    setTimeLeft(prev => {
                        if (prev <= 1) {
                            handleSessionComplete(true);
                            return 0;
                        }
                        const currentMinute = Math.floor(prev / 60);
                        if (currentMinute !== lastPulseMinute && prev % 60 === 0) {
                            setShouldPulse(true);
                            setLastPulseMinute(currentMinute);
                        }
                        return prev - 1;
                    });
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, sessionType, lastPulseMinute]);

    // Handle pulse reset
    useEffect(() => {
        if (shouldPulse) {
            const timer = setTimeout(() => setShouldPulse(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [shouldPulse]);

    const handleSessionComplete = async (isFinished: boolean = false, force: boolean = false) => {
        if (!isFinished && !force && isActive && sessionType === 'focus' && timeLeft > 0) {
            setShowStopConfirmation(true);
            return;
        }

        setIsActive(false);
        setShowStopConfirmation(false);
        if (currentSessionId) {
            const endAt = new Date().toISOString();
            const duration = sessionType === 'stopwatch' ? elapsedTime : (sessionType === 'focus' ? (25 * 60 - timeLeft) : (5 * 60 - timeLeft));
            await invoke('stop_study_session', { id: currentSessionId, endAt: endAt, duration: Math.max(0, Math.floor(duration)) });
            setCurrentSessionId(null);
            loadInitialData();
            if (sessionType === 'focus' && isFinished) {
                setCanTakeBreak(true);
                setSessionType('break');
                setTimeLeft(5 * 60);
            }
        } else {
            // Also reset UI if no session ID (e.g. stopped before start completed)
            resetTimer();
        }
    };

    const toggleTimer = async () => {
        if (!isActive) {
            // Start session
            const startAt = new Date().toISOString();
            try {
                const id = await invoke<number>('start_study_session', {
                    repositoryId: selectedRepo,
                    startAt: startAt,
                    isBreak: sessionType === 'break'
                });
                setCurrentSessionId(id);
                setIsActive(true);
            } catch (e) {
                console.error("Failed to start session:", e);
            }
        } else {
            handleSessionComplete(false);
        }
    };

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (showStopConfirmation || showStats) return;
            if (e.code === 'Space' || e.key === 'Enter') {
                // Don't toggle if user is typing in a select or something
                if (document.activeElement?.tagName === 'SELECT' || document.activeElement?.tagName === 'INPUT') return;
                e.preventDefault();
                toggleTimer();
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isActive, showStopConfirmation, showStats, toggleTimer]);

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
        <div className={cn(
            "flex-1 h-full flex flex-col relative bg-bg-primary",
            isActive ? "overflow-hidden" : "overflow-y-auto custom-scrollbar"
        )}>
            {/* Vignette Effect when active */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 pointer-events-none z-0"
                        style={{
                            background: isDarkMode
                                ? 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.7) 100%)'
                                : 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.2) 100%)'
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Main Content Container */}
            <div className={cn(
                "flex-1 flex flex-col items-center p-8 transition-all duration-700 relative z-10",
                isActive ? "justify-center h-full" : "justify-start pt-12"
            )}>
                {/* Top Tabs */}
                <div className={cn("flex flex-col items-center gap-16 w-full max-w-4xl transition-all duration-500", showStats && "opacity-20 pointer-events-none")}>
                    <div className={cn(
                        "flex items-center gap-10 border-b border-border/20 pb-0 px-2 relative transition-all duration-700",
                        isActive && "opacity-0 -translate-y-4 pointer-events-none h-0 mb-[-64px]"
                    )}>
                        {(['focus', 'stopwatch', 'break'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => {
                                    if (isActive) return;
                                    setSessionType(type);
                                    resetTimer();
                                }}
                                disabled={isActive || (type === 'break' && !canTakeBreak)}
                                className={cn(
                                    "text-[10px] font-bold uppercase tracking-[0.25em] transition-all relative py-4 px-2",
                                    sessionType === type ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary disabled:opacity-20 disabled:cursor-not-allowed",
                                )}
                            >
                                {type}
                                {sessionType === type && (
                                    <motion.div
                                        layoutId="activeTabIndicator"
                                        className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-accent z-20"
                                        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Timer Section */}
                    <div className={cn(
                        "flex flex-col items-center w-full transition-all duration-700",
                        isActive ? "gap-24" : "gap-12"
                    )}>
                        {/* Header Info */}
                        <div className={cn(
                            "flex flex-col items-center gap-4 transition-all duration-700",
                            isActive ? (isDarkMode ? "opacity-40 scale-90" : "opacity-60 scale-90") : "opacity-100"
                        )}>
                            <span className={cn(
                                "text-[9px] uppercase tracking-[0.4em] font-black opacity-40 text-text-tertiary"
                            )}>
                                Currently Focusing On
                            </span>
                            <div className="relative group">
                                <select
                                    value={selectedRepo || ''}
                                    onChange={(e) => setSelectedRepo(e.target.value ? Number(e.target.value) : null)}
                                    disabled={isActive}
                                    className={cn(
                                        "bg-transparent text-3xl font-black outline-none transition-all py-1 cursor-pointer appearance-none text-center min-w-[300px] border-b border-transparent hover:border-border/30 focus:border-accent/50 text-text-primary",
                                        isActive && "cursor-default border-transparent"
                                    )}
                                >
                                    <option value="" className="bg-bg-surface text-text-primary">General Study</option>
                                    {repos.map(r => <option key={r.id} value={r.id} className="bg-bg-surface text-text-primary">{r.name}</option>)}
                                </select>
                                {!isActive && <Settings2 size={12} className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity text-text-tertiary" />}
                            </div>
                        </div>

                        {/* Clock Display */}
                        <div className="relative cursor-default select-none text-center flex flex-col items-center">
                            <motion.div
                                animate={shouldPulse ? { scale: [1, 1.02, 1] } : {}}
                                transition={{ duration: 0.5 }}
                                className="relative flex items-center justify-center min-h-[14rem]"
                            >
                                <span className={cn(
                                    "text-[12rem] leading-none font-black tracking-tighter tabular-nums font-mono transition-all duration-1000 z-10 text-text-primary",
                                    isActive ? (isDarkMode ? "drop-shadow-[0_0_80px_rgba(255,255,255,0.08)]" : "drop-shadow-[0_0_80px_rgba(0,0,0,0.05)]") : "opacity-90"
                                )}>
                                    {formatTime(sessionType === 'stopwatch' ? elapsedTime : timeLeft)}
                                </span>

                                {/* Progress Ring / Glow when active */}
                                {isActive && (
                                    <div className="absolute inset-0 -m-20 pointer-events-none overflow-visible flex items-center justify-center">

                                        <motion.div
                                            className={cn(
                                                "absolute inset-0 rounded-[50px] border backdrop-blur-md transition-colors duration-700",
                                                isDarkMode
                                                    ? "border-border/30 bg-bg-surface/30"
                                                    : "border-black/5 bg-white/40 shadow-xl"
                                            )}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                        />
                                    </div>
                                )}
                            </motion.div>

                            <div className="h-10 mt-6 flex items-center justify-center">
                                <p className={cn(
                                    "text-[11px] font-bold uppercase tracking-[0.7em] transition-all duration-500",
                                    isActive ? "text-accent animate-pulse" : "text-text-tertiary opacity-30"
                                )}>
                                    {isActive
                                        ? (sessionType === 'break' ? 'Recharging' : 'Deep Focus Active')
                                        : 'Ready to commit?'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex flex-col items-center gap-8 mt-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={toggleTimer}
                                className={cn(
                                    "group relative px-20 py-5 rounded-full flex items-center gap-4 transition-all duration-500 shadow-2xl overflow-hidden font-black",
                                    isActive
                                        ? (isDarkMode
                                            ? "bg-bg-surface/50 border border-border/50 text-text-secondary hover:border-red-500/50 hover:text-red-500 backdrop-blur-md"
                                            : "bg-white/50 border border-text-primary/10 text-text-primary/60 hover:border-red-500/50 hover:text-red-500 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.05)]")
                                        : (isDarkMode
                                            ? "bg-text-primary text-bg-primary hover:bg-text-secondary shadow-[0_0_50px_rgba(255,255,255,0.15)]"
                                            : "bg-text-primary text-bg-primary hover:bg-text-primary/90 shadow-2xl")
                                )}
                            >
                                {isActive ? (
                                    <>
                                        <Pause size={18} fill="currentColor" />
                                        <span className="text-[14px] uppercase tracking-[0.3em] font-black">Stop Session</span>
                                    </>
                                ) : (
                                    <>
                                        <Play size={18} fill="currentColor" className="ml-1" />
                                        <span className="text-[14px] uppercase tracking-[0.3em] font-black">Start Focus</span>
                                    </>
                                )}
                            </motion.button>

                            <div className="flex items-center gap-8">
                                {!isActive && (
                                    <p className="text-[10px] text-text-tertiary uppercase tracking-[0.4em] font-bold opacity-20">
                                        Deep work sessions extend your streak
                                    </p>
                                )}

                                {!isActive && (sessionType === 'stopwatch' ? elapsedTime > 0 : timeLeft < (sessionType === 'focus' ? 25 * 60 : 5 * 60)) && (
                                    <button
                                        onClick={resetTimer}
                                        className="px-4 py-2 rounded-full text-text-tertiary hover:text-text-primary transition-colors flex items-center gap-2 hover:bg-bg-hover border border-border/30"
                                    >
                                        <RotateCcw size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Reset</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Integrated Info Section */}
                <div className={cn(
                    "w-full max-w-6xl transition-all duration-700",
                    isActive ? "h-0 overflow-hidden opacity-0 pointer-events-none mt-0 mb-0" : "opacity-100 mt-24 mb-12"
                )}>
                    <div className="grid grid-cols-3 gap-12">
                        {/* Session Analytics */}
                        <div className="space-y-8 bg-bg-surface/40 p-8 rounded-3xl border border-border/30 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Session Info</h2>
                                <div className="flex gap-2">
                                    <button className="p-2 hover:bg-white/5 rounded-md text-text-tertiary transition-colors"><Music size={14} /></button>
                                    <button className="p-2 hover:bg-bg-hover rounded-md text-text-tertiary transition-colors" onClick={() => setShowStats(true)}><Settings2 size={14} /></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-[9px] text-text-tertiary uppercase tracking-[0.2em] font-bold mb-2 opacity-50">Total Today</p>
                                    <p className="text-3xl font-black font-mono text-text-primary tabular-nums">
                                        {formatDuration(stats.totalToday)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-text-tertiary uppercase tracking-[0.2em] font-bold mb-2 opacity-50">Current Streak</p>
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-black font-mono text-orange-500 tabular-nums">12</span>
                                        <span className="text-xl animate-pulse">🔥</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-orange-500/[0.03] border border-orange-500/10">
                                <p className="text-[9px] text-orange-500/70 font-bold uppercase tracking-[0.15em] leading-relaxed">
                                    Don't break the chain. High focus sessions today will extend your survival streak.
                                </p>
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className="space-y-6 bg-bg-surface/40 p-8 rounded-3xl border border-border/30 backdrop-blur-sm">
                            <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={12} />
                                Up Next
                            </h3>
                            <div className="flex flex-col">
                                {dDays.slice(0, 3).map(day => (
                                    <div key={day.id} className="py-4 border-b border-border/30 flex items-center justify-between group last:border-0">
                                        <div className="overflow-hidden mr-2">
                                            <p className="text-[13px] font-medium text-text-primary group-hover:text-accent transition-colors truncate">{day.title}</p>
                                            <p className="text-[10px] text-text-tertiary mt-1">{new Date(day.target_date).toLocaleDateString()}</p>
                                        </div>
                                        <span className="text-sm font-bold text-text-secondary font-mono flex-shrink-0 bg-bg-surface/50 px-3 py-1 rounded-full">
                                            {calculateDaysLeft(day.target_date)}d
                                        </span>
                                    </div>
                                ))}
                                {dDays.length === 0 && <span className="text-xs text-text-tertiary italic opacity-40">No upcoming dates.</span>}
                            </div>
                        </div>

                        {/* Goals/Tasks */}
                        <div className="space-y-6 bg-bg-surface/40 p-8 rounded-3xl border border-border/30 backdrop-blur-sm">
                            <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 size={12} />
                                Today's Goals
                            </h3>
                            <div className="flex flex-col gap-1">
                                {tasks.slice(0, 5).map(task => (
                                    <button key={task.id} className="flex items-start gap-3 py-3 text-left group hover:bg-bg-hover -mx-2 px-2 rounded-xl transition-all">
                                        <div className={cn("mt-0.5", task.completed ? "text-accent" : "text-border group-hover:text-text-secondary")}>
                                            {task.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                        </div>
                                        <span className={cn("text-[13px] leading-relaxed", task.completed ? "text-text-tertiary line-through" : "text-text-secondary group-hover:text-text-primary")}>
                                            {task.title}
                                        </span>
                                    </button>
                                ))}
                                {tasks.length === 0 && <span className="text-xs text-text-tertiary italic opacity-40">No goals set for today.</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal for Stopping */}
            <AnimatePresence>
                {showStopConfirmation && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-primary/80 backdrop-blur-md p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-bg-surface border border-border p-10 rounded-3xl shadow-2xl max-w-md w-full text-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                                <Pause size={40} className="text-red-500" />
                            </div>
                            <h2 className="text-2xl font-black text-text-primary mb-4 uppercase tracking-tighter">Exit session prematurely?</h2>
                            <p className="text-text-secondary text-sm mb-10 leading-relaxed font-medium">
                                Ending early will reset your progress for this session and could break your daily momentum. Are you sure you want to stop?
                            </p>                                <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => setShowStopConfirmation(false)}
                                    className="w-full py-4 bg-text-primary text-bg-primary font-black uppercase tracking-widest rounded-2xl hover:bg-text-secondary transition-colors"
                                >
                                    Keep Focusing
                                </button>
                                <button
                                    onClick={() => handleSessionComplete(false, true)}
                                    className="w-full py-4 bg-transparent text-text-tertiary font-bold uppercase tracking-widest rounded-2xl hover:text-red-500 transition-colors"
                                >
                                    End Session Anyway
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reuse Stats Modal Logic */}
            <AnimatePresence>
                {showStats && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm"
                        onClick={() => setShowStats(false)}
                    >
                        <div className="bg-bg-surface border border-border p-8 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-bold text-text-primary">Study Insights</h2>
                                <button onClick={() => setShowStats(false)} className="text-text-secondary hover:text-text-primary">Close</button>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-text-tertiary mb-4">Today's Focus</h3>
                                    {stats.subjectData.map(item => (
                                        <div key={item.name} className="flex items-center justify-between py-2 border-b border-border/50">
                                            <span className="text-sm text-text-secondary">{item.name}</span>
                                            <span className="text-sm font-mono text-text-primary">{formatDuration(item.duration)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-text-tertiary mb-4">Activity</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {stats.heatmap.map((day, i) => (
                                            <div key={i} className="w-6 h-6 rounded-sm bg-accent" style={{ opacity: day.duration ? 0.2 + (day.duration / 10000) : 0.1 }} title={`${day.date}: ${formatDuration(day.duration)}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
