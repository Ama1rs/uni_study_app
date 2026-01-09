import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ComponentConfig, ComponentScore, GradingScale } from '../../types/grading';
import { X, Plus, Trash2, Calculator, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ExtendedRepository {
    id: number;
    name: string;
    credits: number;
    semester_id?: number | null;
    manual_grade?: number | null;
    status: string;
    component_config?: string | null;
    component_scores?: string | null;
    grading_scale_id?: number | null;
}

interface CourseGradeDialogProps {
    course: ExtendedRepository;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    scales: GradingScale[];
}

export function CourseGradeDialog({ course, isOpen, onClose, onUpdate, scales }: CourseGradeDialogProps) {
    const [mode, setMode] = useState<'direct' | 'component'>('direct');
    const [manualGrade, setManualGrade] = useState<string>(course.manual_grade?.toString() || '');
    const [convertedGrade, setConvertedGrade] = useState<number | null>(null);
    const [isConverting, setIsConverting] = useState(false);

    // Component State
    const [configs, setConfigs] = useState<ComponentConfig[]>([]);
    const [scores, setScores] = useState<ComponentScore[]>([]);
    const [selectedScaleId, setSelectedScaleId] = useState<number | null>(course.grading_scale_id || null);

    useEffect(() => {
        if (isOpen) {
            // Parse existing
            if (course.component_config) {
                try {
                    setConfigs(JSON.parse(course.component_config));
                    setMode('component');
                } catch { }
            }
            if (course.component_scores) {
                try {
                    setScores(JSON.parse(course.component_scores));
                } catch { }
            }
            if (!course.component_config && course.manual_grade) {
                setMode('direct');
            }
        }
    }, [isOpen, course]);

    // Handle grade conversion in real-time
    useEffect(() => {
        const convertGrade = async () => {
            if (!manualGrade || mode !== 'direct') {
                setConvertedGrade(null);
                return;
            }

            const gradeValue = parseFloat(manualGrade);
            if (isNaN(gradeValue)) {
                setConvertedGrade(null);
                return;
            }

            try {
                setIsConverting(true);
                const scale = scales.find(s => s.id === (selectedScaleId || scales[0]?.id));
                if (!scale) return;

                const converted = await invoke<number>('convert_score_to_points', {
                    score: gradeValue,
                    scale_id: scale.id
                });
                setConvertedGrade(converted);
            } catch (e) {
                console.error('Conversion failed:', e);
                setConvertedGrade(null);
            } finally {
                setIsConverting(false);
            }
        };

        const timer = setTimeout(convertGrade, 300);
        return () => clearTimeout(timer);
    }, [manualGrade, selectedScaleId, mode, scales]);

    const handleSave = async () => {
        try {
            if (mode === 'direct') {
                const grade = parseFloat(manualGrade);
                if (isNaN(grade)) {
                    alert('Please enter a valid grade');
                    return;
                }
                await invoke('update_course_grade_details', {
                    repositoryId: course.id,
                    credits: course.credits,
                    semesterId: course.semester_id,
                    manualGrade: grade,
                    status: 'completed',
                    gradingScaleId: selectedScaleId || scales[0]?.id
                });
            } else {
                // Component-based grading
                const totalWeight = configs.reduce((sum, c) => sum + c.weight, 0);
                if (Math.abs(totalWeight - 100) > 0.01) {
                    alert('Component weights must sum to 100%');
                    return;
                }

                const totalScore = scores.reduce((sum, s) => {
                    const config = configs.find(c => c.name === s.name);
                    if (!config) return sum;
                    const max = s.max_score || 100;
                    const percentage = (s.score / max) * 100;
                    return sum + (percentage * config.weight / 100);
                }, 0);

                await invoke('update_course_grade_details', {
                    repositoryId: course.id,
                    credits: course.credits,
                    semesterId: course.semester_id,
                    manualGrade: totalScore / 10, // Assuming 10-point scale
                    status: 'completed',
                    gradingScaleId: selectedScaleId || scales[0]?.id,
                    componentConfig: JSON.stringify(configs),
                    componentScores: JSON.stringify(scores)
                });
            }
            onUpdate();
            onClose();
        } catch (e) {
            console.error('Failed to save:', e);
            alert('Failed to save grade: ' + e);
        }
    };

    const addComponent = () => {
        const newName = `Component ${configs.length + 1}`;
        setConfigs([...configs, { name: newName, weight: 0 }]);
        setScores([...scores, { name: newName, score: 0, max_score: 100 }]);
    };

    const removeComponent = (index: number) => {
        const name = configs[index].name;
        setConfigs(configs.filter((_, i) => i !== index));
        setScores(scores.filter(s => s.name !== name));
    };

    const updateConfig = (index: number, field: keyof ComponentConfig, value: any) => {
        const newConfigs = [...configs];
        newConfigs[index] = { ...newConfigs[index], [field]: value };
        setConfigs(newConfigs);

        if (field === 'name') {
            const oldName = configs[index].name;
            const newScores = scores.map(s => s.name === oldName ? { ...s, name: value } : s);
            setScores(newScores);
        }
    };

    const updateScore = (name: string, field: keyof ComponentScore, value: number) => {
        const newScores = scores.map(s => s.name === name ? { ...s, [field]: value } : s);
        setScores(newScores);
    };

    const calculateComponentGrade = () => {
        const totalWeight = configs.reduce((sum, c) => sum + c.weight, 0);
        if (totalWeight === 0) return 0;

        return scores.reduce((sum, s) => {
            const config = configs.find(c => c.name === s.name);
            if (!config) return sum;
            const max = s.max_score || 100;
            const percentage = (s.score / max) * 100;
            return sum + (percentage * config.weight / 100);
        }, 0) / 10; // Convert to 10-point scale
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                className="glass-card w-[600px] max-h-[85vh] flex flex-col p-6 rounded-xl border border-border/50 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="p-1.5 rounded-lg bg-border/20">
                                <Award size={18} className="text-text-secondary" />
                            </div>
                            <h2 className="text-xl font-bold text-text-primary">Edit Grade</h2>
                        </div>
                        <p className="text-xs text-text-tertiary ml-9">{course.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-border/20 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-5 p-1 bg-border/10 rounded-lg">
                    <button
                        onClick={() => setMode('direct')}
                        className={cn(
                            "flex-1 py-2 px-3 rounded text-xs font-medium transition-all",
                            mode === 'direct'
                                ? "bg-blue-500 text-white shadow-sm"
                                : "text-text-tertiary hover:text-text-primary"
                        )}
                    >
                        Direct Grade Entry
                    </button>
                    <button
                        onClick={() => setMode('component')}
                        className={cn(
                            "flex-1 py-2 px-3 rounded text-xs font-medium transition-all",
                            mode === 'component'
                                ? "bg-blue-500 text-white shadow-sm"
                                : "text-text-tertiary hover:text-primary"
                        )}
                    >
                        Component-Based
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mb-5">
                    <AnimatePresence mode="wait">
                        {mode === 'direct' ? (
                            <motion.div
                                key="direct"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-4"
                            >
                                {/* Grading Scale Selection */}
                                <div>
                                    <label className="block text-[10px] uppercase text-text-tertiary font-medium tracking-wider mb-2">
                                        Grading Scale
                                    </label>
                                    <select
                                        value={selectedScaleId || scales[0]?.id || ''}
                                        onChange={(e) => setSelectedScaleId(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 bg-bg-surface border border-border/40 rounded-lg text-sm text-text-primary focus:border-blue-500/50 focus:outline-none transition-colors"
                                    >
                                        {scales.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Grade Input */}
                                <div>
                                    <label className="block text-[10px] uppercase text-text-tertiary font-medium tracking-wider mb-2">
                                        Final Grade
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={manualGrade}
                                        onChange={(e) => setManualGrade(e.target.value)}
                                        placeholder="Enter grade..."
                                        className="w-full px-4 py-3 bg-bg-surface border border-border/40 rounded-lg text-lg font-bold text-text-primary focus:border-blue-500/50 focus:outline-none transition-colors"
                                    />
                                </div>

                                {/* Conversion Preview */}
                                {convertedGrade !== null && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Calculator size={14} className={isConverting ? "animate-spin text-blue-500" : "text-blue-500"} />
                                                <span className="text-xs text-text-tertiary">
                                                    {isConverting ? "Converting..." : "Converted to Points:"}
                                                </span>
                                            </div>
                                            <span className="text-sm font-bold text-blue-500">
                                                {convertedGrade.toFixed(2)}
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="component"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-4"
                            >
                                {/* Components List */}
                                <div className="space-y-2">
                                    {configs.map((config, index) => {
                                        const score = scores.find(s => s.name === config.name);
                                        return (
                                            <div key={index} className="p-3 rounded-lg bg-bg-surface border border-border/40">
                                                <div className="flex items-start gap-2 mb-2">
                                                    <input
                                                        type="text"
                                                        value={config.name}
                                                        onChange={(e) => updateConfig(index, 'name', e.target.value)}
                                                        className="flex-1 px-2 py-1 bg-bg-primary border border-border/30 rounded text-xs text-text-primary focus:border-blue-500/50 focus:outline-none"
                                                        placeholder="Component name"
                                                    />
                                                    <button
                                                        onClick={() => removeComponent(index)}
                                                        className="p-1 text-text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="block text-[9px] text-text-tertiary uppercase mb-1">Weight %</label>
                                                        <input
                                                            type="number"
                                                            value={config.weight}
                                                            onChange={(e) => updateConfig(index, 'weight', parseFloat(e.target.value))}
                                                            className="w-full px-2 py-1 bg-bg-primary border border-border/30 rounded text-xs text-text-primary focus:border-blue-500/50 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] text-text-tertiary uppercase mb-1">Score</label>
                                                        <input
                                                            type="number"
                                                            value={score?.score || 0}
                                                            onChange={(e) => updateScore(config.name, 'score', parseFloat(e.target.value))}
                                                            className="w-full px-2 py-1 bg-bg-primary border border-border/30 rounded text-xs text-text-primary focus:border-blue-500/50 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] text-text-tertiary uppercase mb-1">Max</label>
                                                        <input
                                                            type="number"
                                                            value={score?.max_score || 100}
                                                            onChange={(e) => updateScore(config.name, 'max_score', parseFloat(e.target.value))}
                                                            className="w-full px-2 py-1 bg-bg-primary border border-border/30 rounded text-xs text-text-primary focus:border-blue-500/50 focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Add Component Button */}
                                <button
                                    onClick={addComponent}
                                    className="w-full py-2 border border-dashed border-border/50 hover:border-border/70 rounded-lg text-xs text-text-tertiary hover:text-text-primary transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={14} />
                                    Add Component
                                </button>

                                {/* Calculated Grade */}
                                {configs.length > 0 && (
                                    <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-text-tertiary">Calculated Grade:</span>
                                            <span className="text-lg font-bold text-blue-500">
                                                {calculateComponentGrade().toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-border/30">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs text-text-secondary hover:text-text-primary font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <motion.button
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-500 text-white font-medium rounded-lg text-xs hover:bg-blue-600 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        Save Grade
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}
