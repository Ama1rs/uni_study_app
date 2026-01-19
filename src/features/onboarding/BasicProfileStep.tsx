import { useState } from 'react';
import { User, Moon, Sun, Shield, Database, ArrowLeft, Check } from 'lucide-react';
import { useAppSettings } from '../../contexts/AppSettingsContext';

interface BasicProfileStepProps {
    onComplete: (data: { name: string; themePreference: 'light' | 'dark'; privacyChoice: 'local' | 'cloud-ready' }) => void;
    onBack: () => void;
}

export function BasicProfileStep({ onComplete, onBack }: BasicProfileStepProps) {
    const { settings, updateSettings } = useAppSettings();
    const [name, setName] = useState('');
    const [themePreference, setThemePreference] = useState<'light' | 'dark'>(settings.theme_mode as 'light' | 'dark' || 'dark');
    const [privacyChoice, setPrivacyChoice] = useState<'local' | 'cloud-ready'>('local');

    const handleThemeChange = (newTheme: 'light' | 'dark') => {
        setThemePreference(newTheme);
        updateSettings({ theme_mode: newTheme });
    };

    const handleSubmit = () => {
        if (name) {
            onComplete({ name, themePreference, privacyChoice });
        }
    };

    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-bold text-text-primary mb-1">Basic Profile</h2>
                <p className="text-sm text-text-secondary">Set up your preferences.</p>
            </div>

            {/* Form */}
            <div className="space-y-5 mb-6">
                {/* Name Field */}
                <div>
                    <label className="block text-xs text-text-secondary mb-1.5">Name</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            className="w-full pl-10 pr-3 py-2.5 bg-surface border rounded-lg text-text-primary placeholder-text-tertiary text-sm focus:outline-none focus:border-accent"
                        />
                    </div>
                </div>

                {/* Theme Preference */}
                <div>
                    <label className="block text-xs text-text-secondary mb-2">Theme</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleThemeChange('light')}
                            className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${themePreference === 'light'
                                    ? 'border-accent bg-accent/10 text-text-primary'
                                    : 'border bg-surface text-text-secondary hover:border hover:bg-hover'
                                }`}
                        >
                            <Sun size={16} />
                            <span className="text-sm font-medium">Light</span>
                        </button>
                        <button
                            onClick={() => handleThemeChange('dark')}
                            className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${themePreference === 'dark'
                                    ? 'border-accent bg-accent/10 text-text-primary'
                                    : 'border bg-surface text-text-secondary hover:border hover:bg-hover'
                                }`}
                        >
                            <Moon size={16} />
                            <span className="text-sm font-medium">Dark</span>
                        </button>
                    </div>
                </div>

                {/* Data Preference */}
                <div>
                    <label className="block text-xs text-xs text-text-secondary mb-2">Data Storage</label>
                    <div className="space-y-2">
                        <button
                            onClick={() => setPrivacyChoice('local')}
                            className={`w-full p-3 rounded-lg border text-left transition-all ${privacyChoice === 'local'
                                    ? 'border-accent bg-accent/10'
                                    : 'border bg-surface hover:border hover:bg-hover'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Database size={16} className={privacyChoice === 'local' ? 'text-accent' : 'text-text-secondary'} />
                                <div>
                                    <h3 className="text-sm font-medium text-text-primary">Keep it simple</h3>
                                    <p className="text-xs text-text-secondary">Local storage only</p>
                                </div>
                            </div>
                        </button>
                        <button
                            onClick={() => setPrivacyChoice('cloud-ready')}
                            className={`w-full p-3 rounded-lg border text-left transition-all ${privacyChoice === 'cloud-ready'
                                    ? 'border-accent bg-accent/10'
                                    : 'border bg-surface hover:border hover:bg-hover'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Shield size={16} className={privacyChoice === 'cloud-ready' ? 'text-accent' : 'text-text-secondary'} />
                                <div>
                                    <h3 className="text-sm font-medium text-text-primary">I like control</h3>
                                    <p className="text-xs text-text-secondary">Cloud sync options available</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-auto pt-4">
                <button onClick={onBack} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1">
                    <ArrowLeft size={14} /> Back
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!name}
                    className="px-4 py-2 bg-accent text-white rounded-md text-sm font-medium flex items-center gap-1 hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Complete <Check size={14} />
                </button>
            </div>
        </div>
    );
}