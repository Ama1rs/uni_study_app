import { useState } from 'react';
import { BookOpen, Calendar, Edit2, Trash2, MoreVertical, Award } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { AnimatedContainer, AnimatedItem } from '../../../components/ui/AnimatedComponents';
import { motion, AnimatePresence } from 'framer-motion';

interface ExtendedRepository {
    id: number;
    name: string;
    code?: string;
    credits: number;
    semester_id?: number | null;
    manual_grade?: number | null;
    status: string;
    description?: string;
}

interface CourseListProps {
    courses: ExtendedRepository[];
    onEditCourse: (course: ExtendedRepository) => void;
    getGradeColor: (grade?: number | null) => string;
    getGradeDisplay: (grade?: number | null) => string;
    addStudyGoals: (courseId: number, credits: number) => void;
    requiredFutureGpa?: number;
}

export function CourseList({
    courses,
    onEditCourse,
    getGradeColor,
    getGradeDisplay,
    addStudyGoals,
    requiredFutureGpa
}: CourseListProps) {
    const [hoveredCourse, setHoveredCourse] = useState<number | null>(null);
    const [activeMenu, setActiveMenu] = useState<number | null>(null);

    if (courses.length === 0) {
        return (
            <div className="glass-card flex-1 rounded-xl border border-border/40 overflow-hidden flex flex-col bg-bg-surface/30">
                <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.6 }}
                        className="w-16 h-16 rounded-xl bg-border/10 border border-border/30 flex items-center justify-center mb-4"
                    >
                        <BookOpen size={28} className="text-text-tertiary" />
                    </motion.div>
                    <h3 className="text-base font-bold text-text-primary mb-1.5">No Courses Yet</h3>
                    <p className="text-text-tertiary text-xs text-center max-w-sm">
                        Start by adding your first course for this semester. Click "Add Course" to get started.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card flex-1 rounded-xl border border-border/40 overflow-hidden flex flex-col bg-bg-surface/30">
            {/* Header */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-border/30 bg-bg-primary/20">
                <div className="col-span-1 text-[9px] font-medium text-text-tertiary uppercase tracking-wide">Code</div>
                <div className="col-span-4 text-[9px] font-medium text-text-tertiary uppercase tracking-wide">Course Name</div>
                <div className="col-span-2 text-center text-[9px] font-medium text-text-tertiary uppercase tracking-wide">Credits</div>
                <div className="col-span-2 text-center text-[9px] font-medium text-text-tertiary uppercase tracking-wide">Target</div>
                <div className="col-span-2 text-right text-[9px] font-medium text-text-tertiary uppercase tracking-wide">Grade</div>
                <div className="col-span-1" />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <AnimatedContainer stagger={0.04} className="divide-y divide-border/10">
                    {courses.map(course => {
                        const hasGrade = course.manual_grade !== null && course.manual_grade !== undefined;
                        const gradeValue = course.manual_grade || 0;
                        const isAboveTarget = requiredFutureGpa && gradeValue >= requiredFutureGpa;

                        return (
                            <AnimatedItem key={course.id}>
                                <motion.div
                                    className={cn(
                                        "grid grid-cols-12 gap-3 px-5 py-4 items-center transition-all cursor-pointer relative group",
                                        hoveredCourse === course.id ? "bg-bg-hover/50" : "bg-transparent"
                                    )}
                                    onMouseEnter={() => setHoveredCourse(course.id)}
                                    onMouseLeave={() => setHoveredCourse(null)}
                                    onClick={() => onEditCourse(course)}
                                    whileHover={{ x: 2 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                >
                                    {/* Hover Indicator */}
                                    <div className={cn(
                                        "absolute left-0 top-0 bottom-0 w-0.5 bg-text-secondary transition-all",
                                        hoveredCourse === course.id ? "opacity-100" : "opacity-0"
                                    )} />

                                    {/* Code */}
                                    <div className="col-span-1">
                                        <div className="px-1.5 py-1 rounded bg-border/10 border border-border/30 group-hover:border-border/50 transition-colors">
                                            <span className="text-[9px] text-text-tertiary font-medium uppercase">
                                                {course.code || '---'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Course Name */}
                                    <div className="col-span-4">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                                                hasGrade
                                                    ? "bg-blue-500/10 border border-blue-500/20"
                                                    : "bg-border/10 border border-border/30"
                                            )}>
                                                {hasGrade ? (
                                                    <Award size={14} className="text-blue-500" />
                                                ) : (
                                                    <BookOpen size={14} className="text-text-tertiary" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-xs text-text-primary group-hover:text-text-primary transition-colors truncate">
                                                    {course.name}
                                                </div>
                                                {course.description && (
                                                    <div className="text-[9px] text-text-tertiary truncate mt-0.5">
                                                        {course.description}
                                                    </div>
                                                )}
                                                {hasGrade && isAboveTarget && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <div className="w-1 h-1 rounded-full bg-green-500" />
                                                        <span className="text-[8px] text-green-500 font-medium uppercase tracking-wide">On Track</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Credits */}
                                    <div className="col-span-2 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <span className="text-base font-bold text-text-primary">{course.credits}</span>
                                            <span className="text-[8px] text-text-tertiary uppercase tracking-wide">Credits</span>
                                        </div>
                                    </div>

                                    {/* Target */}
                                    <div className="col-span-2 text-center">
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-purple-500/5 border border-purple-500/20 group-hover:bg-purple-500/10 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500/60" />
                                            <span className="text-xs text-purple-500 font-medium">
                                                {requiredFutureGpa ? requiredFutureGpa.toFixed(1) : '-.-'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Grade Badge */}
                                    <div className="col-span-2 flex justify-end">
                                        <div className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm font-bold border transition-all",
                                            hasGrade
                                                ? getGradeColor(course.manual_grade) + " group-hover:scale-105"
                                                : "bg-border/5 text-text-tertiary border-border/30"
                                        )}>
                                            {getGradeDisplay(course.manual_grade)}
                                        </div>
                                    </div>

                                    {/* Actions Menu */}
                                    <div className="col-span-1 flex justify-end">
                                        <div className="relative">
                                            <motion.button
                                                className={cn(
                                                    "p-1.5 rounded transition-all",
                                                    activeMenu === course.id
                                                        ? "bg-border/20 text-text-primary"
                                                        : "bg-border/10 text-text-tertiary hover:bg-border/20 hover:text-text-secondary opacity-0 group-hover:opacity-100"
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenu(activeMenu === course.id ? null : course.id);
                                                }}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <MoreVertical size={14} />
                                            </motion.button>

                                            <AnimatePresence>
                                                {activeMenu === course.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                                        className="absolute right-0 top-full mt-1 w-40 bg-bg-surface/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg overflow-hidden z-50"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="p-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onEditCourse(course);
                                                                    setActiveMenu(null);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded hover:bg-border/10 text-text-secondary hover:text-text-primary transition-all text-xs"
                                                            >
                                                                <Edit2 size={12} />
                                                                <span className="font-medium">Edit Grade</span>
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    addStudyGoals(course.id, course.credits);
                                                                    setActiveMenu(null);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded hover:bg-border/10 text-text-secondary hover:text-text-primary transition-all text-xs"
                                                            >
                                                                <Calendar size={12} />
                                                                <span className="font-medium">Add to Planner</span>
                                                            </button>
                                                            <div className="h-px bg-border/30 my-1" />
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Add delete functionality
                                                                    setActiveMenu(null);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-all text-xs"
                                                            >
                                                                <Trash2 size={12} />
                                                                <span className="font-medium">Remove Course</span>
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatedItem>
                        );
                    })}
                </AnimatedContainer>
            </div>

            {/* Footer Stats */}
            <div className="border-t border-border/30 bg-bg-primary/20 px-5 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-text-secondary" />
                            <span className="text-[10px] text-text-tertiary">
                                <span className="text-text-primary font-medium">{courses.length}</span> Active Courses
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-[10px] text-text-tertiary">
                                <span className="text-text-primary font-medium">{courses.reduce((sum, c) => sum + c.credits, 0)}</span> Total Credits
                            </span>
                        </div>
                    </div>
                    <div className="text-[10px] text-text-tertiary italic">
                        Click any course to edit details
                    </div>
                </div>
            </div>
        </div>
    );
}
