import { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, BookOpen, TrendingUp, Target, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { GradeSummary, GradingScale, ProjectionResult } from '../../../types/grading';
import { AnimatedContainer, AnimatedItem } from '../../../components/ui/AnimatedComponents';

interface StatsGridProps {
    summary: GradeSummary;
    scales: GradingScale[];
    currentCourses: any[];
    projection: ProjectionResult | null;
    refreshAll: () => void;
    invoke: any;
}

export function StatsGrid({ summary, scales, currentCourses, projection, refreshAll, invoke }: StatsGridProps) {
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [targetValue, setTargetValue] = useState(projection?.target_cgpa?.toString() || '9.0');

    const maxPoint = scales[0]?.config?.max_point || 10;
    const currentCredits = currentCourses.reduce((sum, c) => sum + (c.credits || 0), 0);

    // Calculate trend (mock for now - would need historical data)
    const previousGpa = summary.semester_gpas[summary.semester_gpas.length - 2]?.gpa || summary.cgpa;
    const gpaTrend = summary.cgpa - previousGpa;

    const handleTargetSave = () => {
        const val = parseFloat(targetValue);
        if (!isNaN(val)) {
            invoke('save_projection_settings', { targetCgpa: val, horizon: projection?.horizon });
            setTimeout(refreshAll, 100);
        }
        setIsEditingTarget(false);
    };

    return (
        <AnimatedContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* CGPA Card */}
            <AnimatedItem>
                <div className="glass-card p-5 rounded-xl border border-border/40 relative overflow-hidden group hover:border-border/60 transition-all duration-300">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-border/20">
                                    <Award size={14} className="text-text-secondary" />
                                </div>
                                <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Overall CGPA</p>
                            </div>
                            {gpaTrend !== 0 && (
                                <div className={cn(
                                    "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium",
                                    gpaTrend > 0 ? "bg-green-500/10 text-green-500" :
                                        gpaTrend < 0 ? "bg-red-500/10 text-red-500" :
                                            "bg-border/20 text-text-tertiary"
                                )}>
                                    {gpaTrend > 0 ? <TrendingUp size={8} /> : gpaTrend < 0 ? <TrendingDown size={8} /> : <Minus size={8} />}
                                    {Math.abs(gpaTrend).toFixed(2)}
                                </div>
                            )}
                        </div>

                        <div className="flex items-baseline gap-2 mb-3">
                            <motion.h2
                                className="text-3xl font-bold text-text-primary"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.3, type: "spring" }}
                            >
                                {(summary.cgpa || 0).toFixed(2)}
                            </motion.h2>
                            <span className="text-text-tertiary text-xs">/ {maxPoint}</span>
                        </div>

                        <div className="text-[9px] px-2 py-1.5 rounded border border-border/20 bg-border/5 text-text-tertiary text-center uppercase tracking-tighter">
                            Academic Standing
                        </div>
                    </div>
                </div>
            </AnimatedItem>

            {/* Total Credits Card */}
            <AnimatedItem>
                <div className="glass-card p-5 rounded-xl border border-border/40 relative overflow-hidden group hover:border-border/60 transition-all duration-300">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-border/20">
                                <BookOpen size={14} className="text-text-secondary" />
                            </div>
                            <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Total Credits</p>
                        </div>

                        <div className="flex items-baseline gap-2 mb-3">
                            <motion.h2
                                className="text-3xl font-bold text-text-primary"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                            >
                                {isNaN(summary.total_credits) ? 0 : summary.total_credits}
                            </motion.h2>
                            <span className="text-text-tertiary text-xs uppercase">Units</span>
                        </div>

                        <div className="text-[9px] px-2 py-1.5 rounded border border-border/20 bg-border/5 text-text-tertiary text-center uppercase tracking-tighter">
                            {currentCredits} Credits In Progress
                        </div>
                    </div>
                </div>
            </AnimatedItem>

            {/* Target GPA Card */}
            <AnimatedItem>
                <div className="glass-card p-5 rounded-xl border border-border/40 relative overflow-hidden group hover:border-border/60 transition-all duration-300">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-border/20">
                                <Target size={14} className="text-text-secondary" />
                            </div>
                            <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Target GPA</p>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                            {isEditingTarget ? (
                                <input
                                    autoFocus
                                    type="number"
                                    step="0.01"
                                    className="w-20 bg-bg-primary text-3xl font-bold text-text-primary outline-none border-b border-border focus:border-text-secondary transition-colors"
                                    value={targetValue}
                                    onChange={e => setTargetValue(e.target.value)}
                                    onBlur={handleTargetSave}
                                    onKeyDown={e => e.key === 'Enter' && handleTargetSave()}
                                />
                            ) : (
                                <motion.h2
                                    className="text-3xl font-bold text-text-primary cursor-pointer hover:text-text-secondary transition-colors"
                                    onClick={() => setIsEditingTarget(true)}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.3, type: "spring" }}
                                >
                                    {projection?.target_cgpa && !isNaN(projection.target_cgpa) ? projection.target_cgpa.toFixed(2) : '9.00'}
                                </motion.h2>
                            )}
                            <span className="text-text-tertiary text-xs">Goal</span>
                        </div>

                        <div className="text-[9px] px-2 py-1.5 rounded border border-border/20 bg-border/5 text-text-tertiary text-center uppercase tracking-tighter">
                            Horizon: {projection?.horizon || 8} Semesters
                        </div>
                    </div>
                </div>
            </AnimatedItem>

            {/* Required Average Card */}
            <AnimatedItem>
                <div className={cn(
                    "glass-card p-5 rounded-xl border relative overflow-hidden group transition-all duration-300",
                    projection?.required_future_gpa && projection.required_future_gpa > maxPoint
                        ? "border-red-500/40 bg-red-500/5"
                        : "border-border/40 hover:border-border/60"
                )}>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className={cn(
                                "p-1.5 rounded-lg",
                                projection?.required_future_gpa && projection.required_future_gpa > maxPoint
                                    ? "bg-red-500/10"
                                    : "bg-border/20"
                            )}>
                                <TrendingUp size={14} className={cn(
                                    projection?.required_future_gpa && projection.required_future_gpa > maxPoint
                                        ? "text-red-500"
                                        : "text-text-secondary"
                                )} />
                            </div>
                            <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Required Avg.</p>
                        </div>

                        <div className="flex items-baseline gap-2 mb-3">
                            <motion.h2
                                className={cn(
                                    "text-3xl font-bold",
                                    projection?.required_future_gpa && projection.required_future_gpa > maxPoint
                                        ? "text-red-500"
                                        : "text-text-primary"
                                )}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.4, type: "spring" }}
                            >
                                {projection?.required_future_gpa ? projection.required_future_gpa.toFixed(2) : '-.--'}
                            </motion.h2>
                            <span className="text-text-tertiary text-xs">GPA</span>
                        </div>

                        <div className={cn(
                            "text-[9px] px-2 py-1.5 rounded border text-center uppercase tracking-tighter",
                            projection?.required_future_gpa && projection.required_future_gpa > maxPoint
                                ? "bg-red-500/10 border-red-500/20 text-red-400"
                                : "bg-border/5 border-border/20 text-text-tertiary"
                        )}>
                            {projection?.message || "Set Target for Projection"}
                        </div>
                    </div>
                </div>
            </AnimatedItem>
        </AnimatedContainer>
    );
}
