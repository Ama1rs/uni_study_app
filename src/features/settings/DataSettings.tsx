import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { HardDrive, Save, Loader2, Bug, Cloud, ArrowRight, AlertTriangle } from 'lucide-react';
import { CloudDebugPanel } from '@/components/sync/CloudDebugPanel';
import { CloudStatusIndicator } from '@/components/sync/CloudStatusIndicator';
import { MigrationWizard } from './MigrationWizard';

interface OnboardingState {
    completed: boolean;
    db_type?: 'sqlite' | 'supabase';
    db_url?: string;
}

export function DataSettings() {
    const [storageMode, setStorageMode] = useState<'local' | 'cloud'>('local');
    const [dbUrl, setDbUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [migrationRequired, setMigrationRequired] = useState(false);
    const [showMigrationWizard, setShowMigrationWizard] = useState(false);
    const [fullState, setFullState] = useState<any>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const state = await invoke<OnboardingState>('get_onboarding_state');
            setFullState(state);
            const mode = state.db_type === 'supabase' ? 'cloud' : 'local';
            setStorageMode(mode);
            setDbUrl(state.db_url || '');
        } catch (error) {
            console.error("Failed to load data settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStorageModeChange = (newMode: 'local' | 'cloud') => {
        if (newMode !== storageMode) {
            setMigrationRequired(true);
        }
        setStorageMode(newMode);
    };

    const initiateMigration = async () => {
        setShowMigrationWizard(true);
    };

    const handleMigrationComplete = async (newMode: 'local' | 'cloud') => {
        setMigrationRequired(false);
        setShowMigrationWizard(false);
        setStorageMode(newMode);
        await saveSettings(newMode);
    };

    const handleMigrationCancel = () => {
        setShowMigrationWizard(false);
        setMigrationRequired(false);
        // Revert to original mode
        const originalMode = fullState?.db_type === 'supabase' ? 'cloud' : 'local';
        setStorageMode(originalMode);
    };

    const saveSettings = async (mode: 'local' | 'cloud' = storageMode) => {
        if (!fullState) return;
        setSaving(true);
        try {
            await invoke('set_onboarding_state', {
                data: {
                    ...fullState,
                    db_type: mode === 'cloud' ? 'supabase' : 'sqlite',
                    db_url: mode === 'cloud' ? dbUrl : null
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

    if (showMigrationWizard) {
        return (
            <MigrationWizard
                from={storageMode}
                to={migrationRequired ? (storageMode === 'local' ? 'cloud' : 'local') : storageMode}
                onComplete={handleMigrationComplete}
                onCancel={handleMigrationCancel}
            />
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Cloud Status Indicator */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Bug size={16} />
                    Cloud Sync Debugging Tools
                </h3>
                <div className="space-y-4">
                    <CloudStatusIndicator showDetails={true} />
                    <CloudDebugPanel />
                </div>
            </div>

            <div className="space-y-6">
                {/* Storage Mode Selection */}
                <div>
                    <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Storage Mode</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => handleStorageModeChange('local')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                                storageMode === 'local'
                                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                                    : 'border-[var(--border)] hover:border-[var(--border-light)]'
                            }`}
                        >
                            <HardDrive size={24} className="mb-2" style={{ color: storageMode === 'local' ? 'var(--accent)' : 'var(--text-secondary)' }} />
                            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Local Storage</h3>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Data stored locally</p>
                        </button>

                        <button
                            onClick={() => handleStorageModeChange('cloud')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                                storageMode === 'cloud'
                                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                                    : 'border-[var(--border)] hover:border-[var(--border-light)]'
                            }`}
                        >
                            <Cloud size={24} className="mb-2" style={{ color: storageMode === 'cloud' ? 'var(--accent)' : 'var(--text-secondary)' }} />
                            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Cloud Sync</h3>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Cross-device sync</p>
                        </button>
                    </div>
                </div>

                {/* Migration Warning */}
                {migrationRequired && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-yellow-800">Storage Mode Change Required</h4>
                                <p className="text-xs text-yellow-700 mt-1">
                                    Changing storage mode requires data migration to prevent data loss.
                                </p>
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={initiateMigration}
                                        className="px-4 py-2 bg-yellow-600 text-white text-xs rounded-lg font-medium hover:bg-yellow-700 flex items-center gap-1"
                                    >
                                        Start Migration
                                        <ArrowRight size={14} />
                                    </button>
                                    <button
                                        onClick={handleMigrationCancel}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 text-xs rounded-lg font-medium hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Configuration Fields */}
                {storageMode === 'cloud' && (
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
                        onClick={() => saveSettings()}
                        disabled={saving || migrationRequired}
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