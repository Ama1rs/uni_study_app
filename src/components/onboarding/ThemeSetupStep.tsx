import { useState, useEffect } from 'react';
import { Moon, Sun, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAppSettings } from '../../contexts/AppSettingsContext';

interface ThemeSetupStepProps {
    onNext: () => void;
    onBack: () => void;
}

const ACCENT_COLORS = [
    { id: 'cyan', hex: 'hsl(180, 70%, 55%)' },
    { id: 'blue', hex: '#3B82F6' },
    { id: 'purple', hex: '#8B5CF6' },
    { id: 'green', hex: '#22C55E' },
    { id: 'orange', hex: '#F97316' },
    { id: 'pink', hex: '#EC4899' },
];

export function ThemeSetupStep({ onNext, onBack }: ThemeSetupStepProps) {
    const { settings, updateSettings } = useAppSettings();
    const [mode, setMode] = useState<'light' | 'dark'>(settings.theme_mode as 'light' | 'dark');
    const [accent, setAccent] = useState(settings.accent);

    useEffect(() => {
        setMode(settings.theme_mode as 'light' | 'dark');
        setAccent(settings.accent);
    }, [settings]);

    const handleModeChange = (newMode: 'light' | 'dark') => {
        setMode(newMode);
        updateSettings({ theme_mode: newMode });
    };

    const handleAccentChange = (newAccent: string) => {
        setAccent(newAccent);
        updateSettings({ accent: newAccent });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-text-primary mb-2">Appearance</h2>
                <p className="text-sm text-text-secondary font-mono">Customize your look.</p>
            </div>

            {/* Theme Mode */}
            <div className="space-y-3 mb-6">
                <label className="block text-xs text-text-secondary font-mono">Mode</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleModeChange('light')}
                        className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${mode === 'light'
                                ? 'border-accent bg-accent/10 text-text-primary'
                                : 'border-border bg-bg-surface text-text-tertiary hover:border-text-tertiary'
                            }`}
                    >
                        <Sun size={16} />
                        <span className="text-sm font-medium">Light</span>
                    </button>
                    <button
                        onClick={() => handleModeChange('dark')}
                        className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${mode === 'dark'
                                ? 'border-accent bg-accent/10 text-text-primary'
                                : 'border-border bg-bg-surface text-text-tertiary hover:border-text-tertiary'
                            }`}
                    >
                        <Moon size={16} />
                        <span className="text-sm font-medium">Dark</span>
                    </button>
                </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-3 mb-6">
                <label className="block text-xs text-text-secondary font-mono">Accent</label>
                <div className="flex gap-2">
                    {ACCENT_COLORS.map((color) => (
                        <button
                            key={color.id}
                            onClick={() => handleAccentChange(color.id)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${accent === color.id ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-surface' : ''
                                }`}
                            style={{ backgroundColor: color.hex }}
                        >
                            {accent === color.id && <Check size={14} className="text-black" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-auto">
                <button onClick={onBack} className="px-4 py-2 text-sm text-text-tertiary hover:text-text-primary transition-colors flex items-center gap-1">
                    <ArrowLeft size={14} /> Back
                </button>
                <button onClick={onNext} className="px-4 py-2 bg-accent text-black rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90">
                    Continue <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
}
