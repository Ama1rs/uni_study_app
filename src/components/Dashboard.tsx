import { useState, useRef } from 'react';
import { CheckCircle2, Circle, Calendar, BookOpen, Upload, Search as SearchIcon, PanelRightOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { MetricsSidebar } from './MetricsSidebar';
import { useUserProfile } from '../contexts/UserProfileContext';

export function Dashboard() {
    const { profile } = useUserProfile();
    const [showDock, setShowDock] = useState(true);
    const [showMetrics, setShowMetrics] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastScrollY = useRef(0);

    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const currentScrollY = scrollRef.current.scrollTop;

        // Hide dock when scrolling down, show when scrolling up or at bottom
        if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
            setShowDock(false);
        } else {
            setShowDock(true);
        }
        lastScrollY.current = currentScrollY;
    };

    return (
        <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 h-screen overflow-y-auto relative"
            style={{ backgroundColor: 'var(--bg-primary)' }}
        >
            <div className="flex min-h-full">
                {/* Main Content */}
                <div className="flex-1 max-w-3xl mx-auto px-4 py-8">
                    {/* Header with Toggle */}
                    <div className="flex items-start justify-between mb-12">
                        <div>
                            <h1 className="text-5xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                                {greeting}, {profile?.name?.split(' ')[0] || 'Student'}
                            </h1>
                            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                                Ready to make some progress today?
                            </p>
                        </div>
                        {!showMetrics && (
                            <button
                                onClick={() => setShowMetrics(true)}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                                title="Show Metrics"
                            >
                                <PanelRightOpen size={24} />
                            </button>
                        )}
                    </div>

                    {/* Today's Focus */}
                    <section className="mb-12">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Today's Focus</h2>
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>3 tasks remaining</span>
                        </div>
                        <div className="rounded-2xl p-6 border shadow-sm" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Prepare for Biology Midterm</h3>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>9:00 AM - 11:00 AM</p>
                                </div>
                                <button
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
                                    style={{ backgroundColor: 'var(--accent)' }}
                                >
                                    Start Session
                                </button>
                            </div>

                            <div className="space-y-3">
                                <TaskItem completed text="Review Chapters 4-6" />
                                <TaskItem text="Complete practice questions" />
                                <TaskItem text="Summarize key concepts" />
                            </div>
                        </div>
                    </section>

                    {/* Upcoming Deadlines */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Upcoming Deadlines</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DeadlineCard title="History Essay" course="History 101" daysLeft={3} />
                            <DeadlineCard title="Quantum Physics Problem Set" course="Physics 305" daysLeft={5} />
                            <DeadlineCard title="Final Project Proposal" course="CS 450" daysLeft={6} />
                        </div>
                    </section>
                </div>

                {/* Right Sidebar - Metrics */}
                <MetricsSidebar isOpen={showMetrics} onToggle={() => setShowMetrics(!showMetrics)} />
            </div>

            {/* Dock - Quick Access */}
            <div
                className={cn(
                    "fixed bottom-8 left-1/2 -translate-x-1/2 transition-all duration-500 ease-in-out z-50",
                    showDock ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
                )}
            >
                <div
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl"
                    style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border)',
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)'
                    }}
                >
                    <DockItem icon={Calendar} label="Plan" />
                    <DockItem icon={BookOpen} label="Study" />
                    <div className="w-px h-8 mx-1" style={{ backgroundColor: 'var(--border)' }} />
                    <DockItem icon={Upload} label="Upload" />
                    <DockItem icon={SearchIcon} label="Search" />
                </div>
            </div>
        </div>
    );
}

function TaskItem({ completed = false, text }: { completed?: boolean; text: string }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/5">
            {completed ? (
                <CheckCircle2 size={20} style={{ color: 'var(--accent)' }} />
            ) : (
                <Circle size={20} style={{ color: 'var(--border-light)' }} />
            )}
            <span
                className={cn("text-sm font-medium", completed && "line-through opacity-50")}
                style={{ color: 'var(--text-primary)' }}
            >
                {text}
            </span>
        </div>
    );
}

function DockItem({ icon: Icon, label }: { icon: any; label: string }) {
    return (
        <button
            className="group relative p-3 rounded-xl transition-all hover:bg-white/10 hover:-translate-y-1 active:scale-95"
        >
            <Icon size={24} style={{ color: 'var(--text-primary)' }} />
            <span
                className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
                {label}
            </span>
        </button>
    );
}

function DeadlineCard({ title, course, daysLeft }: { title: string; course: string; daysLeft: number }) {
    return (
        <div className="p-4 rounded-xl border flex items-center justify-between group hover:border-blue-500/50 transition-colors" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{course}</p>
            </div>
            <span
                className="text-xs font-bold px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--accent)', backgroundColor: 'var(--bg-primary)' }}
            >
                {daysLeft} days left
            </span>
        </div>
    );
}
