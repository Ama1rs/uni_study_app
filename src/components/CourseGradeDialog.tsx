import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ComponentConfig, ComponentScore, GradingScale } from '../types/grading';
import { X, Plus, Trash2, Calculator } from 'lucide-react';

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

    const addComponent = () => {
        setConfigs([...configs, { name: 'New Component', weight: 0.2 }]);
    };

    const removeComponent = (idx: number) => {
        const newConfigs = [...configs];
        const removed = newConfigs.splice(idx, 1)[0];
        setConfigs(newConfigs);
        // Remove score if exists
        setScores(scores.filter(s => s.name !== removed.name));
    };

    const updateConfig = (idx: number, field: keyof ComponentConfig, val: any) => {
        const newConfigs = [...configs];
        // @ts-ignore
        newConfigs[idx][field] = val;
        setConfigs(newConfigs);
        // Rename score if name changed
        if (field === 'name') {
            // Logic to rename score entry too? Complex. Let's assume user re-enters score.
        }
    };

    const updateScore = (name: string, val: number) => {
        const newScores = scores.filter(s => s.name !== name);
        newScores.push({ name, score: val });
        setScores(newScores);
    };

    const getScore = (name: string) => scores.find(s => s.name === name)?.score || '';

    // Calculate current weighted score
    const currentTotal = configs.reduce((acc, conf) => {
        const s = scores.find(sc => sc.name === conf.name);
        if (s) return acc + (s.score * conf.weight);
        return acc;
    }, 0);

    const totalWeight = configs.reduce((acc, conf) => acc + conf.weight, 0);

    const handleSave = async () => {
        try {
            await invoke('update_course_grade_details', {
                repository_id: course.id,
                credits: course.credits,
                semester_id: course.semester_id,
                manual_grade: mode === 'direct' ? (parseFloat(manualGrade) || null) : null,
                status: course.status,
                component_config: mode === 'component' ? JSON.stringify(configs) : null,
                component_scores: mode === 'component' ? JSON.stringify(scores) : null,
                grading_scale_id: selectedScaleId
            });
            onUpdate();
            onClose();
        } catch (e) {
            console.error(e);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass-card w-[600px] p-6 rounded-lg border border-white/10 shadow-xl bg-bg-surface flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white font-mono">{course.name}</h2>
                        <p className="text-xs text-text-tertiary font-mono uppercase tracking-wider">Grade Details</p>
                    </div>
                    <button onClick={onClose} className="text-text-tertiary hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex bg-bg-primary p-1 rounded-lg mb-6 self-start border border-border">
                    <button
                        onClick={() => setMode('direct')}
                        className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${mode === 'direct' ? 'bg-white/10 text-white' : 'text-text-tertiary hover:text-text-secondary'}`}
                    >
                        Direct Entry
                    </button>
                    <button
                        onClick={() => setMode('component')}
                        className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${mode === 'component' ? 'bg-white/10 text-white' : 'text-text-tertiary hover:text-text-secondary'}`}
                    >
                        Components
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    {mode === 'direct' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">Final Grade Point</label>
                                <input
                                    type="number"
                                    className="w-full bg-bg-primary border border-border rounded px-3 py-2 text-lg font-mono outline-none focus:border-accent text-white"
                                    value={manualGrade}
                                    onChange={e => setManualGrade(e.target.value)}
                                    placeholder="e.g. 9.0 or 4.0"
                                />
                                <p className="text-[10px] text-text-tertiary mt-2">Enter the final point value directly. Useful for historical data or simple grading.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b border-border/50 pb-2 mb-2">
                                <span className="text-xs font-mono text-text-tertiary uppercase">Components</span>
                                <span className="text-xs font-mono text-accent">Total Weight: {totalWeight.toFixed(2)}</span>
                            </div>

                            {configs.map((conf, idx) => (
                                <div key={idx} className="flex gap-2 items-center mb-2">
                                    <input
                                        className="flex-1 bg-bg-primary border border-border rounded px-2 py-1.5 text-sm outline-none focus:border-accent text-white font-mono"
                                        value={conf.name}
                                        onChange={e => updateConfig(idx, 'name', e.target.value)}
                                        placeholder="Name"
                                    />
                                    <div className="w-20 relative">
                                        <input
                                            type="number"
                                            className="w-full bg-bg-primary border border-border rounded px-2 py-1.5 text-sm outline-none focus:border-accent text-white font-mono text-right pr-6"
                                            value={conf.weight}
                                            onChange={e => updateConfig(idx, 'weight', parseFloat(e.target.value))}
                                            step="0.1"
                                        />
                                        <span className="absolute right-2 top-1.5 text-xs text-text-tertiary">%</span>
                                    </div>
                                    <input
                                        type="number"
                                        className="w-24 bg-bg-primary border border-border rounded px-2 py-1.5 text-sm outline-none focus:border-accent text-white font-mono text-right placeholder-text-tertiary"
                                        placeholder="Score"
                                        value={getScore(conf.name)}
                                        onChange={e => updateScore(conf.name, parseFloat(e.target.value))}
                                    />
                                    <button onClick={() => removeComponent(idx)} className="text-text-tertiary hover:text-red-400 p-1">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}

                            <button onClick={addComponent} className="flex items-center gap-1 text-xs text-accent hover:underline font-mono mt-2">
                                <Plus size={12} /> Add Component
                            </button>

                            <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10 flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-text-tertiary font-mono uppercase">Calculated Score</p>
                                    <p className="text-2xl font-bold font-mono text-white">{currentTotal.toFixed(2)}</p>
                                </div>
                                <Calculator className="text-white/20" size={32} />
                            </div>
                        </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-border/50">
                        <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-2 font-mono">Grading Scale Override (Optional)</label>
                        <select
                            className="w-full bg-bg-primary border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent text-white font-mono"
                            value={selectedScaleId || ''}
                            onChange={e => setSelectedScaleId(e.target.value ? parseInt(e.target.value) : null)}
                        >
                            <option value="">Use Program Default</option>
                            {scales.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-white font-mono">Cancel</button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-accent text-black font-bold rounded text-sm font-mono"
                    >
                        Save Grade
                    </button>
                </div>
            </div>
        </div>
    );
}
