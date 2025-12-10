import { Moon, Sun, Palette } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ACCENT_COLORS, AccentColor } from '../../lib/themes';

export function ThemeCustomizer() {
    const { mode, theme, accent, toggleMode, setTheme, setAccent } = useTheme();

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Theme Settings
                </h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                    Customize your app's appearance
                </p>
            </div>

            {/* Theme Style Toggle */}
            <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                    Theme Style
                </h3>
                <div className="flex gap-3">
                    <button
                        onClick={() => setTheme('default')}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${theme === 'default'
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                            : 'border-[var(--border)] hover:border-[var(--border-light)]'
                            }`}
                        style={{
                            backgroundColor: theme === 'default' ? 'var(--bg-surface)' : 'transparent',
                        }}
                    >
                        <div className="w-full h-8 mb-2 rounded bg-[#191919] border border-[#373737]" />
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Default</p>
                    </button>

                    <button
                        onClick={() => setTheme('warm')}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${theme === 'warm'
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                            : 'border-[var(--border)] hover:border-[var(--border-light)]'
                            }`}
                        style={{
                            backgroundColor: theme === 'warm' ? 'var(--bg-surface)' : 'transparent',
                        }}
                    >
                        <div className="w-full h-8 mb-2 rounded bg-[#202020] border border-[#404040]" />
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Warm (Notion)</p>
                    </button>
                </div>
            </div>

            {/* Light/Dark Mode Toggle */}
            <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                    Appearance
                </h3>
                <div className="flex gap-3">
                    <button
                        onClick={() => mode === 'light' && toggleMode()}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${mode === 'dark'
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                            : 'border-[var(--border)] hover:border-[var(--border-light)]'
                            }`}
                        style={{
                            backgroundColor: mode === 'dark' ? 'var(--bg-surface)' : 'transparent',
                        }}
                    >
                        <Moon size={24} className="mx-auto mb-2" style={{ color: mode === 'dark' ? 'var(--accent)' : 'var(--text-secondary)' }} />
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Dark</p>
                    </button>

                    <button
                        onClick={() => mode === 'dark' && toggleMode()}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${mode === 'light'
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                            : 'border-[var(--border)] hover:border-[var(--border-light)]'
                            }`}
                        style={{
                            backgroundColor: mode === 'light' ? 'var(--bg-surface)' : 'transparent',
                        }}
                    >
                        <Sun size={24} className="mx-auto mb-2" style={{ color: mode === 'light' ? 'var(--accent)' : 'var(--text-secondary)' }} />
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Light</p>
                    </button>
                </div>
            </div>

            {/* Accent Color Picker */}
            <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Palette size={16} />
                    Accent Color
                </h3>
                <div className="grid grid-cols-6 gap-3">
                    {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((colorKey) => {
                        const color = ACCENT_COLORS[colorKey];
                        const isActive = accent === colorKey;

                        return (
                            <button
                                key={colorKey}
                                onClick={() => setAccent(colorKey)}
                                className={`relative w-full aspect-square rounded-xl transition-all ${isActive ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105'
                                    }`}
                                style={{
                                    backgroundColor: color[mode],
                                    // ringColor is handled by Tailwind classes or custom CSS if needed, not a valid style prop
                                }}
                                title={color.name}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Preview
                </p>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: 'var(--accent)' }} />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Accent color</span>
                    </div>
                    <button
                        className="w-full py-2 px-4 rounded-lg font-medium text-sm text-white transition-colors"
                        style={{
                            backgroundColor: 'var(--accent)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                    >
                        Sample Button
                    </button>
                </div>
            </div>
        </div>
    );
}
