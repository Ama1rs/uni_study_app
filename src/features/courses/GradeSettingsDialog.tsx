import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import logger from '@/lib/logger';
import { Program } from '../../types/grading';
import { X, Trash2, Plus, GraduationCap, Award } from 'lucide-react';
import { AcademicOnboardingWizard } from './AcademicOnboardingWizard';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

interface GradeSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export function GradeSettingsDialog({ isOpen, onClose, onSave }: GradeSettingsDialogProps) {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: number, name: string } | null>(null);
    const [hoveredProgram, setHoveredProgram] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    async function loadData() {
        try {
            const p = await invoke<Program[]>('get_programs');
            setPrograms(p);

            // Auto-select first program if none selected
            if (p.length > 0 && !selectedProgramId) {
                setSelectedProgramId(p[0].id);
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function handleSave() {
        if (selectedProgramId) {
try {
                logger.debug('[GradeSettings] Setting user program to:', selectedProgramId);
                await invoke('set_user_program', { programId: selectedProgramId });
                logger.debug('[GradeSettings] ✓ Program set successfully');
                onSave();
                onClose();
            } catch (e) {
                console.error('[GradeSettings] ✗ Failed to set program:', e);
                alert(`Failed to save program: ${e}`);
            }
        } else {
            console.warn('[GradeSettings] No program selected');
        }
    }

    async function handleDelete(id: number) {
        try {
            await invoke('delete_program', { id });
            await loadData();
            onSave();
            setDeleteConfirm(null);
            if (selectedProgramId === id) {
                setSelectedProgramId(null);
            }
        } catch (err) {
            alert('Failed to delete: ' + err);
        }
    }

    if (!isOpen) return null;

    return (
        <>
            <AcademicOnboardingWizard
                isOpen={showWizard}
                onComplete={() => {
                    setShowWizard(false);
                    loadData();
                    onSave();
                }}
            />

            <ConfirmDialog
                isOpen={!!deleteConfirm}
                title="Delete Academic Program"
                description={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone and will remove all associated data.`}
                confirmText="Delete Program"
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
                onCancel={() => setDeleteConfirm(null)}
            />

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
                    transition={{ type: "spring", duration: 0.4 }}
                    className="glass-card w-[550px] max-h-[80vh] flex flex-col p-6 rounded-xl border border-border/50 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="p-1.5 rounded-lg bg-border/20">
                                    <GraduationCap size={18} className="text-text-secondary" />
                                </div>
                                <h2 className="text-xl font-bold text-text-primary">Grading Settings</h2>
                            </div>
                            <p className="text-xs text-text-tertiary ml-9">Manage your academic programs and grading scales</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-border/20 transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {!showWizard ? (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-[10px] uppercase text-text-tertiary font-medium tracking-wider flex items-center gap-1.5">
                                    <div className="w-0.5 h-3 bg-text-secondary rounded-full" />
                                    Your Programs
                                </label>
                                <span className="text-[10px] text-text-tertiary">
                                    {programs.length} {programs.length === 1 ? 'program' : 'programs'}
                                </span>
                            </div>

                            {/* Programs List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mb-5">
                                {programs.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-col items-center justify-center py-12"
                                    >
                                        <div className="w-16 h-16 rounded-xl bg-border/10 border border-border/30 flex items-center justify-center mb-3">
                                            <Award size={28} className="text-text-tertiary" />
                                        </div>
                                        <h3 className="text-sm font-bold text-text-primary mb-1.5">No Programs Yet</h3>
                                        <p className="text-xs text-text-tertiary text-center max-w-xs mb-4">
                                            Create your first academic program to start tracking your grades.
                                        </p>
                                    </motion.div>
                                ) : (
                                    <div className="space-y-2">
                                        <AnimatePresence>
                                            {programs.map((p, index) => (
                                                <motion.div
                                                    key={p.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 10 }}
                                                    transition={{ delay: index * 0.04 }}
                                                    className={cn(
                                                        "relative p-3.5 rounded-lg border cursor-pointer transition-all group overflow-hidden",
                                                        selectedProgramId === p.id
                                                            ? "bg-blue-500/5 border-blue-500/30 shadow-sm"
                                                            : "bg-bg-surface/50 border-border/40 hover:border-border/60 hover:bg-bg-hover/50"
                                                    )}
                                                    onClick={() => setSelectedProgramId(p.id)}
                                                    onMouseEnter={() => setHoveredProgram(p.id)}
                                                    onMouseLeave={() => setHoveredProgram(null)}
                                                    whileHover={{ scale: 1.01 }}
                                                    whileTap={{ scale: 0.99 }}
                                                >
                                                    {/* Selection Indicator */}
                                                    <div className={cn(
                                                        "absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 transition-all",
                                                        selectedProgramId === p.id ? "opacity-100" : "opacity-0"
                                                    )} />

                                                    <div className="relative flex items-start justify-between gap-3">
                                                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                                            <div className={cn(
                                                                "w-9 h-9 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                                                                selectedProgramId === p.id
                                                                    ? "bg-blue-500/10 border border-blue-500/20"
                                                                    : "bg-border/10 border border-border/30"
                                                            )}>
                                                                <Award size={16} className={cn(
                                                                    selectedProgramId === p.id ? "text-blue-500" : "text-text-tertiary"
                                                                )} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-sm text-text-primary group-hover:text-text-primary transition-colors truncate">
                                                                    {p.name}
                                                                </div>
                                                                <div className="flex items-center gap-2.5 mt-1.5">
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="w-1 h-1 rounded-full bg-blue-500/60" />
                                                                        <span className="text-[10px] text-text-tertiary">
                                                                            {p.total_required_credits} Credits
                                                                        </span>
                                                                    </div>
                                                                    {selectedProgramId === p.id && (
                                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                                                                            <div className="w-1 h-1 rounded-full bg-blue-500" />
                                                                            <span className="text-[9px] text-blue-500 font-medium uppercase tracking-wide">
                                                                                Active
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Delete Button */}
                                                        <motion.button
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{
                                                                opacity: hoveredProgram === p.id ? 1 : 0,
                                                                scale: hoveredProgram === p.id ? 1 : 0.9
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeleteConfirm({ id: p.id, name: p.name });
                                                            }}
                                                            className="p-1.5 text-text-tertiary hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-all"
                                                            title="Delete Program"
                                                        >
                                                            <Trash2 size={14} />
                                                        </motion.button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>

                            {/* Create New Program Button */}
                            <motion.button
                                onClick={() => setShowWizard(true)}
                                className="w-full py-3 px-4 rounded-lg border border-dashed border-border/50 hover:border-border/70 bg-border/5 hover:bg-border/10 transition-all group mb-5"
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-border/20 border border-border/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <Plus size={16} className="text-text-secondary" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-medium text-text-primary">Create New Program</div>
                                        <div className="text-[10px] text-text-tertiary">Launch setup wizard</div>
                                    </div>
                                </div>
                            </motion.button>

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
                                    disabled={!selectedProgramId}
                                    className="px-6 py-2 bg-blue-500 text-white font-medium rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-all"
                                    whileHover={{ scale: selectedProgramId ? 1.02 : 1 }}
                                    whileTap={{ scale: selectedProgramId ? 0.98 : 1 }}
                                >
                                    Save Changes
                                </motion.button>
                            </div>
                        </div>
                    ) : null}
                </motion.div>
            </motion.div>
        </>
    );
}
