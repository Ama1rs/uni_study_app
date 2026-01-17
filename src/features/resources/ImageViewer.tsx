import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ZoomIn,
    ZoomOut,
    RotateCcw,
    RotateCw,
    RefreshCw
} from 'lucide-react';

interface ImageViewerProps {
    src: string;
    alt?: string;
    title?: string;
}

export function ImageViewer({ src, alt, title }: ImageViewerProps) {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);

    // Reset view
    const handleReset = () => {
        setScale(1);
        setRotation(0);
    };

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 5));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
    const handleRotateCw = () => setRotation(prev => prev + 90);
    const handleRotateCcw = () => setRotation(prev => prev - 90);

    // Mouse wheel zoom
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                if (e.deltaY < 0) handleZoomIn();
                else handleZoomOut();
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
        }
        return () => {
            if (container) {
                container.removeEventListener('wheel', handleWheel);
            }
        };
    }, []);

    const controls = [
        { icon: ZoomIn, onClick: handleZoomIn, label: 'Zoom In (Ctrl + Wheel)' },
        { icon: ZoomOut, onClick: handleZoomOut, label: 'Zoom Out (Ctrl + Wheel)' },
        { icon: RefreshCw, onClick: handleReset, label: 'Reset View' },
        { icon: RotateCcw, onClick: handleRotateCcw, label: 'Rotate Left' },
        { icon: RotateCw, onClick: handleRotateCw, label: 'Rotate Right' },
    ];

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none">
            {/* Main Viewing Area */}
            <div
                ref={containerRef}
                className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
            >
                <motion.div
                    drag
                    dragConstraints={containerRef}
                    dragElastic={0.1}
                    style={{
                        scale,
                        rotate: rotation,
                    }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="flex items-center justify-center pointer-events-auto w-full h-full"
                >
                    <img
                        src={src}
                        alt={alt || title}
                        className="max-h-full max-w-full object-contain pointer-events-none"
                        draggable={false}
                    />
                </motion.div>
            </div>

            {/* Floating Toolbar */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute bottom-6 flex items-center gap-1 p-1.5 bg-bg-surface/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-30"
            >
                {controls.map((control, idx) => (
                    <button
                        key={idx}
                        onClick={control.onClick}
                        className="p-2.5 rounded-xl hover:bg-white/10 text-text-secondary hover:text-accent transition-all group relative"
                        title={control.label}
                    >
                        <control.icon size={18} />
                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 font-mono">
                            {control.label}
                        </span>
                    </button>
                ))}

                <div className="w-px h-6 bg-white/10 mx-1" />

                <div className="px-3 text-[10px] font-mono font-bold text-accent/80 tracking-widest">
                    {Math.round(scale * 100)}%
                </div>
            </motion.div>

            {/* Instruction HUD */}
            <div className="absolute top-4 right-4 pointer-events-none">
                <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/5 rounded-full flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[9px] font-mono text-text-tertiary tracking-tighter">
                        INTERACTIVE_MODE: ACTIVE
                    </span>
                </div>
            </div>
        </div>
    );
}
