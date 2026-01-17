import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Settings, BookOpen, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GradeSettingsDialog } from '../features/courses/GradeSettingsDialog';
import { CourseGradeDialog } from '../features/courses/CourseGradeDialog';
import { GradingScale, ProjectionResult, GradeSummary, Semester, SemesterGpa, Program } from '../types/grading';
import { AcademicOnboardingWizard } from '../features/courses/AcademicOnboardingWizard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatsGrid } from '../features/courses/components/StatsGrid';
import { PerformanceTimeline } from '../features/courses/components/PerformanceTimeline';
import { CourseList } from '../features/courses/components/CourseList';
import { PastSemesterList } from '../features/courses/components/PastSemesterList';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';


interface ExtendedRepository {
    id: number;
    name: string;
    code?: string;
    credits: number;
    description?: string;
    semester_id?: number | null;
    manual_grade?: number | null;
    status: string;
    component_config?: string | null;
    component_scores?: string | null;
    grading_scale_id?: number | null;
}

export function Grades() {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [courses, setCourses] = useState<ExtendedRepository[]>([]);
    const [summary, setSummary] = useState<GradeSummary>({ cgpa: 0, total_credits: 0, semester_gpas: [] });
    const [projection, setProjection] = useState<ProjectionResult | null>(null);
    const [scales, setScales] = useState<GradingScale[]>([]);

    // Dialog States
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<ExtendedRepository | null>(null);
    const [isAddingSemester, setIsAddingSemester] = useState(false);
    const [newSemesterName, setNewSemesterName] = useState('');
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Planner Confirm State
    const [confirmStudy, setConfirmStudy] = useState<{ hours: number, courseId: number, courseName: string } | null>(null);


    // Error and Loading States
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { profile } = { profile: { name: 'Student' } }; // Mock

    // Helper function to add timeout to promises
    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, commandName: string): Promise<T> => {
        return Promise.race([
            promise,
            new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error(`${commandName} timed out after ${timeoutMs}ms`)), timeoutMs)
            )
        ]);
    };

    const refreshAll = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            console.log('[Grades] Starting data refresh...');

            console.log('[Grades] Fetching all data in parallel...');
            await Promise.all([
                withTimeout(fetchScales(), 5000, 'fetchScales'),
                withTimeout(fetchData(), 5000, 'fetchData'),
                withTimeout(fetchSummary(), 10000, 'fetchSummary'),
                withTimeout(fetchProjection(), 10000, 'fetchProjection'),
            ]);
            console.log('[Grades] ✓ All data loaded');

            // Check Onboarding Status
            const userProgram = await invoke<Program | null>('get_user_program');
            if (!userProgram) {
                console.log('[Grades] No user program found, triggering onboarding');
                setShowOnboarding(true);
            }

            console.log('[Grades] All data loaded successfully');
        } catch (e: any) {
            console.error('[Grades] Error refreshing data:', e);
            const errorMsg = e?.message || e?.toString() || 'Unknown error';
            setError(errorMsg.includes('timed out')
                ? `Request timed out: ${errorMsg}. The backend may be unresponsive.`
                : 'Failed to load grades data. Please check your settings.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    async function fetchScales() {
        try {
            console.log('[Grades] → Invoking get_grading_scales');
            const s = await invoke<GradingScale[]>('get_grading_scales');
            setScales(s);
        } catch (e) {
            console.error('[Grades] Scale fetch failed:', e);
            throw e;
        }
    }

    async function fetchData() {
        try {
            console.log('[Grades] → Invoking get_semesters');
            const s = await invoke<Semester[]>('get_semesters');
            console.log('[Grades] → Invoking get_repositories');
            const c = await invoke<ExtendedRepository[]>('get_repositories');
            setSemesters(s);
            setCourses(c);
        } catch (e) {
            console.error('[Grades] Data fetch failed:', e);
            throw e;
        }
    }

    async function fetchSummary() {
        try {
            console.log('[Grades] → Invoking get_gpa_summary');
            const sum = await invoke<GradeSummary>('get_gpa_summary');
            setSummary(sum);
        } catch (e) {
            console.error('[Grades] Summary fetch failed:', e);
            throw e;
        }
    }

    async function fetchProjection() {
        try {
            console.log('[Grades] → Invoking project_grades');
            const proj = await invoke<ProjectionResult>('project_grades');
            setProjection(proj);
        } catch (e) {
            console.error('[Grades] Projection fetch failed:', e);
            throw e;
        }
    }


    async function handleAddSemester() {
        if (!newSemesterName.trim()) return;
        try {
            await invoke('create_semester', { name: newSemesterName });
            setNewSemesterName('');
            setIsAddingSemester(false);
            refreshAll();
        } catch (e) {
            console.error(e);
            alert('Failed to add semester');
        }
    }

    async function addStudyGoals(repositoryId: number, credits: number) {
        if (!projection || !projection.target_cgpa) {
            alert("Please set a Target GPA first to generate study estimates.");
            return;
        }

        try {
            const courseName = courses.find(c => c.id === repositoryId)?.name || 'Course';

            // Backend Estimation
            const estimatedHours = await invoke<number>('estimate_study_hours', {
                credits,
                targetGpa: projection.target_cgpa,
                maxScalePoint: scales[0]?.config?.max_point || 10.0 // Default to 10 if no scale
            });

            setConfirmStudy({
                hours: estimatedHours,
                courseId: repositoryId,
                courseName
            });
        } catch (e) {
            console.error('[Grades] Estimation failed:', e);
            // Fallback
            const fallbackHours = Math.ceil(credits * 2);
            setConfirmStudy({
                hours: fallbackHours,
                courseId: repositoryId,
                courseName: courses.find(c => c.id === repositoryId)?.name || 'Course'
            });
        }
    }

    async function handleConfirmStudyAdd() {
        if (!confirmStudy) return;
        try {
            await invoke('add_study_tasks_to_planner', {
                courseId: confirmStudy.courseId,
                hoursPerWeek: confirmStudy.hours
            });
            alert(`Added ${confirmStudy.hours} hours/week of study sessions to your planner!`);
            setConfirmStudy(null);
        } catch (e) {
            console.error('[Grades] Failed to add study tasks:', e);
            alert('Failed to add study goals');
        }
    }

    // Helper to get grade color
    const getGradeColor = (grade?: number | null) => {
        if (grade === null || grade === undefined || isNaN(grade)) return "bg-text-tertiary/10 text-text-tertiary";
        if (grade >= 9.0 || grade >= 3.7) return "bg-green-500/20 text-green-400"; // Generic heuristic for 10/4
        if (grade >= 7.0 || grade >= 3.0) return "bg-blue-500/20 text-blue-400";
        if (grade >= 5.0 || grade >= 2.0) return "bg-yellow-500/20 text-yellow-400";
        return "bg-red-500/20 text-red-400";
    };

    const getGradeDisplay = (grade?: number | null) => {
        if (grade === null || grade === undefined || isNaN(grade)) return "-";
        return grade.toFixed(1);
    };

    // Segment logic
    const currentSemesterId = semesters.length > 0 ? semesters[0].id : null;
    const { currentCourses, pastSemesters, displayChart } = useMemo(() => {
        const coursesBySemester: Record<number, ExtendedRepository[]> = {};
        courses.forEach((c: ExtendedRepository) => {
            if (c.semester_id) {
                if (!coursesBySemester[c.semester_id]) coursesBySemester[c.semester_id] = [];
                coursesBySemester[c.semester_id].push(c);
            }
        });

        const currentCourses = currentSemesterId ? (coursesBySemester[currentSemesterId] || []) : [];

        // Only show past semesters that have actual GPA data
        const pastSemesters = semesters.filter((s: Semester) => {
            if (s.id === currentSemesterId) return false;
            const hasGpa = summary.semester_gpas.some((g: SemesterGpa) => g.semester_id === s.id);
            return hasGpa;
        });

        // Chart Data: Only show semesters with actual GPA + future projections
        const allChartSemesters: { val: number, label: string, isFuture: boolean, id?: number }[] = [];

        // 1. Add only semesters that have GPA data
        const sortedExistingSems = [...semesters].sort((a: Semester, b: Semester) => a.id - b.id);
        sortedExistingSems.forEach((s: Semester) => {
            const gpaData = summary.semester_gpas.find((g: SemesterGpa) => g.semester_id === s.id);
            if (gpaData && gpaData.gpa > 0) { // Only add if there's actual GPA data
                allChartSemesters.push({
                    val: gpaData.gpa,
                    label: s.name,
                    isFuture: false,
                    id: s.id
                });
            }
        });

        // 2. Add future projections if target is set
        if (projection && projection.target_cgpa && projection.horizon && projection.horizon > 0) {
            const requiredGpa = projection.required_future_gpa || 0;
            for (let i = 1; i <= Math.min(projection.horizon, 6); i++) { // Limit to 6 future semesters
                allChartSemesters.push({
                    val: requiredGpa,
                    label: `Sem +${i}`,
                    isFuture: true
                });
            }
        }

        const displayChart = allChartSemesters;

        return { coursesBySemester, currentCourses, pastSemesters, displayChart };
    }, [courses, semesters, summary, projection, currentSemesterId]);

    if (error && !isLoading) {
        return (
            <div className="relative w-full h-full overflow-hidden bg-bg-primary flex items-center justify-center">
                <div className="glass-card p-8 rounded-lg border border-red-500/20 bg-red-500/5 max-w-md text-center">
                    <h2 className="text-xl font-bold text-red-400 mb-4">Unable to Load Grades</h2>
                    <p className="text-text-secondary mb-6">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="px-4 py-2 bg-accent/10 border border-accent/20 text-accent rounded-lg hover:bg-accent/20 transition-all font-medium text-sm"
                        >
                            Open Settings
                        </button>
                        <button onClick={refreshAll} className="px-4 py-2 bg-white/5 border border-white/10 text-text-secondary rounded-lg hover:bg-white/10 transition-all font-medium text-sm">Retry</button>
                    </div>
                </div>
                <GradeSettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onSave={refreshAll} />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="relative w-full h-full overflow-hidden bg-bg-primary flex flex-col items-center justify-center p-10">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                        <motion.div
                            className="absolute inset-0 rounded-full border-2 border-accent/20"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-text-primary mb-2">Calculating Statistics</h2>
                    <p className="text-text-secondary font-mono text-sm">Synthesizing your academic journey...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto custom-scrollbar p-6 md:p-10 bg-bg-primary/30">
            <AnimatePresence>
                <GradeSettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onSave={refreshAll} />
                {editingCourse && (
                    <CourseGradeDialog
                        isOpen={!!editingCourse}
                        course={editingCourse}
                        onClose={() => setEditingCourse(null)}
                        onUpdate={refreshAll}
                        scales={scales}
                    />
                )}
            </AnimatePresence>

            <AcademicOnboardingWizard
                isOpen={showOnboarding}
                onComplete={() => {
                    setShowOnboarding(false);
                    refreshAll();
                }}
            />

            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4"
            >
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(22,163,74,0.6)]"
                        />
                        <h1 className="text-3xl font-bold text-text-primary">Academic Performance</h1>
                    </div>
                    <p className="text-text-secondary text-sm">Analytics and projections for {profile?.name || 'Student'}.</p>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center gap-2 bg-bg-surface/50 border border-border/50 hover:border-accent/30 transition-all"
                    >
                        <Settings size={18} />
                        <span className="text-sm">Settings</span>
                    </Button>
                    <Button variant="primary" onClick={() => setIsAddingSemester(true)} className="flex items-center gap-2">
                        <Plus size={18} />
                        <span>Add Semester</span>
                    </Button>
                </div>
            </motion.div>

            {/* Stats Overview */}
            <StatsGrid
                summary={summary}
                scales={scales}
                currentCourses={currentCourses}
                projection={projection}
                refreshAll={refreshAll}
                invoke={invoke}
            />

            {/* Projection Chart & Timeline */}
            <PerformanceTimeline
                displayChart={displayChart}
                scales={scales}
                projection={projection}
            />

            {isAddingSemester && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-bg-surface/80 backdrop-blur-md rounded-2xl border border-accent/50 p-4 shadow-2xl mb-8"
                >
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex-1 w-full">
                            <label className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1 block">New Semester Name</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="e.g. Winter 2026 or Semester 4"
                                className="w-full bg-bg-primary/50 border border-border rounded-xl px-4 py-2 text-sm outline-none focus:border-accent transition-all text-white"
                                value={newSemesterName}
                                onChange={(e) => setNewSemesterName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSemester()}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto self-end">
                            <Button variant="ghost" onClick={() => setIsAddingSemester(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleAddSemester} disabled={!newSemesterName.trim()}>Initialize Semester</Button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Current Courses Section */}
            <div className="flex flex-col mb-10">
                <div className="flex items-center justify-between mb-6 px-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
                            <BookOpen size={20} className="text-accent" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-text-primary uppercase tracking-wider font-mono">Current Courses</h3>
                            <p className="text-[10px] text-text-tertiary">Ongoing academic credit units</p>
                        </div>
                    </div>
                    {currentSemesterId && (
                        <Badge variant="outline" className="font-mono text-[10px] uppercase opacity-70">
                            {semesters.find(s => s.id === currentSemesterId)?.name}
                        </Badge>
                    )}
                </div>
                <CourseList
                    courses={currentCourses}
                    onEditCourse={setEditingCourse}
                    getGradeColor={getGradeColor}
                    getGradeDisplay={getGradeDisplay}
                    addStudyGoals={addStudyGoals}
                    requiredFutureGpa={projection?.required_future_gpa}
                />
            </div>

            {/* Past Semesters Section */}
            {pastSemesters.length > 0 && (
                <div className="flex flex-col mb-10">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <TrendingUp size={20} className="text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-text-primary uppercase tracking-wider font-mono">Academic History</h3>
                                <p className="text-[10px] text-text-tertiary">Completed semesters and performance trends</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase opacity-70">
                            {pastSemesters.length} {pastSemesters.length === 1 ? 'Semester' : 'Semesters'}
                        </Badge>
                    </div>
                    <PastSemesterList
                        pastSemesters={pastSemesters}
                        summary={summary}
                        getGradeColor={getGradeColor}
                    />
                </div>
            )}

            {/* Confirm Dialog for Study Goals */}
            {confirmStudy && (
                <ConfirmDialog
                    isOpen={!!confirmStudy}
                    title="Add Study Goals to Planner"
                    description={`Based on your target GPA of ${projection?.target_cgpa || '?'}, we estimate you need ${confirmStudy.hours} hours/week for ${confirmStudy.courseName}. Add to planner?`}
                    confirmText="Add to Planner"
                    onConfirm={handleConfirmStudyAdd}
                    onCancel={() => setConfirmStudy(null)}
                />
            )}
        </div>
    );
}
