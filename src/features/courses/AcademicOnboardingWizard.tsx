import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, School, Check, Award, User, Target, Calendar, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { GradingScale } from '../../types/grading';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface WizardProps {
    isOpen: boolean;
    onComplete: () => void;
}

type Step = 'profile' | 'grading' | 'history' | 'current' | 'completed';

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'grading', label: 'Grading', icon: Award },
    { id: 'history', label: 'History', icon: Calendar },
    { id: 'current', label: 'Goals', icon: Target },
];

export function AcademicOnboardingWizard({ isOpen, onComplete }: WizardProps) {
    const [step, setStep] = useState<Step>('profile');
    const [isLoading, setIsLoading] = useState(false);

    // Data State
    const [university, setUniversity] = useState('');
    const [programName, setProgramName] = useState('');
    const [totalCredits, setTotalCredits] = useState('120');

    const [scales, setScales] = useState<GradingScale[]>([]);
    const [selectedScaleId, setSelectedScaleId] = useState<number | null>(null);

    const [pastSemesters, setPastSemesters] = useState<{ id: string, name: string, credits: string, gpa: string }[]>([]);

    const [currentSemesterName, setCurrentSemesterName] = useState('Current Semester');
    const [targetGpa, setTargetGpa] = useState('');

    useEffect(() => {
        if (isOpen) {
            invoke<GradingScale[]>('get_grading_scales').then(setScales).catch(console.error);
        }
    }, [isOpen]);

    const handleAddSemester = () => {
        setPastSemesters([...pastSemesters, { id: crypto.randomUUID(), name: `Semester ${pastSemesters.length + 1}`, credits: '', gpa: '' }]);
    };

    const handleUpdateSemester = (id: string, field: 'name' | 'credits' | 'gpa', value: string) => {
        setPastSemesters(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleRemoveSemester = (id: string) => {
        setPastSemesters(prev => prev.filter(s => s.id !== id));
    };

    const handleFinalize = async () => {
        setIsLoading(true);
        try {
            // 1. Set User Profile
            const profile = await invoke<any>('get_user_profile');
            await invoke('set_user_profile', {
                profile: { ...profile, university }
            });

            // 2. Create Program
            const programId = await invoke<number>('create_program', {
                name: programName,
                totalRequiredCredits: parseFloat(totalCredits),
                gradingScaleId: selectedScaleId
            });
            await invoke('set_user_program', { programId });

            // 3. Import History
            for (const sem of pastSemesters) {
                if (!sem.credits || !sem.gpa) continue;
                const semId = await invoke<number>('create_semester', { name: sem.name });
                const repoId = await invoke<number>('create_repository', {
                    name: "Aggregate Performance",
                    code: "AGG-001",
                    semester: sem.name,
                    description: "Imported historical data"
                });

                await invoke('update_course_grade_details', {
                    repositoryId: repoId,
                    credits: parseFloat(sem.credits),
                    semesterId: semId,
                    manualGrade: parseFloat(sem.gpa),
                    status: 'completed',
                    gradingScaleId: selectedScaleId
                });
            }

            // 4. Create Current Semester
            if (currentSemesterName) {
                await invoke('create_semester', { name: currentSemesterName });
            }

            // 5. Save Goals
            if (targetGpa) {
                await invoke('save_projection_settings', {
                    targetCgpa: parseFloat(targetGpa),
                    horizon: 4
                });
            }

            setStep('completed');
            setTimeout(onComplete, 2500);
        } catch (e) {
            console.error(e);
            toast.error('Setup failed: ' + e);
        } finally {
            setIsLoading(false);
        }
    };

    const currentStepIndex = STEPS.findIndex(s => s.id === step);
    const progress = step === 'completed' ? 100 : ((currentStepIndex + 1) / STEPS.length) * 100;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-3xl bg-bg-surface border border-accent/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Enhanced Progress Bar */}
                <div className="relative h-2 bg-bg-primary w-full overflow-hidden">
                    <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-teal-500"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>

                {/* Step Indicators */}
                {step !== 'completed' && (
                    <div className="flex items-center justify-between px-8 py-6 border-b border-border/30 bg-gradient-to-r from-bg-primary/40 to-bg-primary/20">
                        {STEPS.map((s, index) => {
                            const Icon = s.icon;
                            const isActive = s.id === step;
                            const isCompleted = index < currentStepIndex;

                            return (
                                <div key={s.id} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center flex-1">
                                        <motion.div
                                            className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all mb-2",
                                                isActive ? "bg-accent/20 border-accent shadow-lg shadow-accent/30" :
                                                    isCompleted ? "bg-green-500/20 border-green-500" :
                                                        "bg-bg-primary/50 border-border/30"
                                            )}
                                            animate={{
                                                scale: isActive ? [1, 1.1, 1] : 1
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: isActive ? Infinity : 0
                                            }}
                                        >
                                            {isCompleted ? (
                                                <Check size={20} className="text-green-400" />
                                            ) : (
                                                <Icon size={20} className={cn(
                                                    isActive ? "text-accent" : "text-text-tertiary"
                                                )} />
                                            )}
                                        </motion.div>
                                        <span className={cn(
                                            "text-xs font-mono uppercase tracking-wider",
                                            isActive ? "text-accent font-bold" :
                                                isCompleted ? "text-green-400" :
                                                    "text-text-tertiary"
                                        )}>
                                            {s.label}
                                        </span>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div className="flex-1 h-px bg-border/30 mx-2 mb-8">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-accent to-green-500"
                                                initial={{ width: 0 }}
                                                animate={{ width: isCompleted ? '100%' : '0%' }}
                                                transition={{ duration: 0.5 }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {step === 'profile' && (
                            <motion.div
                                key="profile"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="mb-8">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                                            <School size={24} className="text-accent" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Academic Profile</h2>
                                            <p className="text-text-secondary text-sm">Tell us about your degree program</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Input
                                        label="University / Institution"
                                        autoFocus
                                        placeholder="e.g. Stanford University"
                                        value={university}
                                        onChange={e => setUniversity(e.target.value)}
                                        startContent={<School size={18} />}
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <div className="col-span-2">
                                        <Input
                                            label="Degree Program"
                                            placeholder="e.g. B.Sc Computer Science"
                                            value={programName}
                                            onChange={e => setProgramName(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Input
                                            label="Total Credits"
                                            type="number"
                                            placeholder="120"
                                            value={totalCredits}
                                            onChange={e => setTotalCredits(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-8">
                                    <Button onClick={() => setStep('grading')} disabled={!programName || !totalCredits}>
                                        Next Step <ChevronRight size={18} />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'grading' && (
                            <motion.div
                                key="grading"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="mb-8">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                            <Award size={24} className="text-purple-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Grading System</h2>
                                            <p className="text-text-secondary text-sm">Select your university's grading scale</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {scales.map((scale, index) => (
                                        <motion.div
                                            key={scale.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            onClick={() => setSelectedScaleId(scale.id)}
                                            className={cn(
                                                "p-5 rounded-xl border cursor-pointer transition-all group relative overflow-hidden",
                                                selectedScaleId === scale.id
                                                    ? "bg-blue-500/5 border-blue-500"
                                                    : "bg-bg-primary/50 border-border/50 hover:border-blue-500/30 hover:bg-bg-hover"
                                            )}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-lg flex items-center justify-center",
                                                        selectedScaleId === scale.id ? "bg-purple-500/20" : "bg-bg-surface"
                                                    )}>
                                                        <Award size={18} className={cn(
                                                            selectedScaleId === scale.id ? "text-purple-400" : "text-text-tertiary"
                                                        )} />
                                                    </div>
                                                    <span className="font-bold text-white text-lg">{scale.name}</span>
                                                </div>
                                                {selectedScaleId === scale.id && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center"
                                                    >
                                                        <Check size={14} className="text-white" />
                                                    </motion.div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-text-tertiary">Max Point:</span>
                                                    <span className="text-text-primary font-mono font-bold">{scale.config.max_point}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-text-tertiary">Type:</span>
                                                    <span className="text-text-primary font-mono capitalize">{scale.type}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="flex justify-between pt-8">
                                    <Button variant="ghost" onClick={() => setStep('profile')}>
                                        <ChevronLeft size={18} /> Back
                                    </Button>
                                    <Button onClick={() => setStep('history')} disabled={!selectedScaleId}>
                                        Next Step <ChevronRight size={18} />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'history' && (
                            <motion.div
                                key="history"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="mb-8">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                            <Calendar size={24} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Academic History</h2>
                                            <p className="text-text-secondary text-sm">Add previous semesters (optional - skip if you're a freshman)</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                                    {pastSemesters.map((sem, idx) => (
                                        <motion.div
                                            key={sem.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="flex gap-3 items-start p-4 rounded-xl bg-bg-primary/50 border border-border/30"
                                        >
                                            <div className="flex-1">
                                                <Input
                                                    placeholder="Semester Name"
                                                    value={sem.name}
                                                    onChange={e => handleUpdateSemester(sem.id, 'name', e.target.value)}
                                                    className="h-10 text-sm"
                                                />
                                            </div>
                                            <div className="w-28">
                                                <Input
                                                    type="number"
                                                    placeholder="Credits"
                                                    value={sem.credits}
                                                    onChange={e => handleUpdateSemester(sem.id, 'credits', e.target.value)}
                                                    className="h-10 text-sm"
                                                />
                                            </div>
                                            <div className="w-24">
                                                <Input
                                                    type="number"
                                                    placeholder="GPA"
                                                    value={sem.gpa}
                                                    onChange={e => handleUpdateSemester(sem.id, 'gpa', e.target.value)}
                                                    className="h-10 text-sm"
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleRemoveSemester(sem.id)}
                                                className="p-2 text-text-tertiary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <span className="text-xl">×</span>
                                            </button>
                                        </motion.div>
                                    ))}
                                    <motion.button
                                        onClick={handleAddSemester}
                                        className="w-full py-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:border-accent hover:text-accent hover:bg-accent/5 transition-all text-sm font-mono"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        + Add Semester
                                    </motion.button>
                                </div>

                                <div className="flex justify-between pt-8">
                                    <Button variant="ghost" onClick={() => setStep('grading')}>
                                        <ChevronLeft size={18} /> Back
                                    </Button>
                                    <Button onClick={() => setStep('current')}>
                                        Next Step <ChevronRight size={18} />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'current' && (
                            <motion.div
                                key="current"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="mb-8">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                                            <Target size={24} className="text-green-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Current Focus</h2>
                                            <p className="text-text-secondary text-sm">Set your goals and current semester</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Input
                                        label="Current Semester Name"
                                        placeholder="e.g. Spring 2026"
                                        value={currentSemesterName}
                                        onChange={e => setCurrentSemesterName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3">Target CGPA Goal</label>
                                    <div className="flex gap-6 items-center p-6 rounded-xl bg-gradient-to-br from-accent/10 to-purple-500/10 border border-accent/20">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            className="w-32 text-2xl font-mono text-center h-14 bg-bg-surface"
                                            placeholder="9.0"
                                            value={targetGpa}
                                            onChange={e => setTargetGpa(e.target.value)}
                                        />
                                        <p className="text-sm text-text-tertiary flex-1">
                                            We'll project the grades you need to achieve this goal and help you stay on track throughout your academic journey.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-8">
                                    <Button variant="ghost" onClick={() => setStep('history')}>
                                        <ChevronLeft size={18} /> Back
                                    </Button>
                                    <Button onClick={handleFinalize} disabled={isLoading}>
                                        {isLoading ? 'Setting up...' : 'Finish Setup'}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'completed' && (
                            <motion.div
                                key="completed"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-20"
                            >
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", duration: 0.8 }}
                                    className="w-32 h-32 rounded-3xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-4 border-green-500/30 flex items-center justify-center mx-auto mb-8 relative"
                                >
                                    <Check size={60} className="text-green-400" />
                                    <motion.div
                                        className="absolute inset-0 rounded-3xl bg-green-500/20"
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                </motion.div>
                                <motion.h2
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3"
                                >
                                    You're All Set! <Sparkles size={32} className="text-yellow-400" />
                                </motion.h2>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-text-secondary text-lg"
                                >
                                    Redirecting to your dashboard...
                                </motion.p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
