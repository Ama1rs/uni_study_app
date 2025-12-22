import { useState, useRef, useEffect } from 'react';

interface DynamicLineChartProps {
    data: number[];
    labels?: string[];
    color: string;
    height?: number;
    className?: string;
}

export function DynamicLineChart({ data, labels, color, height = 60, className = "" }: DynamicLineChartProps) {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setWidth(entry.contentRect.width);
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    if (data.length < 2 || width === 0) return <div ref={containerRef} className={`h-[${height}px] w-full ${className}`} />;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    // Padding to prevent cutting off strokes
    const paddingY = 4;
    const chartHeight = height - paddingY * 2;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        // Invert Y because SVG 0 is top
        const y = height - paddingY - ((val - min) / range) * chartHeight;
        return [x, y];
    });

    // Generate smooth bezier path
    const pathD = points.reduce((acc, [x, y], i, arr) => {
        if (i === 0) return `M ${x},${y}`;

        const [prevX, prevY] = arr[i - 1];
        const cp1x = prevX + (x - prevX) * 0.5;
        const cp1y = prevY;
        const cp2x = x - (x - prevX) * 0.5;
        const cp2y = y;

        return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`;
    }, "");

    // Area path for gradient
    const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;

        // Find closest point
        const index = Math.round((x / width) * (data.length - 1));
        if (index >= 0 && index < data.length) {
            setHoverIndex(index);
        }
    };

    const handleMouseLeave = () => {
        setHoverIndex(null);
    };

    return (
        <div
            ref={containerRef}
            className={`relative select-none ${className}`}
            style={{ height }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <svg width={width} height={height} className="overflow-visible">
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Area Fill */}
                <path d={areaD} fill={`url(#gradient-${color})`} className="transition-all duration-300" />

                {/* Line */}
                <path
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-sm"
                />

                {/* Hover Indicator */}
                {hoverIndex !== null && (
                    <>
                        <line
                            x1={points[hoverIndex][0]}
                            y1={0}
                            x2={points[hoverIndex][0]}
                            y2={height}
                            stroke="var(--border)"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                        />
                        <circle
                            cx={points[hoverIndex][0]}
                            cy={points[hoverIndex][1]}
                            r="4"
                            fill="var(--bg-surface)"
                            stroke={color}
                            strokeWidth="2"
                        />
                    </>
                )}
            </svg>

            {/* Tooltip */}
            {hoverIndex !== null && (
                <div
                    className="absolute top-0 -translate-y-full bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none transform -translate-x-1/2 transition-all"
                    style={{ left: points[hoverIndex][0] }}
                >
                    <span className="font-bold">{data[hoverIndex]}</span>
                    {labels && <span className="text-slate-400 ml-1">{labels[hoverIndex]}</span>}
                </div>
            )}
        </div>
    );
}
