import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface UserPublic {
    id: number;
    username: string;
    created_at?: string;
}

interface AuthScreenProps {
    onAuthenticated: (user: UserPublic) => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError(null);
        if (!username || !password) {
            setError('Username and password are required');
            return;
        }
        if (mode === 'signup' && password !== confirm) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const cmd = mode === 'signin' ? 'login' : 'register_user';
            const user = await invoke<UserPublic>(cmd, { username, password });
            if (remember) {
                await invoke('set_remembered_user', { user_id: user.id });
            }
            onAuthenticated(user);
        } catch (e: any) {
            setError(e?.toString?.() || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen w-screen bg-bg-base">
            <div className="w-full max-w-md rounded-2xl border border-border bg-bg-surface/80 p-8 shadow-xl backdrop-blur">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text-primary">
                        {mode === 'signin' ? 'Sign In' : 'Create Account'}
                    </h2>
                    <button
                        className="text-sm text-accent"
                        onClick={() => {
                            setMode(mode === 'signin' ? 'signup' : 'signin');
                            setError(null);
                        }}
                    >
                        {mode === 'signin' ? 'Need an account?' : 'Already have an account?'}
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-text-secondary">Username</label>
                        <input
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-transparent text-text-primary outline-none focus:border-accent"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-xs text-text-secondary">Password</label>
                        <input
                            type="password"
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-transparent text-text-primary outline-none focus:border-accent"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    {mode === 'signup' && (
                        <div>
                            <label className="text-xs text-text-secondary">Confirm password</label>
                            <input
                                type="password"
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-transparent text-text-primary outline-none focus:border-accent"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                            />
                        </div>
                    )}

                    <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="accent-accent"
                        />
                        Skip login on this device
                    </label>

                    {error && <div className="text-sm text-red-400">{error}</div>}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full mt-2 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    );
}
