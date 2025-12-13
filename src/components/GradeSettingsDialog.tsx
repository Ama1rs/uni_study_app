import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { GradingScale, Program } from '../types/grading';
import { X } from 'lucide-react';

interface GradeSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export function GradeSettingsDialog({ isOpen, onClose, onSave }: GradeSettingsDialogProps) {
    const [scales, setScales] = useState<GradingScale[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
    const [isCreatingProgram, setIsCreatingProgram] = useState(false);

    // New Program Form
    const [newProgramName, setNewProgramName] = useState('');
    const [newProgramCredits, setNewProgramCredits] = useState('160');
    const [newProgramScaleId, setNewProgramScaleId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    async function loadData() {
        try {
            const s = await invoke<GradingScale[]>('get_grading_scales');
            const p = await invoke<Program[]>('get_programs');
            setScales(s);
            setPrograms(p);
            // Default select? Fetch user profile... (omitted for now, assume user knows)
        } catch (e) {
            console.error(e);
        }
    }

    async function handleSave() {
        if (selectedProgramId) {
            try {
                await invoke('set_user_program', { program_id: selectedProgramId });
                onSave();
                onClose();
            } catch (e) {
                console.error(e);
            }
        }
    }

    async function handleCreateProgram() {
        if (!newProgramName || !newProgramCredits) return;
        try {
            const id = await invoke<number>('create_program', {
                name: newProgramName,
                total_required_credits: parseFloat(newProgramCredits),
                grading_scale_id: newProgramScaleId
            });
            await invoke('set_user_program', { program_id: id });
            onSave();
            onClose();
        } catch (e) {
            console.error(e);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass-card w-[500px] p-6 rounded-lg border border-white/10 shadow-xl bg-bg-surface">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white font-mono">Grading Settings</h2>
                    <button onClick={onClose} className="text-text-tertiary hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {!isCreatingProgram ? (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-2 font-mono">Select Program</label>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {programs.map(p => (
                                    <div
                                        key={p.id}
                                        className={`p-3 rounded border cursor-pointer transition-all ${selectedProgramId === p.id ? 'bg-accent/20 border-accent text-white' : 'bg-white/5 border-transparent hover:bg-white/10 text-text-secondary'}`}
                                        onClick={() => setSelectedProgramId(p.id)}
                                    >
                                        <div className="font-medium font-mono">{p.name}</div>
                                        <div className="text-xs text-text-tertiary">{p.total_required_credits} Credits</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setIsCreatingProgram(true)}
                            className="text-xs text-accent hover:underline font-mono"
                        >
                            + Create New Program
                        </button>

                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-white font-mono">Cancel</button>
                            <button
                                onClick={handleSave}
                                disabled={!selectedProgramId}
                                className="px-6 py-2 bg-accent text-black font-bold rounded text-sm font-mono disabled:opacity-50"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">Program Name</label>
                            <input
                                className="w-full bg-bg-primary border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent text-white font-mono"
                                value={newProgramName}
                                onChange={e => setNewProgramName(e.target.value)}
                                placeholder="e.g. B.Tech Computer Science"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">Total Credits</label>
                            <input
                                type="number"
                                className="w-full bg-bg-primary border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent text-white font-mono"
                                value={newProgramCredits}
                                onChange={e => setNewProgramCredits(e.target.value)}
                                placeholder="160"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">Grading Scale</label>
                            <select
                                className="w-full bg-bg-primary border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent text-white font-mono"
                                onChange={e => setNewProgramScaleId(e.target.value ? parseInt(e.target.value) : null)}
                            >
                                <option value="">Default (10-point)</option>
                                {scales.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsCreatingProgram(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-white font-mono">Back</button>
                            <button
                                onClick={handleCreateProgram}
                                className="px-6 py-2 bg-accent text-black font-bold rounded text-sm font-mono"
                            >
                                Create Program
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
