import { ChevronLeft, ChevronRight, Type, List, X, Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface BookReaderControlsProps {
    progress: number;
    onPrevPage: () => void;
    onNextPage: () => void;
    fontSize: number;
    onFontSizeChange: (size: number) => void;
    fontFamily: string;
    onFontFamilyChange: (family: string) => void;
    theme: 'light' | 'dark' | 'sepia';
    onThemeChange: (theme: 'light' | 'dark' | 'sepia') => void;
    onToggleToc: () => void;
    onClose?: () => void;
}

export function BookReaderControls({
    progress,
    onPrevPage,
    onNextPage,
    fontSize,
    onFontSizeChange,
    fontFamily,
    onFontFamilyChange,
    theme,
    onThemeChange,
    onToggleToc,
    onClose
}: BookReaderControlsProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    return (
        <div className="h-16 flex-shrink-0 bg-bg-surface border-t border-border flex items-center justify-between px-6 relative">
            {/* Left: Navigation */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleToc}
                    className="p-2 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
                    title="Table of Contents"
                >
                    <List size={20} />
                </button>
                <button
                    onClick={onPrevPage}
                    className="p-2 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
                    title="Previous Page"
                >
                    <ChevronLeft size={20} />
                </button>
                <button
                    onClick={onNextPage}
                    className="p-2 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
                    title="Next Page"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Center: Progress */}
            <div className="flex-1 max-w-md mx-8">
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-bg-hover rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-accent rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                    <span className="text-xs font-mono text-text-tertiary min-w-[3rem] text-right">
                        {progress}%
                    </span>
                </div>
            </div>

            {/* Right: Settings & Controls */}
            <div className="flex items-center gap-2">
                {/* Font Size */}
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-hover">
                    <button
                        onClick={() => onFontSizeChange(Math.max(50, fontSize - 10))}
                        className="p-1 hover:bg-bg-surface rounded text-text-secondary"
                        title="Decrease font size"
                    >
                        <Type size={14} />
                    </button>
                    <span className="text-xs font-mono text-text-tertiary min-w-[2.5rem] text-center">
                        {fontSize}%
                    </span>
                    <button
                        onClick={() => onFontSizeChange(Math.min(200, fontSize + 10))}
                        className="p-1 hover:bg-bg-surface rounded text-text-secondary"
                        title="Increase font size"
                    >
                        <Type size={18} />
                    </button>
                </div>

                {/* Theme Selector */}
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-hover">
                    <button
                        onClick={() => onThemeChange('light')}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${theme === 'light' ? 'border-accent bg-white' : 'border-border bg-white'
                            }`}
                        title="Light theme"
                    />
                    <button
                        onClick={() => onThemeChange('dark')}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${theme === 'dark' ? 'border-accent bg-[#1a1a1a]' : 'border-border bg-[#1a1a1a]'
                            }`}
                        title="Dark theme"
                    />
                    <button
                        onClick={() => onThemeChange('sepia')}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${theme === 'sepia' ? 'border-accent bg-[#f4ecd8]' : 'border-border bg-[#f4ecd8]'
                            }`}
                        title="Sepia theme"
                    />
                </div>

                {/* Font Family */}
                <select
                    value={fontFamily}
                    onChange={(e) => onFontFamilyChange(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-bg-hover border border-border text-text-primary text-sm"
                >
                    <option value="serif">Serif</option>
                    <option value="sans-serif">Sans-Serif</option>
                    <option value="monospace">Monospace</option>
                </select>

                {/* Fullscreen */}
                <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                {/* Close */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors"
                        title="Close reader"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>
        </div>
    );
}
