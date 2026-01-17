import React, { useRef, useEffect, useState, useCallback } from 'react';

interface ColorPickerProps {
    color: string; // hex
    onChange: (hex: string) => void;
    size?: number;
}

export function ColorPicker({ color, onChange, size = 200 }: ColorPickerProps) {
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const hueCanvasRef = useRef<HTMLCanvasElement>(null);

    // Convert hex to hsv initially
    const [hsv, setHsv] = useState(() => hexToHsv(color));
    const [isDraggingMain, setIsDraggingMain] = useState(false);
    const [isDraggingHue, setIsDraggingHue] = useState(false);

    // Sync external color changes
    useEffect(() => {
        const newHsv = hexToHsv(color);
        // Only update if it's significantly different to avoid feedback loops
        if (hsvToHex(newHsv.h, newHsv.s, newHsv.v).toLowerCase() !== color.toLowerCase()) {
            setHsv(newHsv);
        }
    }, [color]);

    const drawMainCanvas = useCallback(() => {
        const canvas = mainCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = `hsl(${hsv.h}, 100%, 50%)`;
        ctx.fillRect(0, 0, size, size);

        const whiteGrad = ctx.createLinearGradient(0, 0, size, 0);
        whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
        whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = whiteGrad;
        ctx.fillRect(0, 0, size, size);

        const blackGrad = ctx.createLinearGradient(0, 0, 0, size);
        blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
        blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = blackGrad;
        ctx.fillRect(0, 0, size, size);
    }, [hsv.h, size]);

    const drawHueCanvas = useCallback(() => {
        const canvas = hueCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const grad = ctx.createLinearGradient(0, 0, 0, size);
        for (let i = 0; i <= 360; i += 30) {
            grad.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 20, size);
    }, [size]);

    useEffect(() => {
        drawMainCanvas();
        drawHueCanvas();
    }, [drawMainCanvas, drawHueCanvas]);

    const handleMainInteraction = (e: React.MouseEvent | MouseEvent) => {
        const canvas = mainCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(size, e.clientX - rect.left));
        const y = Math.max(0, Math.min(size, e.clientY - rect.top));

        const s = x / size;
        const v = 1 - (y / size);

        const newHsv = { ...hsv, s, v };
        setHsv(newHsv);
        onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
    };

    const handleHueInteraction = (e: React.MouseEvent | MouseEvent) => {
        const canvas = hueCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const y = Math.max(0, Math.min(size, e.clientY - rect.top));

        const h = (y / size) * 360;
        const newHsv = { ...hsv, h };
        setHsv(newHsv);
        onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
    };

    useEffect(() => {
        const move = (e: MouseEvent) => {
            if (isDraggingMain) handleMainInteraction(e);
            if (isDraggingHue) handleHueInteraction(e);
        };
        const up = () => {
            setIsDraggingMain(false);
            setIsDraggingHue(false);
        };
        if (isDraggingMain || isDraggingHue) {
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
        }
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
    }, [isDraggingMain, isDraggingHue, hsv]);

    return (
        <div className="flex flex-col items-center gap-8 p-2 w-full">
            <div className="flex items-center justify-center gap-8 w-full pl-6">
                {/* Saturation/Value Square */}
                <div className="relative" style={{ width: size, height: size }}>
                    <canvas
                        ref={mainCanvasRef}
                        width={size}
                        height={size}
                        onMouseDown={() => setIsDraggingMain(true)}
                        className="rounded-lg shadow-inner cursor-crosshair border border-white/10"
                    />
                    {/* Cursor */}
                    <div
                        className="absolute w-3 h-3 border-2 border-white rounded-full shadow-[0_0_2px_rgba(0,0,0,0.5)] pointer-events-none -translate-x-1/2 -translate-y-1/2"
                        style={{
                            left: `${hsv.s * 100}%`,
                            top: `${(1 - hsv.v) * 100}%`,
                            backgroundColor: color
                        }}
                    />
                </div>

                {/* Hue Slider */}
                <div className="relative" style={{ width: 24, height: size }}>
                    <canvas
                        ref={hueCanvasRef}
                        width={24}
                        height={size}
                        onMouseDown={() => setIsDraggingHue(true)}
                        className="rounded-full shadow-inner cursor-pointer border border-white/10"
                    />
                    {/* Hue Indicator */}
                    <div
                        className="absolute left-0 w-full h-2 border border-white shadow-[0_0_2px_rgba(0,0,0,0.5)] pointer-events-none -translate-y-1/2 bg-white/20"
                        style={{ top: `${(hsv.h / 360) * 100}%` }}
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 w-full px-4">
                <div
                    className="w-10 h-10 rounded-xl border-2 border-white/20 shadow-lg"
                    style={{ backgroundColor: color }}
                />
                <div className="flex-1">
                    <input
                        type="text"
                        value={color.toUpperCase()}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (/^#[0-9A-F]{6}$/i.test(val)) {
                                onChange(val);
                            }
                        }}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono w-full text-center focus:outline-none focus:border-[var(--accent)] transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                    />
                </div>
            </div>
        </div>
    );
}

// Helper functions
function hexToHsv(hex: string) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, v = max;

    let d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s, v };
}

function hsvToHex(h: number, s: number, v: number) {
    let r = 0, g = 0, b = 0;
    let i = Math.floor((h / 360) * 6);
    let f = (h / 360) * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    const f2h = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${f2h(r)}${f2h(g)}${f2h(b)}`;
}
