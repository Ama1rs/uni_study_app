import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { LinkType, Resource } from '../../types/node-system';
import { X, Link as LinkIcon, Search } from 'lucide-react';

interface LinkDialogProps {
    sourceId: number;
    targetId?: number;
    sourceTitle?: string;
    targetTitle?: string;
    resources?: Resource[];
    onClose: () => void;
    onLinkCreated: () => void;
}

export function LinkDialog({ sourceId, targetId, sourceTitle, targetTitle, resources, onClose, onLinkCreated }: LinkDialogProps) {
    const [linkTypes, setLinkTypes] = useState<LinkType[]>([]);
    const [selectedType, setSelectedType] = useState<number | null>(null);
    const [strength, setStrength] = useState(1.0);
    const [bidirectional, setBidirectional] = useState(false);

    // Target selection state
    const [selectedTargetId, setSelectedTargetId] = useState<number | null>(targetId || null);
    const [searchTarget, setSearchTarget] = useState('');

    const sourceResource = resources?.find(r => r.id === sourceId);
    const displaySourceTitle = sourceTitle || sourceResource?.title || 'Unknown Source';

    const targetResource = resources?.find(r => r.id === selectedTargetId);
    const displayTargetTitle = targetTitle || targetResource?.title || (selectedTargetId ? 'Unknown Target' : 'Select Target...');

    const filteredTargets = resources?.filter(r =>
        r.id !== sourceId && // Can't link to self
        (r.title.toLowerCase().includes(searchTarget.toLowerCase()) ||
            (r.tags && r.tags.toLowerCase().includes(searchTarget.toLowerCase())))
    ) || [];

    useEffect(() => {
        invoke<LinkType[]>('get_link_types_cmd')
            .then(types => {
                setLinkTypes(types);
                if (types.length > 0) setSelectedType(types[0].id);
            })
            .catch(console.error);
    }, []);

    async function handleCreate() {
        if (!selectedTargetId) {
            alert("Please select a target node");
            return;
        }
        try {
            await invoke('create_link_v2_cmd', {
                sourceId,
                targetId: selectedTargetId,
                typeId: selectedType,
                strength,
                bidirectional
            });
            onLinkCreated();
            onClose();
        } catch (e) {
            console.error("Failed to create link:", e);
            alert("Failed to create link");
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="p-6 rounded-2xl w-[500px] shadow-2xl bg-bg-surface border border-border flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                        <LinkIcon size={20} /> Connect Nodes
                    </h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4 mb-6 overflow-y-auto flex-1 pr-2">
                    {/* Source -> Target Display */}
                    <div className="text-sm text-text-secondary bg-white/5 p-3 rounded-xl flex items-center gap-2">
                        <span className="font-semibold text-text-primary truncate max-w-[45%]">{displaySourceTitle}</span>
                        <span className="opacity-50">→</span>
                        <span className={`font-semibold truncate max-w-[45%] ${selectedTargetId ? 'text-text-primary' : 'text-text-secondary italic'}`}>
                            {displayTargetTitle}
                        </span>
                    </div>

                    {/* Target Selector (if not provided) */}
                    {!targetId && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Select Target Node</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search resources..."
                                    value={searchTarget}
                                    onChange={e => setSearchTarget(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                                />
                            </div>
                            <div className="h-40 overflow-y-auto border border-white/10 rounded-lg bg-black/10 p-1">
                                {filteredTargets.map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => setSelectedTargetId(r.id)}
                                        className={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center hover:bg-white/5 transition-colors ${selectedTargetId === r.id ? 'bg-accent/20 text-accent' : 'text-text-secondary'}`}
                                    >
                                        <span className="truncate">{r.title}</span>
                                        <span className="text-[10px] opacity-70 border border-white/10 px-1 rounded">{r.type}</span>
                                    </button>
                                ))}
                                {filteredTargets.length === 0 && (
                                    <div className="text-center text-text-tertiary text-xs py-4">No matching resources found</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">Relationship Type</label>
                        <select
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                            value={selectedType || ''}
                            onChange={(e) => setSelectedType(Number(e.target.value))}
                        >
                            {linkTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.name.charAt(0).toUpperCase() + t.name.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">Connection Strength: {strength.toFixed(1)}</label>
                        <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.1"
                            value={strength}
                            onChange={(e) => setStrength(parseFloat(e.target.value))}
                            className="w-full accent-accent"
                        />
                    </div>

                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setBidirectional(!bidirectional)}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${bidirectional ? 'bg-accent border-accent text-white' : 'border-white/20 text-transparent'}`}>
                            ✓
                        </div>
                        <span className="text-sm text-text-primary">Bidirectional Connection</span>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-auto">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-white/5 transition-colors">Cancel</button>
                    <button onClick={handleCreate} className="px-4 py-2 rounded-lg text-sm text-white bg-accent hover:opacity-90 transition-opacity font-medium">Create Link</button>
                </div>
            </div>
        </div>
    );
}
