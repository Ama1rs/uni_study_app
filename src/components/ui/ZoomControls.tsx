import { Minus, Plus, Maximize } from 'lucide-react';

interface ZoomControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFitView: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut, onFitView }: ZoomControlsProps) {
    return (
        <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-bg-surface border border-border rounded-xl shadow-xl p-1.5 z-10">
            <button
                onClick={onZoomIn}
                className="p-2 rounded-lg hover:bg-white/10 text-text-primary transition-colors"
                title="Zoom In"
            >
                <Plus size={20} />
            </button>
            <button
                onClick={onZoomOut}
                className="p-2 rounded-lg hover:bg-white/10 text-text-primary transition-colors"
                title="Zoom Out"
            >
                <Minus size={20} />
            </button>
            <div className="h-px bg-border my-0.5" />
            <button
                onClick={onFitView}
                className="p-2 rounded-lg hover:bg-white/10 text-text-primary transition-colors"
                title="Fit View"
            >
                <Maximize size={20} />
            </button>
        </div>
    );
}
