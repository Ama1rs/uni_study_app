import { X, Clock, BookOpen, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DynamicLineChart } from '../ui/DynamicLineChart';
import { useMetrics } from '../../hooks/useMetrics';

interface MetricsSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

export function MetricsSidebar({ isOpen, onToggle }: MetricsSidebarProps) {
    const { resources, studyTime, focus } = useMetrics();

    return (
        <div
            className={cn(
                "sticky top-0 h-screen border-l border-border bg-bg-surface transition-all duration-300 ease-in-out flex flex-col overflow-hidden",
                isOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-l-0"
            )}
        >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
                <h2 className="text-lg font-semibold text-text-primary">Metrics</h2>
                <button
                    onClick={onToggle}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Metrics Content */}
            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
                <MetricItem
                    icon={Clock}
                    label="Study Time"
                    value={`${studyTime.currentValue.toFixed(1)}h`}
                    subtext="Goal: 20h"
                    color="var(--accent)"
                    data={studyTime.data}
                    labels={studyTime.labels}
                />
                <MetricItem
                    icon={BookOpen}
                    label="Resources"
                    value={resources.currentValue.toString()}
                    subtext="Total items"
                    color="#10B981" // Emerald 500
                    data={resources.data}
                    labels={resources.labels}
                />
                <MetricItem
                    icon={Zap}
                    label="Focus"
                    value={`${focus.currentValue}%`}
                    subtext="Efficiency"
                    color="#F59E0B" // Amber 500
                    data={focus.data}
                    labels={focus.labels}
                />
            </div>
        </div>
    );
}

interface MetricItemProps {
    icon: any;
    label: string;
    value: string;
    subtext: string;
    color: string;
    data: number[];
    labels?: string[];
}

function MetricItem({ icon: Icon, label, value, subtext, color, data, labels }: MetricItemProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-bg-surface border border-border/50">
                        <Icon size={18} className="text-text-secondary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-text-primary">{label}</p>
                        <p className="text-xs text-text-secondary">{subtext}</p>
                    </div>
                </div>
                <span className="text-lg font-bold text-text-primary">{value}</span>
            </div>

            {/* Dynamic Chart */}
            <div className="w-full h-20 rounded-xl overflow-hidden bg-bg-primary">
                <DynamicLineChart
                    data={data}
                    labels={labels}
                    color={color}
                    height={80}
                />
            </div>
        </div>
    );
}
