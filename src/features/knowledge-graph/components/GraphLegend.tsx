import { Card } from '../../../components/ui/Card';

export const RESOURCE_COLORS = {
    note: '#fbbf24',     // amber-400 (User Created)
    pdf: '#38bdf8',      // sky-400 (Source Material)
    image: '#c084fc',    // purple-400 (Media)
    video: '#c084fc',    // purple-400 (Media)
    document: '#38bdf8', // sky-400 (Source Material)
    book: '#38bdf8',     // sky-400 (Source Material)
    default: '#94a3b8'   // slate-400 (Generic)
} as const;

export function GraphLegend() {
    return (
        <Card variant="flat" padding="sm" className="absolute top-24 left-8 bg-bg-surface/80 backdrop-blur-md border-border/50 shadow-xl z-10 w-auto min-w-[120px] pointer-events-none">
            <h4 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Concept Types</h4>
            <div className="space-y-1.5">
                <LegendItem color={RESOURCE_COLORS.note} label="Notes" />
                <LegendItem color={RESOURCE_COLORS.pdf} label="Sources (PDF, Docs)" />
                <LegendItem color={RESOURCE_COLORS.video} label="Media" />
            </div>
        </Card>
    );
}

function LegendItem({ color, label }: { color: string, label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
            <span className="text-xs font-medium text-text-secondary">{label}</span>
        </div>
    );
}
