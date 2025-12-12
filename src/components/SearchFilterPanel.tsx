import { Filter, X, Check } from 'lucide-react';


interface SearchFilterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTypes: string[];
    onToggleType: (type: string) => void;
    availableTypes: string[];
    selectedStatus: string[];
    onToggleStatus: (status: string) => void;
    availableStatuses: string[];
}

export function SearchFilterPanel({
    isOpen,
    onClose,
    selectedTypes,
    onToggleType,
    availableTypes,
    selectedStatus,
    onToggleStatus,
    availableStatuses
}: SearchFilterPanelProps) {
    if (!isOpen) return null;

    return (
        <div className="absolute top-[140px] left-6 z-40 w-64 bg-bg-surface border border-border rounded-xl shadow-xl p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                    <Filter size={16} /> Filters
                </h3>
                <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                    <X size={16} />
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="text-xs font-medium text-text-secondary uppercase mb-2">Resource Type</div>
                    <div className="space-y-1">
                        {availableTypes.map(type => (
                            <button
                                key={type}
                                onClick={() => onToggleType(type)}
                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${selectedTypes.includes(type) ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-white/5'
                                    }`}
                            >
                                <span className="capitalize">{type}</span>
                                {selectedTypes.includes(type) && <Check size={14} />}
                            </button>
                        ))}
                    </div>
                </div>

                {availableStatuses.length > 0 && (
                    <div>
                        <div className="text-xs font-medium text-text-secondary uppercase mb-2">Learning Status</div>
                        <div className="space-y-1">
                            {availableStatuses.map(status => (
                                <button
                                    key={status}
                                    onClick={() => onToggleStatus(status)}
                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${selectedStatus.includes(status) ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-white/5'
                                        }`}
                                >
                                    <span className="capitalize">{status}</span>
                                    {selectedStatus.includes(status) && <Check size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {(selectedTypes.length > 0 || selectedStatus.length > 0) && (
                <div className="pt-3 mt-3 border-t border-border">
                    <button
                        onClick={() => {
                            // We rely on parent to handle clearing, but for now we basically just need to untoggle all.
                            // For this MVP component we might not need a "Clear All" logic inside if we don't pass it.
                            // Let's assume the user manually untoggles or we add a prop later. 
                            // Actually, let's just emit a clear event if needed, but manual toggle is fine for now.
                        }}
                        className="text-xs text-text-secondary hover:text-text-primary w-full text-center"
                    >
                        (Select to filter)
                    </button>
                </div>
            )}
        </div>
    );
}
