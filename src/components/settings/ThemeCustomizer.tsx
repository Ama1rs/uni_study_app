import { Moon, Sun, Palette, Layout, Box, Zap, Sparkles } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ACCENT_COLORS, PresetAccentColor, getAccentColor } from '../../lib/themes';
import { ColorPicker } from '../common/ColorPicker';
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
        <div className="p-6 space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
                        Appearance & Themes
                    </h2>
                    <p className="text-sm opacity-60" style={{ color: 'var(--text-primary)' }}>
                        Personalize your workspace with surgical precision
                    </p>
                </div>

                {/* Contrast Toggle */}
                <button
                    onClick={() => setHighContrast(!highContrast)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${highContrast
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--border)] hover:border-[var(--border-light)] opacity-60'}`}
                >
                    <Zap size={16} fill={highContrast ? 'currentColor' : 'none'} />
                    <span className="text-sm font-bold uppercase tracking-wider">Contrast</span>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-8">
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
                                { id: 'accent', label: 'Accent Color', icon: Palette, desc: 'Buttons, borders, highlights' },
                                { id: 'background', label: 'Main Canvas', icon: Layout, desc: 'Primary workspace background' },
                                { id: 'surface', label: 'Surface Panels', icon: Box, desc: 'Cards, sidebars, modals' },
                            ].map((comp) => (
                                <button
                                    key={comp.id}
                                    onClick={() => setActiveComponent(comp.id as ComponentToColor)}
                                    className={`group flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${activeComponent === comp.id
                                        ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-[0_0_20px_rgba(0,0,0,0.1)]'
                                        : 'border-[var(--border)] hover:border-[var(--border-light)]'
                                        }`}
                                >
                                    <div className={`p-2.5 rounded-xl transition-colors ${activeComponent === comp.id ? 'bg-[var(--accent)] text-white' : 'bg-white/5 text-[var(--text-secondary)]'}`}>
                                        <comp.icon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{comp.label}</div>
                                        <div className="text-[10px] opacity-40 uppercase tracking-wider">{comp.desc}</div>
                                    </div>
                                    {activeComponent === comp.id && <Sparkles size={16} className="text-[var(--accent)] opacity-50" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Color Picker Section */}
                <div className="flex flex-col items-center bg-black/10 rounded-[2rem] p-8 border border-white/5 shadow-2xl backdrop-blur-md">
                    <ColorPicker
                        color={getCurrentColor()}
                        onChange={handleColorChange}
                        size={220}
                    />

                    {activeComponent === 'accent' && (
                        <div className="mt-8 w-full border-t border-white/5 pt-6">
                            <p className="text-[9px] font-bold opacity-30 tracking-widest text-center mb-4 uppercase">QUICK PRESETS</p>
                            <div className="flex justify-center gap-3">
                                {(Object.keys(ACCENT_COLORS) as PresetAccentColor[]).map((colorKey) => {
                                    const color = ACCENT_COLORS[colorKey];
                                    const isActive = accent === colorKey;
                                    return (
                                        <button
                                            key={colorKey}
                                            onClick={() => setAccent(colorKey)}
                                            className={`w-10 h-10 rounded-xl transition-all border-2 flex items-center justify-center ${isActive ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105 opacity-60 hover:opacity-100'}`}
                                            style={{ backgroundColor: color[mode] }}
                                            title={color.name}
                                        >
                                            {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {(activeComponent === 'background' || activeComponent === 'surface') && (
                        <div className="mt-8 border-t border-white/5 pt-6 w-full text-center">
                            <button
                                onClick={() => activeComponent === 'background' ? setCustomBg(null) : setCustomSurface(null)}
                                className="px-6 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all opacity-40 hover:opacity-100"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Reset {activeComponent} to theme default
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Section */}
            <div className="pt-6 border-t border-[var(--border)]">
                <div className="flex items-center gap-2 mb-6">
                    <div className="h-[1px] flex-1 bg-[var(--border)]" />
                    <p className="text-[10px] font-bold opacity-30 tracking-widest uppercase">REAL-TIME PREVIEW</p>
                    <div className="h-[1px] flex-1 bg-[var(--border)]" />
                </div>

                <div className="p-8 rounded-[2rem] border-2 shadow-inner overflow-hidden"
                    style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border)',
                        backgroundImage: `radial-gradient(circle at top right, var(--accent-dim), transparent)`
                    }}>
                    <div className="flex gap-6">
                        <div className="p-6 rounded-2xl border flex-1 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: 'var(--accent)' }} />
                                <div>
                                    <div className="h-2 w-24 rounded bg-white/10 mb-2" />
                                    <div className="h-1.5 w-16 rounded bg-white/5" />
                                </div>
                            </div>
                            <div className="space-y-2 pt-2">
                                <div className="h-2 w-full rounded bg-white/10" />
                                <div className="h-2 w-5/6 rounded bg-white/5" />
                            </div>
                        </div>
                        <div className="p-6 rounded-2xl border flex-1 flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                                    <div className="h-2 w-full rounded bg-white/10" />
                                </div>
                                <div className="flex items-center gap-2 opacity-30">
                                    <div className="w-2 h-2 rounded-full border border-white" />
                                    <div className="h-2 w-3/4 rounded bg-white/10" />
                                </div>
                            </div>
                            <button
                                className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                style={{ backgroundColor: 'var(--accent)' }}
                            >
                                Primary Action
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


