import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import { LinkType, Resource } from '../../types/node-system';
import { X, Link as LinkIcon, Search } from 'lucide-react';

interface LinkDialogProps {
    sourceId: number;
    targetId?: number;
    sourceTitle?: string;
    targetTitle?: string;
    resources?: Resource[];
    position?: { x: number; y: number } | null;
    onClose: () => void;
    onLinkCreated: () => void;
}

export function LinkDialog({ sourceId, targetId, sourceTitle, targetTitle, resources, position, onClose, onLinkCreated }: LinkDialogProps) {
    const [linkTypes, setLinkTypes] = useState<LinkType[]>([]);
    const [selectedType, setSelectedType] = useState<number | null>(null);
    const [strength, setStrength] = useState(1.0);
    const [bidirectional, setBidirectional] = useState(false);
    const [adjustedPos, setAdjustedPos] = useState(position);
    const dialogRef = useRef<HTMLDivElement>(null);

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
        const handleClickOutside = (event: MouseEvent) => {
            if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    useEffect(() => {
        invoke<LinkType[]>('get_link_types_cmd')
            .then(types => {
                setLinkTypes(types);
                if (types.length > 0) setSelectedType(types[0].id);
            })
            .catch(console.error);
    }, []);

    // Adjust position for screen bounds if popover
    useEffect(() => {
        if (position && dialogRef.current) {
            const rect = dialogRef.current.getBoundingClientRect();
            let newX = position.x;
            let newY = position.y;

            // Offset slightly from cursor
            newX += 10;
            newY += 10;

            if (newX + rect.width > window.innerWidth - 20) {
                newX = window.innerWidth - rect.width - 20;
            }
            if (newY + rect.height > window.innerHeight - 20) {
                newY = window.innerHeight - rect.height - 20;
            }

            setAdjustedPos({ x: newX, y: newY });
        }
    }, [position]);

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

    const containerClasses = position
        ? "fixed bg-bg-surface border border-border rounded-2xl w-[400px] shadow-2xl z-[10000] flex flex-col max-h-[70vh] p-6 animate-in fade-in zoom-in-95 duration-150"
        : "p-6 rounded-2xl w-[500px] shadow-2xl bg-bg-surface border border-border flex flex-col max-h-[90vh]";

    const overlayClasses = position
        ? "fixed inset-0 z-[9999] bg-transparent"
        : "fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] backdrop-blur-sm";

    return createPortal(
        <div className={overlayClasses} onClick={(e) => { if (position && e.target === e.currentTarget) onClose(); }}>
            <div
                ref={dialogRef}
                className={containerClasses}
                style={position && adjustedPos ? {
                    top: adjustedPos.y,
                    left: adjustedPos.x,
                    borderColor: 'var(--border)'
                } : undefined}
            >
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                        <LinkIcon size={20} /> {position ? 'Link Node' : 'Connect Nodes'}
                    </h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-white/5 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4 mb-6 overflow-y-auto flex-1 pr-2 custom-scrollbar">
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
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search resources..."
                                    value={searchTarget}
                                    onChange={e => setSearchTarget(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
                                />
                            </div>
                            <div className="h-32 overflow-y-auto border border-white/5 rounded-lg bg-black/10 p-1 custom-scrollbar">
                                {filteredTargets.map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => setSelectedTargetId(r.id)}
                                        className={`w-full text-left px-3 py-1.5 rounded text-xs flex justify-between items-center hover:bg-white/5 transition-colors mb-0.5 ${selectedTargetId === r.id ? 'bg-accent/20 text-accent font-medium' : 'text-text-secondary'}`}
                                    >
                                        <span className="truncate mr-2">{r.title}</span>
                                        <span className="text-[9px] opacity-50 px-1 border border-white/10 rounded shrink-0">{r.type}</span>
                                    </button>
                                ))}
                                {filteredTargets.length === 0 && (
                                    <div className="text-center text-text-tertiary text-[10px] py-4">No matching resources</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">Relationship Type</label>
                        <select
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
                            value={selectedType || ''}
                            onChange={(e) => setSelectedType(Number(e.target.value))}
                        >
                            {linkTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.name.charAt(0).toUpperCase() + t.name.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-text-secondary">Strength</label>
                            <span className="text-xs font-mono text-accent">{strength.toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.1"
                            value={strength}
                            onChange={(e) => setStrength(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                        />
                    </div>

                    <div
                        className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                        onClick={() => setBidirectional(!bidirectional)}
                    >
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${bidirectional ? 'bg-accent text-white scale-110 shadow-lg shadow-accent/20' : 'border-2 border-white/10 text-transparent'}`}>
                            {bidirectional && <span className="text-[10px]">✓</span>}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-text-primary">Bidirectional</span>
                            <span className="text-[10px] text-text-tertiary">Apply link in both directions</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-auto pt-4 border-t border-white/5">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all">Cancel</button>
                    <button onClick={handleCreate} className="px-6 py-2 rounded-lg text-sm text-white bg-accent hover:opacity-90 transition-all font-bold shadow-lg shadow-accent/20">Create Link</button>
                </div>
            </div>
        </div>,
        document.body
    );
}

