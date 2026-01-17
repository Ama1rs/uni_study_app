import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { User, School, Save, Loader2 } from 'lucide-react';
import { useUserProfile } from '../../contexts/UserProfileContext';

interface OnboardingState {
    completed: boolean;
    user_name?: string;
    university?: string;
    // other fields ignored
}

export function ProfileSettings() {
    const { refreshProfile } = useUserProfile();
    const [name, setName] = useState('');
    const [university, setUniversity] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fullState, setFullState] = useState<any>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const state = await invoke<OnboardingState>('get_onboarding_state');
            setFullState(state);
            setName(state.user_name || '');
            setUniversity(state.university || '');
        } catch (error) {
            console.error("Failed to load profile:", error);
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
                    user_name: name,
                    university: university
                }
            });
            // Refresh global profile state to update all UI components
            await refreshProfile();
        } catch (error) {
            console.error("Failed to save profile:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-accent" /></div>;
    }

    return (
        <div className="p-6 space-y-6">


            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <User size={16} /> Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                        style={{
                            borderColor: 'var(--border)',
                            color: 'var(--text-primary)'
                        }}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <School size={16} /> University
                    </label>
                    <input
                        type="text"
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                        style={{
                            borderColor: 'var(--border)',
                            color: 'var(--text-primary)'
                        }}
                    />
                </div>

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
