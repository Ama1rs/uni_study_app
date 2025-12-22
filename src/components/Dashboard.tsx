import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Calendar, BookOpen, Upload, Search as SearchIcon, PanelRightOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { MetricsSidebar } from './MetricsSidebar';
import { useUserProfile } from '../contexts/UserProfileContext';
import { containerVariants, itemVariants } from '../lib/animations';

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
                <motion.div 
                    className="flex-1 max-w-3xl mx-auto px-4 py-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* Header with Toggle */}
                    <motion.div 
                        className="flex items-start justify-between mb-12"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.15 }}
                        >
                            <motion.h1 
                                className="text-5xl font-bold mb-3" 
                                style={{ color: 'var(--text-primary)' }}
                                animate={{ scale: [1, 1.02, 1] }}
                                transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
                            >
                                {greeting}, {profile?.name?.split(' ')[0] || 'Student'}
                            </motion.h1>
                            <motion.p 
                                className="text-lg" 
                                style={{ color: 'var(--text-secondary)' }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.25 }}
                            >
                                Ready to make some progress today?
                            </motion.p>
                        </motion.div>
                        <AnimatePresence>
                            {!showMetrics && (
                                <motion.button
                                    onClick={() => setShowMetrics(true)}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                    style={{ color: 'var(--text-secondary)' }}
                                    title="Show Metrics"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <PanelRightOpen size={24} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Today's Focus */}
                    <motion.section 
                        className="mb-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Today's Focus</h2>
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>3 tasks remaining</span>
                        </div>
                        <motion.div 
                            className="rounded-2xl p-6 border shadow-sm" 
                            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                            whileHover={{ y: -4 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Prepare for Biology Midterm</h3>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>9:00 AM - 11:00 AM</p>
                                </motion.div>
                                <motion.button
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all shadow-lg shadow-blue-500/20"
                                    style={{ backgroundColor: 'var(--accent)' }}
                                    whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 255, 0.4)' }}
                                    whileTap={{ scale: 0.95 }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.35 }}
                                >
                                    Start Session
                                </motion.button>
                            </div>

                            <motion.div 
                                className="space-y-3"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <TaskItem completed text="Review Chapters 4-6" />
                                <TaskItem text="Complete practice questions" />
                                <TaskItem text="Summarize key concepts" />
                            </motion.div>
                        </motion.div>
                    </motion.section>

                    {/* Upcoming Deadlines */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                    >
                        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Upcoming Deadlines</h2>
                        <motion.div 
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <DeadlineCard title="History Essay" course="History 101" daysLeft={3} />
                            <DeadlineCard title="Quantum Physics Problem Set" course="Physics 305" daysLeft={5} />
                            <DeadlineCard title="Final Project Proposal" course="CS 450" daysLeft={6} />
                        </motion.div>
                    </motion.section>
                </motion.div>

                {/* Right Sidebar - Metrics */}
                <MetricsSidebar isOpen={showMetrics} onToggle={() => setShowMetrics(!showMetrics)} />
            </div>

            {/* Dock - Quick Access */}
            <AnimatePresence>
                {showDock && (
                    <motion.div
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        transition={{ duration: 0.4 }}
                    >
                        <motion.div
                            className="flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl"
                            style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border)',
                                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)'
                            }}
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                        >
                            <DockItem icon={Calendar} label="Plan" />
                            <DockItem icon={BookOpen} label="Study" />
                            <div className="w-px h-8 mx-1" style={{ backgroundColor: 'var(--border)' }} />
                            <DockItem icon={Upload} label="Upload" />
                            <DockItem icon={SearchIcon} label="Search" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TaskItem({ completed = false, text }: { completed?: boolean; text: string }) {
    return (
        <motion.div 
            className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/5"
            variants={itemVariants}
            whileHover={{ x: 4 }}
        >
            <motion.div
                animate={{ scale: completed ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
            >
                {completed ? (
                    <CheckCircle2 size={20} style={{ color: 'var(--accent)' }} />
                ) : (
                    <Circle size={20} style={{ color: 'var(--border-light)' }} />
                )}
            </motion.div>
            <span
                className={cn("text-sm font-medium", completed && "line-through opacity-50")}
                style={{ color: 'var(--text-primary)' }}
            >
                {text}
            </span>
        </motion.div>
    );
}

function DockItem({ icon: Icon, label }: { icon: any; label: string }) {
    return (
        <motion.button
            className="group relative p-3 rounded-xl transition-all"
            whileHover={{ y: -8, scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
        >
            <Icon size={24} style={{ color: 'var(--text-primary)' }} />
            <motion.span
                className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                initial={{ opacity: 0, y: 5 }}
                whileHover={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {label}
            </motion.span>
        </motion.button>
    );
}

function DeadlineCard({ title, course, daysLeft }: { title: string; course: string; daysLeft: number }) {
    return (
        <motion.div 
            className="p-4 rounded-xl border flex items-center justify-between group hover:border-blue-500/50 transition-colors" 
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            variants={itemVariants}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{course}</p>
            </motion.div>
            <motion.span
                className="text-xs font-bold px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--accent)', backgroundColor: 'var(--bg-primary)' }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                {daysLeft} days left
            </motion.span>
        </motion.div>
    );
}
