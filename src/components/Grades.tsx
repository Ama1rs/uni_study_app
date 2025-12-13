import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, ChevronRight, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { GradeSettingsDialog } from './GradeSettingsDialog';
import { CourseGradeDialog } from './CourseGradeDialog';
import { GradingScale, ProjectionResult, GradeSummary, Semester } from '../types/grading';

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
    const [summary, setSummary] = useState<GradeSummary>({ cgpa: 0, total_credits: 0, points_secured: 0, semester_gpas: [] });
    const [projection, setProjection] = useState<ProjectionResult | null>(null);
    const [scales, setScales] = useState<GradingScale[]>([]);

    // Dialog States
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<ExtendedRepository | null>(null);
    const [isAddingSemester, setIsAddingSemester] = useState(false);
    const [newSemesterName, setNewSemesterName] = useState('');

    const { profile } = { profile: { name: 'Student' } }; // Mock

    useEffect(() => {
        refreshAll();
    }, []);

    const refreshAll = () => {
        fetchData();
        fetchSummary();
        fetchProjection();
        fetchScales();
    };

    async function fetchScales() {
        try {
            const s = await invoke<GradingScale[]>('get_grading_scales');
            setScales(s);
        } catch (e) { console.error(e); }
    }

    async function fetchData() {
        try {
            const sems = await invoke<Semester[]>('get_semesters');
            const repos = await invoke<ExtendedRepository[]>('get_repositories');
            setSemesters(sems);
            setCourses(repos);
        } catch (error) {
            console.error('Failed to fetch grades data:', error);
        }
    }

    async function fetchSummary() {
        try {
            const sum = await invoke<GradeSummary>('get_gpa_summary');
            setSummary(sum);
        } catch (error) {
            // console.error('Failed to fetch summary (might be empty):', error);
        }
    }

    async function fetchProjection() {
        try {
            const proj = await invoke<ProjectionResult>('project_grades');
            setProjection(proj);
        } catch (e) { console.error("Projection fail", e); }
    }

    async function handleAddSemester() {
        if (!newSemesterName.trim()) return;
        try {
            await invoke('create_semester', {
                name: newSemesterName,
                planned_credits: 30.0
            });
            setNewSemesterName('');
            setIsAddingSemester(false);
            fetchData();
        } catch (e) {
            console.error("Failed to create semester", e);
        }
    }

    // Helper to get grade color
    const getGradeColor = (grade?: number | null) => {
        if (grade === null || grade === undefined) return "bg-gray-500/20 text-gray-400";
        if (grade >= 9.0 || grade >= 3.7) return "bg-green-500/20 text-green-400"; // Generic heuristic for 10/4
        if (grade >= 7.0 || grade >= 3.0) return "bg-blue-500/20 text-blue-400";
        if (grade >= 5.0 || grade >= 2.0) return "bg-yellow-500/20 text-yellow-400";
        return "bg-red-500/20 text-red-400";
    };

    const getGradeDisplay = (grade?: number | null) => {
        if (grade === null || grade === undefined) return "-";
        return grade.toFixed(1); // Just show number for now, letter mapping requires scale context which is complex here
    };

    // Segment logic
    const currentSemesterId = semesters.length > 0 ? semesters[0].id : null;
    const coursesBySemester: Record<number, ExtendedRepository[]> = {};
    courses.forEach(c => {
        if (c.semester_id) {
            if (!coursesBySemester[c.semester_id]) coursesBySemester[c.semester_id] = [];
            coursesBySemester[c.semester_id].push(c);
        }
    });

    const currentCourses = currentSemesterId ? (coursesBySemester[currentSemesterId] || []) : [];
    const pastSemesters = semesters.filter(s => s.id !== currentSemesterId);

    // Chart Data
    const chartData = [
        ...summary.semester_gpas.map((g) => ({ val: g.gpa, label: g.semester_name, isFuture: false })),
        ...(projection && projection.credits_remaining > 0 ? Array.from({ length: Math.ceil(projection.credits_remaining / 20) }).map(() => ({ // Heuristic: 20 creds/sem
            val: projection.required_future_gpa,
            label: `Future`,
            isFuture: true
        })) : [])
    ];

    const displayChart = chartData.length > 8 ? [...chartData.slice(0, 4), ...chartData.slice(-4)] : chartData;

    return (
        <div className="relative w-full h-full overflow-hidden bg-bg-primary">
            {/* Dialogs */}
            <GradeSettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={refreshAll}
            />

            {editingCourse && (
                <CourseGradeDialog
                    isOpen={!!editingCourse}
                    course={editingCourse}
                    onClose={() => setEditingCourse(null)}
                    onUpdate={refreshAll}
                    scales={scales}
                />
            )}

            <div className="relative z-10 flex flex-col h-full min-w-0 overflow-y-auto px-8 py-6">

                {/* Header Section */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary mb-1">
                            Good afternoon, {profile?.name?.split(' ')[0] || 'User'}.
                        </h1>
                        <p className="text-text-secondary text-sm">Ready to expand your knowledge?</p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-text-secondary transition-colors"
                        >
                            <Settings size={18} />
                        </button>
                    </div>
                </div>

                {/* Top Stats Row */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="glass-card px-4 py-3 rounded-lg flex items-center gap-3">
                        <div className="p-1.5 bg-accent/10 rounded text-accent">
                            <span className="font-bold text-lg">G</span>
                        </div>
                        <div>
                            <p className="text-xs text-text-tertiary font-mono uppercase tracking-wider">CGPA</p>
                            <p className="text-xl font-medium text-text-primary font-mono">{summary.cgpa.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="glass-card px-4 py-3 rounded-lg flex items-center gap-3">
                        <div className="p-1.5 bg-blue-500/10 rounded text-blue-400">
                            <span className="font-bold text-lg">C</span>
                        </div>
                        <div>
                            <p className="text-xs text-text-tertiary font-mono uppercase tracking-wider">Credits</p>
                            <p className="text-xl font-medium text-text-primary font-mono">{summary.total_credits}</p>
                        </div>
                    </div>

                    <div className="md:flex items-center gap-4 flex-1 justify-end hidden">
                        <div className="glass-card px-3 py-2 rounded-lg flex items-center gap-3 border border-border/50">
                            <div className="p-1.5 bg-purple-500/10 rounded text-purple-400">
                                <span className="font-bold text-lg">P</span>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">Target</p>
                                <input
                                    className="w-12 bg-transparent text-lg font-medium text-text-primary font-mono outline-none border-b border-transparent focus:border-purple-500/50 transition-colors"
                                    defaultValue={projection?.target_cgpa || 9.0}
                                    onBlur={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) invoke('save_projection_settings', { target_cgpa: val, horizon: projection?.horizon });
                                        // Trigger refresh after brief delay or immediately
                                        setTimeout(refreshAll, 100);
                                    }}
                                />
                            </div>
                        </div>

                        <div className="glass-card px-3 py-2 rounded-lg flex items-center gap-3 border border-border/50">
                            <div className="p-1.5 bg-text-tertiary/10 rounded text-text-tertiary">
                                <span className="font-bold text-lg">#</span>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">Horizon</p>
                                <div className="flex items-center gap-1">
                                    <input
                                        className="w-8 bg-transparent text-lg font-medium text-text-primary font-mono outline-none border-b border-transparent focus:border-purple-500/50 transition-colors"
                                        defaultValue={projection?.credits_remaining ? Math.ceil(projection.credits_remaining / 20) : (160 / 20)} // Mock horizon calc
                                        onBlur={(e) => {
                                            const val = parseInt(e.target.value);
                                            // Backend uses 'horizon' as INTEGER (semesters? or credits? implementation plan said semesters, backend logic ignored it in calc actually? No it used horizon from DB)
                                            // Wait, `project_grades` logic uses `program_credits - points`. Horizon is for Viz?
                                            if (!isNaN(val)) invoke('save_projection_settings', { target_cgpa: projection?.target_cgpa, horizon: val });
                                            setTimeout(refreshAll, 100);
                                        }}
                                    />
                                    <span className="text-[10px] text-text-tertiary uppercase">Sems</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-8 w-px bg-border/50 mx-2"></div>

                        <div className="text-right">
                            <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider mb-0.5">Required Future GPA</p>
                            <div className="flex items-center gap-2 justify-end">
                                {projection ? (
                                    <span className={cn("font-bold font-mono text-lg", projection.required_future_gpa > 10.0 ? "text-red-400" : "text-accent")}>
                                        {projection.required_future_gpa.toFixed(2)}
                                    </span>
                                ) : (
                                    <span className="text-text-tertiary">-</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsAddingSemester(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 text-accent rounded-lg hover:bg-accent/20 transition-all font-medium text-sm font-mono ml-4"
                    >
                        <Plus size={14} />
                        ADD SEMESTER
                    </button>
                </div>

                {/* Projections / Timeline Section */}
                <div className="mb-6 glass-card p-4 rounded-lg border border-white/5 relative overflow-hidden group">
                    {/* ... Tooltip ... */}
                    <div className="flex items-start gap-8">
                        <div className="flex-1">
                            <h3 className="font-medium text-xs text-text-tertiary uppercase tracking-wider font-mono mb-4">Projection Timeline</h3>
                            <div className="h-24 w-full flex items-end gap-1 relative pl-2 border-l border-white/5">
                                {displayChart.map((item, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group/bar relative">
                                        <div
                                            className={cn(
                                                "w-full rounded-t-sm transition-all relative group-hover/bar:bg-opacity-80",
                                                item.val > 10.0 ? "bg-red-500/20" :
                                                    item.isFuture ? "bg-purple-500/20 border-t border-purple-500/50" : "bg-white/10"
                                            )}
                                            style={{
                                                height: `${Math.min(100, (item.val / 10) * 100)}%`
                                            }}
                                        >
                                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 whitespace-nowrap z-10 font-mono">
                                                {item.val.toFixed(2)}
                                            </div>
                                        </div>
                                        <span className="text-[8px] text-text-tertiary font-mono truncate w-full text-center">{item.label}</span>
                                    </div>
                                ))}
                                {projection && (
                                    <div
                                        className="absolute w-full h-px bg-purple-500/30 border-t border-dashed border-purple-500/50 flex items-center transition-all duration-500"
                                        style={{ bottom: `${(projection.target_cgpa / 10) * 100}%` }}
                                    >
                                        <span className="text-[9px] text-purple-400 font-mono bg-bg-primary px-1 ml-1 -mt-2">Target {projection.target_cgpa}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="w-64 border-l border-white/5 pl-8">
                            <h3 className="font-medium text-xs text-text-tertiary uppercase tracking-wider font-mono mb-3">Feasibility</h3>
                            <div className="space-y-3">

                                <div className="w-full bg-white/5 rounded-full h-1 mt-2">
                                    <div
                                        className={cn("h-full rounded-full", projection?.feasible ? "bg-accent" : "bg-red-500")}
                                        style={{ width: projection?.feasible ? '40%' : '100%' }}
                                    ></div>
                                </div>
                                <p className="text-[10px] text-text-tertiary italic mt-1">
                                    {projection?.message}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {isAddingSemester && (
                    <div className="bg-bg-surface rounded-lg border border-accent/50 p-3 shadow-lg mb-4 animate-in slide-in-from-top-2 fade-in">
                        <div className="flex gap-2">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Semester Name"
                                className="flex-1 bg-bg-primary border border-border rounded px-3 py-1.5 text-sm outline-none focus:border-accent text-white"
                                value={newSemesterName}
                                onChange={(e) => setNewSemesterName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSemester()}
                            />
                            <button onClick={handleAddSemester} disabled={!newSemesterName.trim()} className="px-3 py-1.5 bg-accent text-black rounded text-xs font-bold uppercase tracking-wide">Save</button>
                            <button onClick={() => setIsAddingSemester(false)} className="px-3 py-1.5 text-text-secondary hover:bg-white/5 rounded text-xs font-medium">Cancel</button>
                        </div>
                    </div>
                )}

                <div className="flex-1 flex gap-6 min-h-0">
                    {/* Current Courses */}
                    <div className="glass-card p-0 rounded-lg overflow-hidden flex flex-col flex-1">
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-white/[0.02]">
                            <h3 className="font-medium text-xs text-text-tertiary uppercase tracking-wider font-mono">Current Courses</h3>
                            {currentSemesterId && (
                                <span className="text-[10px] font-mono text-text-tertiary px-1.5 py-0.5 border border-border rounded opacity-60">
                                    {semesters.find(s => s.id === currentSemesterId)?.name}
                                </span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {/* Header Row */}
                            <div className="grid grid-cols-12 gap-2 text-[10px] text-text-tertiary uppercase font-bold tracking-wider px-3 py-2 border-b border-border/50 mb-1 font-mono opacity-70">
                                <div className="col-span-8">Course</div>
                                <div className="col-span-2 text-center">Cr</div>
                                <div className="col-span-2 text-center">Gr</div>
                            </div>

                            <div className="space-y-0.5">
                                {currentCourses.length === 0 ? (
                                    <div className="text-center text-text-tertiary py-8 italic text-xs">No courses in current semester</div>
                                ) : (
                                    currentCourses.map(course => (
                                        <div
                                            key={course.id}
                                            className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-white/5 rounded transition-colors group cursor-pointer"
                                            onClick={() => setEditingCourse(course)}
                                        >
                                            <div className="col-span-8">
                                                <div className="font-medium text-sm text-white/90 truncate">{course.name}</div>
                                                <div className="text-[10px] text-text-tertiary">{course.code || 'NO CODE'}</div>
                                            </div>
                                            <div className="col-span-2 text-center text-text-secondary text-xs">
                                                {course.credits}
                                            </div>
                                            <div className="col-span-2 flex justify-center items-center">
                                                <div className={cn(
                                                    "w-8 h-6 rounded flex items-center justify-center font-bold text-xs border border-white/5 font-mono",
                                                    getGradeColor(course.manual_grade)
                                                )}>
                                                    {getGradeDisplay(course.manual_grade)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Past Semesters */}
                    <div className="glass-card p-0 rounded-lg overflow-hidden flex flex-col flex-1">
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-white/[0.02]">
                            <h3 className="font-medium text-xs text-text-tertiary uppercase tracking-wider font-mono">Past Semesters</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {/* Header Row */}
                            <div className="grid grid-cols-12 gap-2 text-[10px] text-text-tertiary uppercase font-bold tracking-wider px-3 py-2 border-b border-border/50 mb-1 font-mono opacity-70">
                                <div className="col-span-6">Semester</div>
                                <div className="col-span-3 text-center">Credits</div>
                                <div className="col-span-3 text-right">GPA</div>
                            </div>
                            <div className="space-y-0.5">
                                {pastSemesters.map(sem => {
                                    const semGpa = summary.semester_gpas.find(gp => gp.semester_id === sem.id);
                                    return (
                                        <div key={sem.id} className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-white/5 rounded transition-colors border border-transparent group">
                                            <div className="col-span-6 flex items-center gap-2">
                                                <ChevronRight size={12} className="text-text-tertiary group-hover:text-accent transition-colors" />
                                                <div className="font-medium text-sm text-white/90 group-hover:text-white">{sem.name}</div>
                                            </div>
                                            <div className="col-span-3 text-center text-text-secondary font-mono text-xs">
                                                {semGpa?.credits || 0}
                                            </div>
                                            <div className="col-span-3 text-right font-bold text-white font-mono text-xs">
                                                {semGpa?.gpa.toFixed(2) || "0.00"}
                                            </div>
                                        </div>
                                    );
                                })}
                                {pastSemesters.length === 0 && (
                                    <div className="text-center text-text-tertiary py-8 italic text-xs">No past semesters</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
