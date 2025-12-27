
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, Star, Clock, BookOpen, Activity } from 'lucide-react';
import { ResourceMetadata } from '../../types/node-system';

interface NodeDetailPanelProps {
    nodeId: number;
    title: string;
    type: string;
    onClose: () => void;
    onMetadataChange?: () => void;
}

export function NodeDetailPanel({ nodeId, title, type, onClose, onMetadataChange }: NodeDetailPanelProps) {
    const [loading, setLoading] = useState(true);
    const [metadata, setMetadata] = useState<ResourceMetadata>({
        resource_id: nodeId,
        importance: 1,
        status: 'unreviewed',
        difficulty: 'intermediate',
        time_estimate: 0,
        last_reviewed_at: undefined
    });

    useEffect(() => {
        loadMetadata();
    }, [nodeId]);

    async function loadMetadata() {
        setLoading(true);
        try {
            const data = await invoke<ResourceMetadata | null>('get_resource_metadata_cmd', { resourceId: nodeId });
            if (data) {
                setMetadata(data);
            } else {
                // Default
                setMetadata({
                    resource_id: nodeId,
                    importance: 1,
                    status: 'unreviewed',
                    difficulty: 'intermediate',
                    time_estimate: 0
                });
            }
        } catch (e) {
            console.error("Failed to load metadata:", e);
        } finally {
            setLoading(false);
        }
    }

    async function saveMetadata(newMeta: ResourceMetadata) {
        setMetadata(newMeta);
        try {
            await invoke('update_resource_metadata_cmd', { meta: newMeta });
            if (onMetadataChange) onMetadataChange();
        } catch (e) {
            console.error("Failed to save metadata:", e);
        }
    }

    if (loading) return <div className="w-80 h-full border-l border-border bg-bg-surface backdrop-blur-md p-6 absolute right-0 top-0 z-20 flex items-center justify-center text-text-secondary">Loading...</div>;

    return (
        <div className="w-80 h-full border-l border-border bg-bg-surface p-6 absolute right-0 top-0 z-30 flex flex-col shadow-2xl transition-all" style={{ borderColor: 'var(--border)' }}>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-xl font-bold text-text-primary leading-tight">{title}</h2>
                    <span className="text-xs uppercase tracking-wider text-text-secondary mt-1 inline-block">{type}</span>
                </div>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="space-y-6 overflow-y-auto flex-1 pr-2">
                {/* Importance */}
                <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                        <Star size={14} /> Importance
                    </div>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(rating => (
                            <button
                                key={rating}
                                onClick={() => saveMetadata({ ...metadata, importance: rating })}
                                className={`p-1.5 rounded-full transition-all ${metadata.importance >= rating ? 'text-accent scale-110' : 'text-text-tertiary hover:text-accent/50'}`}
                            >
                                <Star size={18} fill={metadata.importance >= rating ? "currentColor" : "none"} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                        <Activity size={14} /> Status
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {(['unreviewed', 'reviewing', 'mastered'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => saveMetadata({ ...metadata, status: s })}
                                className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${metadata.status === s
                                    ? s === 'mastered' ? 'bg-accent/20 text-accent border-accent/50' : s === 'reviewing' ? 'bg-accent/10 text-accent border-accent/30' : 'bg-border text-text-secondary border-border'
                                    : 'border-border hover:bg-bg-hover text-text-tertiary'
                                    }`}
                            >
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Difficulty */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                        <BookOpen size={14} /> Difficulty
                    </div>
                    <select
                        value={metadata.difficulty}
                        onChange={(e) => saveMetadata({ ...metadata, difficulty: e.target.value as any })}
                        className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors hover:bg-bg-hover"
                    >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>

                {/* Time Estimate */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                        <Clock size={14} /> Time Estimate (min)
                    </div>
                    <input
                        type="number"
                        min="0"
                        value={metadata.time_estimate}
                        onChange={(e) => saveMetadata({ ...metadata, time_estimate: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors hover:bg-bg-hover"
                    />
                </div>
            </div>
        </div>
    );
}
