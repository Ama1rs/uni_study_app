import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, ChevronRight, Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface Semester {
    id: number;
    name: string;
    start_date?: string;
    end_date?: string;
    planned_credits: number;
}

interface Repository {
    id: number;
    name: string;
    code?: string;
    credits: number;
    semester_id?: number;
    manual_grade?: number;
    status: string;
}

interface SemesterGpa {
    semester_id: number;
    semester_name: string;
    gpa: number;
    credits: number;
}

interface GradeSummary {
    cgpa: number;
    total_credits: number;
    semester_gpas: SemesterGpa[];
}

export function Grades() {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [courses, setCourses] = useState<Repository[]>([]);
    const [summary, setSummary] = useState<GradeSummary>({ cgpa: 0, total_credits: 0, semester_gpas: [] });

    // UI State
    const [isAddingSemester, setIsAddingSemester] = useState(false);
    const [newSemesterName, setNewSemesterName] = useState('');
    const [gradeInputMode, setGradeInputMode] = useState<'gp' | 'score'>('gp'); // 'gp' = Grade Point, 'score' = Score/Max

    // Projections State
    const [targetCGPA, setTargetCGPA] = useState<string>('9.0');
    const [horizon, setHorizon] = useState<string>('3'); // Semesters left

    const { profile } = { profile: { name: 'Student' } }; // Mock for now if context not available, or use proper context

    useEffect(() => {
        fetchData();
        fetchSummary();
    }, []);

    async function fetchData() {
        try {
            const sems = await invoke<Semester[]>('get_semesters');
            const repos = await invoke<Repository[]>('get_repositories');
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

    // ... existing update/delete logic ...


    async function updateCourse(course: Repository, updates: Partial<Repository>) {
        const updated = { ...course, ...updates };
        setCourses(prev => prev.map(c => c.id === course.id ? updated : c));

        try {
            await invoke('update_course_grade_details', {
                repositoryId: updated.id,
                credits: Number(updated.credits),
                semesterId: updated.semester_id,
                manualGrade: updated.manual_grade ? Number(updated.manual_grade) : null,
                status: updated.status
            });
            fetchSummary();
        } catch (e) {
            console.error("Failed to update course", e);
            setCourses(prev => prev.map(c => c.id === course.id ? course : c));
        }
    }

    // Helper to get grade color
    const getGradeColor = (grade?: number) => {
        if (!grade) return "bg-gray-500/20 text-gray-400";
        if (grade >= 4.0) return "bg-green-500/20 text-green-400";
        if (grade >= 3.0) return "bg-blue-500/20 text-blue-400";
        if (grade >= 2.0) return "bg-yellow-500/20 text-yellow-400";
        return "bg-red-500/20 text-red-400";
    };

    const getGradeLetter = (grade?: number) => {
        if (!grade) return "-";
        if (grade >= 4.0) return "A";
        if (grade >= 3.7) return "A-";
        if (grade >= 3.3) return "B+";
        if (grade >= 3.0) return "B";
        if (grade >= 2.7) return "B-";
        if (grade >= 2.3) return "C+";
        if (grade >= 2.0) return "C";
        if (grade >= 1.0) return "D";
        return "F";
    };


    // Segment logic: Current vs Past
    // For now, let's assume the most recently created semester is "Current"
    const currentSemesterId = semesters.length > 0 ? semesters[0].id : null;

    const coursesBySemester: Record<number, Repository[]> = {};
    courses.forEach(c => {
        if (c.semester_id) {
            if (!coursesBySemester[c.semester_id]) coursesBySemester[c.semester_id] = [];
            coursesBySemester[c.semester_id].push(c);
        }
    });

    const currentCourses = currentSemesterId ? (coursesBySemester[currentSemesterId] || []) : [];

    // Sort past semesters chronologically desc
    const pastSemesters = semesters.filter(s => s.id !== currentSemesterId);



    return (
        <div className="relative w-full h-full overflow-hidden bg-bg-primary">
            {/* Background Gradient/SVG similar to HomeHub if needed, or just keep clean */}

            {/* Main Content (Full Width) */}
            <div className="relative z-10 flex flex-col h-full min-w-0 overflow-y-auto px-8 py-6">

                {/* Header Section */}
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary mb-1">
                            Good afternoon, {profile?.name?.split(' ')[0] || 'User'}.
                        </h1>
                        <p className="text-text-secondary text-sm">Ready to expand your knowledge?</p>
                    </div>
                    {/* Search Bar Compact - HomeHub Style */}
                    <div className="flex items-center bg-bg-surface/80 backdrop-blur-md border border-border rounded-lg px-4 py-2 w-96">
                        <Search className="text-text-tertiary mr-3" size={16} />
                        <input
                            type="text"
                            placeholder="Search files, commands, or topics..."
                            className="bg-transparent border-none outline-none text-sm text-text-primary w-full placeholder-text-tertiary font-mono"
                        />
                        <span className="text-xs text-text-tertiary font-mono border border-border px-1.5 py-0.5 rounded">⌘K</span>
                    </div>
                </div>

                {/* Top Stats Row - HomeHub "MetricCard" Style */}
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
                        <div className="glass-card px-3 py-2 rounded-lg flex items-center gap-3 border border-dashed border-border/50">
                            <div className="p-1.5 bg-purple-500/10 rounded text-purple-400">
                                <span className="font-bold text-lg">T</span>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">Target</p>
                                <input
                                    className="w-12 bg-transparent text-lg font-medium text-text-primary font-mono outline-none border-b border-transparent focus:border-purple-500/50 transition-colors"
                                    value={targetCGPA}
                                    onChange={(e) => setTargetCGPA(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="glass-card px-3 py-2 rounded-lg flex items-center gap-3 border border-dashed border-border/50">
                            <div className="p-1 bg-text-tertiary/10 rounded text-text-tertiary">
                                <span className="font-bold text-sm">#</span>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">Horizon</p>
                                <div className="flex items-center gap-1">
                                    <input
                                        className="w-8 bg-transparent text-lg font-medium text-text-primary font-mono outline-none"
                                        value={horizon}
                                        onChange={(e) => setHorizon(e.target.value)}
                                    />
                                    <span className="text-[10px] text-text-tertiary uppercase">Sems</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-8 w-px bg-border/50 mx-2"></div>

                        <div className="text-right">
                            <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider mb-0.5">Required Effort</p>
                            <div className="flex items-center gap-2 justify-end">
                                <span className="text-accent font-bold font-mono text-lg">~9.4</span>
                                <span className="text-xs text-text-secondary">SGPA / sem</span>
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
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="px-3 py-1.5 bg-bg-surface border border-border rounded text-[10px] text-text-secondary hover:text-white font-mono uppercase flex items-center gap-1">
                            Add to Planner
                        </button>
                    </div>
                    <div className="flex items-start gap-8">
                        <div className="flex-1">
                            <h3 className="font-medium text-xs text-text-tertiary uppercase tracking-wider font-mono mb-4">Projection Timeline</h3>
                            <div className="h-24 w-full flex items-end gap-1 relative">
                                {/* Mock Chart Bars */}
                                {[8.5, 8.8, 9.1, 9.4, 9.4, 9.4].map((val, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group/bar">
                                        <div
                                            className={cn("w-full rounded-t-sm transition-all hover:bg-accent/80", i < 2 ? "bg-white/10" : "bg-accent/20 border-t border-accent/50")}
                                            style={{ height: `${(val / 10) * 100}%` }}
                                        ></div>
                                        <span className="text-[10px] text-text-tertiary font-mono group-hover/bar:text-white">{i < 2 ? `Past ${i + 1}` : `Sem ${i + 1}`}</span>
                                    </div>
                                ))}
                                {/* Target Line */}
                                <div className="absolute top-[10%] w-full h-px bg-purple-500/30 border-t border-dashed border-purple-500/50 flex items-center">
                                    <span className="text-[9px] text-purple-400 font-mono bg-bg-primary px-1 ml-1">Target {targetCGPA}</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-64 border-l border-white/5 pl-8">
                            <h3 className="font-medium text-xs text-text-tertiary uppercase tracking-wider font-mono mb-3">Study Plan</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-text-secondary">Daily Effort</span>
                                    <span className="text-white font-mono font-medium">4.5h</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-text-secondary">Assignments</span>
                                    <span className="text-white font-mono font-medium">All + Bonus</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-1 mt-2">
                                    <div className="bg-gradient-to-r from-accent to-purple-500 w-[75%] h-full rounded-full"></div>
                                </div>
                                <p className="text-[10px] text-text-tertiary italic mt-1">"You're on track, but barely."</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inline Add Semester Form */}
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

                {/* Split View: Current vs Past */}
                <div className="flex-1 flex gap-6 min-h-0">

                    {/* Current Courses */}
                    <div className="glass-card p-0 rounded-lg overflow-hidden flex flex-col flex-1">
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <h3 className="font-medium text-xs text-text-tertiary uppercase tracking-wider font-mono">Current Courses</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-bg-primary border border-border rounded p-0.5">
                                    <button
                                        onClick={() => setGradeInputMode('gp')}
                                        className={cn("px-2 py-0.5 text-[10px] rounded font-mono transition-colors", gradeInputMode === 'gp' ? "bg-white/10 text-white" : "text-text-tertiary hover:text-text-secondary")}
                                    >GP</button>
                                    <button
                                        onClick={() => setGradeInputMode('score')}
                                        className={cn("px-2 py-0.5 text-[10px] rounded font-mono transition-colors", gradeInputMode === 'score' ? "bg-white/10 text-white" : "text-text-tertiary hover:text-text-secondary")}
                                    >Score</button>
                                </div>
                                {currentSemesterId && (
                                    <span className="text-[10px] font-mono text-text-tertiary px-1.5 py-0.5 border border-border rounded opacity-60">
                                        {semesters.find(s => s.id === currentSemesterId)?.name}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {/* Header Row */}
                            <div className="grid grid-cols-12 gap-2 text-[10px] text-text-tertiary uppercase font-bold tracking-wider px-3 py-2 border-b border-border/50 mb-1 font-mono opacity-70">
                                <div className="col-span-6">Course</div>
                                <div className="col-span-2 text-center">Cr</div>
                                <div className="col-span-2 text-center">Gr</div>
                                <div className="col-span-2"></div>
                            </div>

                            <div className="space-y-0.5">
                                {currentCourses.length === 0 ? (
                                    <div className="text-center text-text-tertiary py-8 italic text-xs">No courses in current semester</div>
                                ) : (
                                    currentCourses.map(course => (
                                        <div key={course.id} className="grid grid-cols-12 gap-2 px-3 py-1.5 items-center hover:bg-white/5 rounded transition-colors group">
                                            <div className="col-span-6">
                                                <div className="font-medium text-sm text-white/90 truncate">{course.name}</div>
                                                <div className="text-[10px] text-text-tertiary">{course.code || 'NO CODE'}</div>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <input
                                                    type="number"
                                                    className="w-8 bg-transparent text-center outline-none border-b border-border/50 focus:border-accent text-xs text-text-secondary hover:text-white transition-colors font-mono"
                                                    value={course.credits}
                                                    onChange={(e) => updateCourse(course, { credits: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="col-span-2 flex justify-center items-center gap-2">
                                                {gradeInputMode === 'gp' ? (
                                                    <div className={cn(
                                                        "w-6 h-6 rounded flex items-center justify-center font-bold text-xs border border-white/5 font-mono cursor-pointer hover:border-accent/50",
                                                        getGradeColor(course.manual_grade)
                                                    )}
                                                        onClick={() => {
                                                            const newGrade = prompt("Enter Grade Point (0.0 - 4.0):", course.manual_grade?.toString());
                                                            if (newGrade && !isNaN(parseFloat(newGrade))) updateCourse(course, { manual_grade: parseFloat(newGrade) });
                                                        }}
                                                    >
                                                        {getGradeLetter(course.manual_grade)}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            className="w-8 bg-transparent text-right outline-none border-b border-border/50 focus:border-accent text-xs font-mono"
                                                            placeholder="85"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const val = parseFloat((e.currentTarget as HTMLInputElement).value);
                                                                    // Mock conversion: val / 25 or something logic. 
                                                                    // For now just set manual_grade = val / 25
                                                                    if (!isNaN(val)) updateCourse(course, { manual_grade: Math.min(4.0, val / 25) });
                                                                }
                                                            }}
                                                        />
                                                        <span className="text-[10px] text-text-tertiary">/100</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-span-2 w-full h-1 bg-bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-500", !course.manual_grade ? "w-0" : "w-full", course.manual_grade && course.manual_grade >= 3.0 ? "bg-green-500" : "bg-yellow-500")}
                                                    style={{ width: '80%' }} /* Mock progress bar for visual flair */
                                                ></div>
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
                            <div className="flex items-center gap-2">
                                <h3 className="font-medium text-xs text-text-tertiary uppercase tracking-wider font-mono">Past Semesters</h3>
                            </div>
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
                                        <div key={sem.id} className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-white/5 rounded transition-colors border border-transparent hover:border-border/20 cursor-pointer group">
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
