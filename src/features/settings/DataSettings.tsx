import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Database, HardDrive, Save, Loader2 } from 'lucide-react';

interface OnboardingState {
    completed: boolean;
    db_type?: 'sqlite' | 'supabase';
    db_url?: string;
    // other fields ignored
}

export function DataSettings() {
    const [dbType, setDbType] = useState<'sqlite' | 'supabase'>('sqlite');
    const [dbUrl, setDbUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fullState, setFullState] = useState<any>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const state = await invoke<OnboardingState>('get_onboarding_state');
            setFullState(state);
            setDbType(state.db_type || 'sqlite');
            setDbUrl(state.db_url || '');
        } catch (error) {
            console.error("Failed to load data settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!fullState) return;
        setSaving(true);
        try {
            await invoke('set_onboarding_state', {
                data: {
                    ...fullState,
                    db_type: dbType,
                    db_url: dbUrl
                }
            });
        } catch (error) {
            console.error("Failed to save data settings:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-accent" /></div>;
    }

    return (
        <div className="p-6 space-y-6">


            <div className="space-y-6">
                {/* Database Type Selection */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setDbType('sqlite')}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${dbType === 'sqlite'
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                            : 'border-[var(--border)] hover:border-[var(--border-light)]'
                            }`}
                    >
                        <HardDrive size={24} className="mb-2" style={{ color: dbType === 'sqlite' ? 'var(--accent)' : 'var(--text-secondary)' }} />
                        <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>SQLite</h3>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Local file storage</p>
                    </button>

                    <button
                        onClick={() => setDbType('supabase')}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${dbType === 'supabase'
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                            : 'border-[var(--border)] hover:border-[var(--border-light)]'
                            }`}
                    >
                        <Database size={24} className="mb-2" style={{ color: dbType === 'supabase' ? 'var(--accent)' : 'var(--text-secondary)' }} />
                        <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Supabase</h3>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Cloud PostgreSQL</p>
                    </button>
                </div>

                {/* Configuration Fields */}
                {dbType === 'supabase' && (
                    <div className="space-y-4 p-4 rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Connection URL
                            </label>
                            <input
                                type="password"
                                value={dbUrl}
                                onChange={(e) => setDbUrl(e.target.value)}
                                placeholder="postgresql://..."
                                className="w-full px-4 py-2 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>
                )}

                <div className="pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 rounded-lg font-medium text-black transition-colors flex items-center gap-2 disabled:opacity-50"
                        style={{ backgroundColor: 'var(--accent)' }}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
