import { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring, animate } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { GradingScale, ProjectionResult } from '../../../types/grading';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PerformanceTimelineProps {
    displayChart: { val: number, label: string, isFuture: boolean, id?: number }[];
    scales: GradingScale[];
    projection: ProjectionResult | null;
}

export function PerformanceTimeline({ displayChart, scales, projection }: PerformanceTimelineProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    // Smooth the drag movement
    const smoothX = useSpring(x, { damping: 40, stiffness: 300 });

    const itemWidth = 100; // Reduced width for better fit

    useEffect(() => {
        // Initial center
        if (containerRef.current && displayChart.length > 0) {
            const width = containerRef.current.offsetWidth;
            const startX = (width / 2) - (itemWidth / 2);
            x.set(startX);
        }
    }, [displayChart.length]);

    const handleDragEnd = () => {
        setIsDragging(false);
        const currentX = x.get();
        const containerWidth = containerRef.current?.offsetWidth || 0;
        const center = containerWidth / 2;

        // Calculate which index is closest to the center
        const targetIndex = Math.round((center - currentX - (itemWidth / 2)) / itemWidth);
        const clampedIndex = Math.max(0, Math.min(displayChart.length - 1, targetIndex));

        setActiveIndex(clampedIndex);

        // Snap to center
        const finalX = center - (clampedIndex * itemWidth) - (itemWidth / 2);
        animate(x, finalX, { type: "spring", damping: 25, stiffness: 180 });
    };

    const navigateTo = (index: number) => {
        const clampedIndex = Math.max(0, Math.min(displayChart.length - 1, index));
        setActiveIndex(clampedIndex);

        const containerWidth = containerRef.current?.offsetWidth || 0;
        const center = containerWidth / 2;
        const finalX = center - (clampedIndex * itemWidth) - (itemWidth / 2);
        animate(x, finalX, { type: "spring", damping: 25, stiffness: 180 });
    };

    if (displayChart.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
        >
            <div className="glass-card p-5 rounded-xl border border-border/40 overflow-hidden relative">
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div>
                        <h3 className="font-bold text-sm text-text-primary uppercase tracking-wide flex items-center gap-2">
                            <div className="w-0.5 h-4 bg-text-secondary rounded-full" />
                            Performance Timeline
                        </h3>
                        <p className="text-[10px] text-text-tertiary mt-0.5">Scroll through your academic journey</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-[9px] text-text-tertiary uppercase font-medium">Past</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-purple-500" />
                                <span className="text-[9px] text-text-tertiary uppercase font-medium">Required</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => navigateTo(activeIndex - 1)}
                                disabled={activeIndex === 0}
                                className="p-1 rounded bg-border/20 border border-border/40 hover:border-border/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={12} className="text-text-secondary" />
                            </button>
                            <button
                                onClick={() => navigateTo(activeIndex + 1)}
                                disabled={activeIndex === displayChart.length - 1}
                                className="p-1 rounded bg-border/20 border border-border/40 hover:border-border/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={12} className="text-text-secondary" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Target Line Overlay */}
                {projection?.target_cgpa && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="absolute left-5 right-5 border-t border-dashed border-purple-500/30 z-0 pointer-events-none"
                        style={{
                            bottom: `calc(${(projection.target_cgpa / (scales[0]?.config?.max_point || 10)) * 100}% + 2.5rem)`
                        }}
                    >
                        <div className="absolute right-0 -top-4 bg-purple-500/10 backdrop-blur-sm px-2 py-0.5 rounded border border-purple-500/20 text-[9px] text-purple-500 font-medium">
                            Target: {projection.target_cgpa.toFixed(2)}
                        </div>
                    </motion.div>
                )}

                <div
                    ref={containerRef}
                    className={cn(
                        "h-56 relative flex items-center overflow-visible z-10 transition-all",
                        isDragging ? "cursor-grabbing" : "cursor-grab"
                    )}
                >
                    <motion.div
                        drag="x"
                        dragConstraints={containerRef}
                        dragElastic={0.1}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={handleDragEnd}
                        style={{ x: smoothX }}
                        className="flex items-end h-full"
                    >
                        {displayChart.map((item, i) => (
                            <TimelineItem
                                key={i}
                                item={item}
                                index={i}
                                x={smoothX}
                                itemWidth={itemWidth}
                                containerRef={containerRef}
                                maxPoint={scales[0]?.config?.max_point || 10}
                                isActive={i === activeIndex}
                                isImpossible={item.isFuture && item.val > (scales[0]?.config?.max_point || 10)}
                            />
                        ))}
                    </motion.div>
                </div>

                {/* Current Selection Label */}
                <div className="mt-4 flex items-center justify-center gap-3 relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-border/10 border border-border/30">
                        <span className="text-[10px] text-text-tertiary uppercase tracking-wide">
                            {displayChart[activeIndex]?.label || '---'}
                        </span>
                        <div className="h-3 w-px bg-border/50" />
                        <span className="text-sm font-bold text-text-primary">
                            {displayChart[activeIndex]?.val.toFixed(2) || '-.--'}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function TimelineItem({ item, index, x, itemWidth, containerRef, maxPoint, isActive, isImpossible }: any) {
    const itemCenter = index * itemWidth + itemWidth / 2;

    // Calculate distance from center of container
    const opacity = useTransform(x, (latestX: number) => {
        if (!containerRef.current) return 1;
        const containerWidth = containerRef.current.offsetWidth;
        const center = containerWidth / 2;
        const dist = Math.abs(latestX + itemCenter - center);
        return Math.max(0.3, 1 - dist / 400);
    });

    const scale = useTransform(x, (latestX: number) => {
        if (!containerRef.current) return 1;
        const containerWidth = containerRef.current.offsetWidth;
        const center = containerWidth / 2;
        const dist = Math.abs(latestX + itemCenter - center);
        return Math.max(0.85, 1.15 - dist / 500);
    });

    const barHeight = (Math.min(item.val, maxPoint) / maxPoint) * 100;

    return (
        <motion.div
            style={{
                width: itemWidth,
                opacity,
                scale
            }}
            className="h-full flex flex-col justify-end items-center group/bar pb-6 relative z-10"
        >
            <div className="w-12 h-40 flex flex-col justify-end relative">
                {/* Bar */}
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: `${barHeight}%`, opacity: 1 }}
                    transition={{ duration: 0.8, delay: index * 0.06, ease: "easeOut" }}
                    className={cn(
                        "w-full rounded-t transition-all relative overflow-hidden border",
                        isImpossible
                            ? "bg-red-500/15 border-red-500/40"
                            : item.isFuture
                                ? "bg-purple-500/15 border-purple-500/40"
                                : "bg-blue-500/15 border-blue-500/40",
                        isActive && "brightness-125",
                    )}
                >
                    {/* Tooltip */}
                    <div className={cn(
                        "absolute bottom-full mb-3 left-1/2 -translate-x-1/2 backdrop-blur-sm bg-bg-surface/95 border shadow-lg text-text-primary px-3 py-2 rounded-lg transition-all font-medium z-30 min-w-[100px] text-center",
                        isActive ? "opacity-100 transform translate-y-0 scale-100" : "opacity-0 transform translate-y-2 scale-95 pointer-events-none",
                        isImpossible ? "border-red-500/40 bg-red-500/5" : item.isFuture ? "border-purple-500/40 bg-purple-500/5" : "border-blue-500/40 bg-blue-500/5"
                    )}>
                        <div className={cn(
                            "text-xl font-bold mb-0.5",
                            isImpossible ? "text-red-500" : item.isFuture ? "text-purple-500" : "text-blue-500"
                        )}>
                            {item.val.toFixed(2)}
                        </div>
                        <div className="text-[8px] text-text-tertiary uppercase tracking-wide">
                            {item.isFuture ? "Required" : "Achieved"}
                        </div>
                        {isImpossible && (
                            <div className="mt-1.5 pt-1.5 border-t border-red-500/20">
                                <span className="text-[9px] uppercase tracking-wide text-red-500 font-medium">⚠ Impossible</span>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Decorative Base */}
                <div className={cn(
                    "absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full transition-all",
                    isActive ? "bg-text-secondary w-8" : "bg-border/40"
                )} />
            </div>

            {/* Label */}
            <div className={cn(
                "mt-8 text-[10px] whitespace-nowrap transition-all uppercase tracking-tight text-center max-w-[90px] truncate",
                isActive ? "text-text-primary font-bold" : "text-text-tertiary font-medium",
                isImpossible && isActive && "text-red-500"
            )}>
                {item.label}
            </div>
        </motion.div>
    );
}
