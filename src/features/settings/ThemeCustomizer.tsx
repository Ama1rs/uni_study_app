import { Moon, Sun, Palette, Layout, Box, Zap, Sparkles } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ACCENT_COLORS, PresetAccentColor, getAccentColor } from '../../lib/themes';
import { ColorPicker } from '../../components/ui/ColorPicker';
import { useState } from 'react';

type ComponentToColor = 'accent' | 'background' | 'surface';

export function ThemeCustomizer() {
    const {
        mode, theme, accent, customBg, customSurface, highContrast,
        toggleMode, setTheme, setAccent, setCustomBg, setCustomSurface, setHighContrast
    } = useTheme();

    const [activeComponent, setActiveComponent] = useState<ComponentToColor>('accent');

    const handleColorChange = (hex: string) => {
        if (activeComponent === 'accent') setAccent(hex);
        else if (activeComponent === 'background') setCustomBg(hex);
        else if (activeComponent === 'surface') setCustomSurface(hex);
    };

    const getCurrentColor = () => {
        if (activeComponent === 'accent') return getAccentColor(accent, mode);
        if (activeComponent === 'background') return customBg || (mode === 'dark' ? '#191919' : '#FFFFFF');
        if (activeComponent === 'surface') return customSurface || (mode === 'dark' ? '#252525' : '#F7F6F3');
        return '#000000';
    };

    return (
        <div className="p-4 space-y-5 animate-fade-in-up max-w-5xl mx-auto">
            {/* Contrast Toggle */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => setHighContrast(!highContrast)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all shrink-0 ${highContrast
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--border)] hover:border-[var(--border-light)] opacity-60'}`}
                >
                    <Zap size={15} fill={highContrast ? 'currentColor' : 'none'} />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Contrast</span>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-6 items-start">
                <div className="space-y-5">
                    {/* Mode & Theme Style */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-bold tracking-widest uppercase opacity-40 ml-1">COLOR MODE</h3>
                            <div className="flex p-1 bg-black/20 rounded-xl border border-white/5">
                                <button
                                    onClick={() => mode === 'light' && toggleMode()}
                                    className={`flex-1 py-2 flex items-center justify-center rounded-lg transition-all ${mode === 'dark' ? 'bg-white/10 shadow-sm' : 'opacity-40 hover:opacity-100'}`}
                                >
                                    <Moon size={16} className={mode === 'dark' ? 'text-[var(--accent)]' : ''} />
                                </button>
                                <button
                                    onClick={() => mode === 'dark' && toggleMode()}
                                    className={`flex-1 py-2 flex items-center justify-center rounded-lg transition-all ${mode === 'light' ? 'bg-white/10 shadow-sm' : 'opacity-40 hover:opacity-100'}`}
                                >
                                    <Sun size={16} className={mode === 'light' ? 'text-[var(--accent)]' : ''} />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-bold tracking-widest uppercase opacity-40 ml-1">BASE STYLE</h3>
                            <div className="flex p-1 bg-black/20 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setTheme('default')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${theme === 'default' ? 'bg-white/10 shadow-sm' : 'opacity-40 hover:opacity-100'}`}
                                >
                                    STD
                                </button>
                                <button
                                    onClick={() => setTheme('warm')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${theme === 'warm' ? 'bg-white/10 shadow-sm' : 'opacity-40 hover:opacity-100'}`}
                                >
                                    WARM
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Component Selector */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold tracking-widest uppercase opacity-40 ml-1">CUSTOMIZE COMPONENT</h3>
                        <div className="flex flex-col gap-2">
                            {[
                                { id: 'accent', label: 'Accent Color', icon: Palette, desc: 'Highlights' },
                                { id: 'background', label: 'Main Canvas', icon: Layout, desc: 'Background' },
                                { id: 'surface', label: 'Surface Panels', icon: Box, desc: 'Cards' },
                            ].map((comp) => (
                                <button
                                    key={comp.id}
                                    onClick={() => setActiveComponent(comp.id as ComponentToColor)}
                                    className={`group flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${activeComponent === comp.id
                                        ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm'
                                        : 'border-[var(--border)] hover:border-[var(--border-light)]'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg transition-colors ${activeComponent === comp.id ? 'bg-[var(--accent)] text-white' : 'bg-white/5 text-[var(--text-secondary)]'}`}>
                                        <comp.icon size={16} />
                                    </div>
                                    <div className="flex-1 flex items-center justify-between">
                                        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{comp.label}</div>
                                        {activeComponent === comp.id && <Sparkles size={14} className="text-[var(--accent)] opacity-50" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Color Picker Section - Mockup Container */}
                <div className="flex flex-col items-center justify-center bg-black/5 rounded-[2rem] p-6 border border-white/5 shadow-inner min-h-[320px] w-full">
                    <div className="mb-6 relative">
                        <ColorPicker
                            color={getCurrentColor()}
                            onChange={handleColorChange}
                            size={180}
                        />
                    </div>

                    {activeComponent === 'accent' && (
                        <div className="w-full border-t border-white/5 pt-4 px-2">
                            <div className="grid grid-cols-6 gap-3 justify-items-center">
                                {(Object.keys(ACCENT_COLORS) as PresetAccentColor[]).map((colorKey) => {
                                    const color = ACCENT_COLORS[colorKey];
                                    const isActive = accent === colorKey;
                                    return (
                                        <button
                                            key={colorKey}
                                            onClick={() => setAccent(colorKey)}
                                            className={`w-6 h-6 rounded-full transition-all border flex items-center justify-center ${isActive ? 'border-white scale-125 shadow-md' : 'border-transparent hover:scale-110 opacity-80 hover:opacity-100'}`}
                                            style={{ backgroundColor: color[mode] }}
                                            title={color.name}
                                        >
                                            {isActive && <div className="w-1 h-1 bg-white rounded-full" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {(activeComponent === 'background' || activeComponent === 'surface') && (
                        <div className="mt-4 border-t border-white/5 pt-4 w-full text-center">
                            <button
                                onClick={() => activeComponent === 'background' ? setCustomBg(null) : setCustomSurface(null)}
                                className="px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all opacity-40 hover:opacity-100"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Reset {activeComponent} to theme default
                            </button>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
}


