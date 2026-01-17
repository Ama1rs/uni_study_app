import { useState } from 'react';
import { cn } from '../../../lib/utils';
import { Semester, GradeSummary } from '../../../types/grading';
import { AnimatedContainer, AnimatedItem } from '../../../components/ui/AnimatedComponents';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

interface PastSemesterListProps {
    pastSemesters: Semester[];
    summary: GradeSummary;
    getGradeColor: (grade?: number | null) => string;
}

export function PastSemesterList({ pastSemesters, summary, getGradeColor }: PastSemesterListProps) {
    const [expandedSemester, setExpandedSemester] = useState<number | null>(null);

    if (pastSemesters.length === 0) {
        return (
            <div className="glass-card rounded-xl border border-border/40 overflow-hidden flex flex-col bg-bg-surface/30">
                <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.6 }}
                        className="w-16 h-16 rounded-xl bg-border/10 border border-border/30 flex items-center justify-center mb-4"
                    >
                        <Calendar size={28} className="text-text-tertiary" />
                    </motion.div>
                    <h3 className="text-base font-bold text-text-primary mb-1.5">No Past Semesters</h3>
                    <p className="text-text-tertiary text-xs text-center max-w-md">
                        Your completed semesters will appear here once you finish your first semester.
                    </p>
                </div>
            </div>
        );
    }

    // Calculate trends
    const semestersWithTrends = pastSemesters.map((sem, index) => {
        const semGpa = summary.semester_gpas.find(gp => gp.semester_id === sem.id);
        const prevSemGpa = index > 0 ? summary.semester_gpas.find(gp => gp.semester_id === pastSemesters[index - 1].id) : null;
        const trend = semGpa && prevSemGpa ? semGpa.gpa - prevSemGpa.gpa : 0;

        return {
            semester: sem,
            gpa: semGpa,
            trend
        };
    });

    return (
        <div className="glass-card rounded-xl border border-border/40 overflow-hidden flex flex-col bg-bg-surface/30">
            {/* Header */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-border/30 bg-bg-primary/20">
                <div className="col-span-6 text-[9px] font-medium text-text-tertiary uppercase tracking-wide">Period</div>
                <div className="col-span-3 text-center text-[9px] font-medium text-text-tertiary uppercase tracking-wide">Credit Load</div>
                <div className="col-span-3 text-right text-[9px] font-medium text-text-tertiary uppercase tracking-wide">Semester GPA</div>
            </div>

            <div className="">
                <AnimatedContainer stagger={0.04} className="divide-y divide-border/10">
                    {semestersWithTrends.map(({ semester: sem, gpa: semGpa, trend }, index) => {
                        const isExpanded = expandedSemester === sem.id;

                        return (
                            <AnimatedItem key={sem.id}>
                                <motion.div
                                    className="relative group"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                >
                                    {/* Hover Indicator */}
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-text-secondary opacity-0 group-hover:opacity-100 transition-all" />

                                    <div
                                        className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-bg-hover/50 transition-all cursor-pointer"
                                        onClick={() => setExpandedSemester(isExpanded ? null : sem.id)}
                                    >
                                        {/* Period */}
                                        <div className="col-span-6 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                                                <Calendar size={14} className="text-blue-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-xs text-text-primary group-hover:text-text-primary transition-colors truncate">
                                                    {sem.name}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="text-[8px] text-text-tertiary uppercase tracking-wide">Completed</div>
                                                    {trend !== 0 && (
                                                        <div className={cn(
                                                            "flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium",
                                                            trend > 0 ? "bg-green-500/10 text-green-500" :
                                                                trend < 0 ? "bg-red-500/10 text-red-500" :
                                                                    "bg-border/20 text-text-tertiary"
                                                        )}>
                                                            {trend > 0 ? <TrendingUp size={7} /> : trend < 0 ? <TrendingDown size={7} /> : <Minus size={7} />}
                                                            {trend > 0 ? '+' : ''}{trend.toFixed(2)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Credits */}
                                        <div className="col-span-3 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <span className="text-base font-bold text-text-primary">{semGpa?.credits || 0}</span>
                                                <span className="text-[8px] text-text-tertiary uppercase tracking-wide">Units</span>
                                            </div>
                                        </div>

                                        {/* GPA */}
                                        <div className="col-span-3 flex items-center justify-end gap-2">
                                            <div className={cn(
                                                "px-3 py-1.5 rounded-lg text-sm font-bold border transition-all group-hover:scale-105",
                                                semGpa?.gpa && !isNaN(semGpa.gpa) ? getGradeColor(semGpa.gpa) : "text-text-tertiary bg-border/5 border-border/30"
                                            )}>
                                                {semGpa?.gpa && !isNaN(semGpa.gpa) ? semGpa.gpa.toFixed(2) : "0.00"}
                                            </div>
                                            <motion.div
                                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="text-text-tertiary group-hover:text-text-secondary"
                                            >
                                                <ChevronDown size={14} />
                                            </motion.div>
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden bg-bg-primary/20 border-t border-border/20"
                                            >
                                                <div className="px-5 py-3">
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="p-3 rounded-lg bg-border/5 border border-border/20">
                                                            <div className="text-[9px] text-text-tertiary uppercase tracking-wide mb-1">Credits Earned</div>
                                                            <div className="text-xl font-bold text-text-primary">{semGpa?.credits || 0}</div>
                                                        </div>
                                                        <div className="p-3 rounded-lg bg-border/5 border border-border/20">
                                                            <div className="text-[9px] text-text-tertiary uppercase tracking-wide mb-1">Semester GPA</div>
                                                            <div className="text-xl font-bold text-blue-500">
                                                                {semGpa?.gpa && !isNaN(semGpa.gpa) ? semGpa.gpa.toFixed(2) : "0.00"}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 rounded-lg bg-border/5 border border-border/20">
                                                            <div className="text-[9px] text-text-tertiary uppercase tracking-wide mb-1">Trend</div>
                                                            <div className={cn(
                                                                "text-xl font-bold flex items-center gap-1.5",
                                                                trend > 0 ? "text-green-500" :
                                                                    trend < 0 ? "text-red-500" :
                                                                        "text-text-tertiary"
                                                            )}>
                                                                {trend > 0 ? <TrendingUp size={16} /> : trend < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                                                                {trend > 0 ? '+' : ''}{trend.toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
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
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-[10px] text-text-tertiary">
                                <span className="text-text-primary font-medium">{pastSemesters.length}</span> Completed Semesters
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-text-secondary" />
                            <span className="text-[10px] text-text-tertiary">
                                <span className="text-text-primary font-medium">
                                    {summary.semester_gpas.reduce((sum, gpa) => sum + (gpa.credits || 0), 0)}
                                </span> Total Credits
                            </span>
                        </div>
                    </div>
                    <div className="text-[10px] text-text-tertiary italic">
                        Click to expand details
                    </div>
                </div>
            </div>
        </div>
    );
}
