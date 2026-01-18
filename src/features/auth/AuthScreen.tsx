import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { supabase, isSupabaseConfigured, initializeSupabase } from '@/lib/supabase';
import { DeviceIdentity, SyncState } from '@/types/sync';

interface UserPublic {
    id: number;
    username: string;
    created_at?: string;
    is_cloud_user?: boolean;
}

interface AuthScreenProps {
    onAuthenticated: (user: UserPublic, authType: 'local' | 'cloud') => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [authType, setAuthType] = useState<'local' | 'cloud'>('local');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError(null);

        // Validation based on auth type
        if (authType === 'local') {
            if (!username || !password) {
                setError('Username and password are required');
                return;
            }
        } else {
            if (!email || !password) {
                setError('Email and password are required');
                return;
            }
        }

        if (mode === 'signup' && password !== confirm) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            if (authType === 'local') {
                // Local SQLite Auth
                const cmd = mode === 'signin' ? 'login' : 'register_user';
                const user = await invoke<UserPublic>(cmd, { username, password });
                if (remember) {
                    await invoke('set_remembered_user', { userId: user.id });
                }
                onAuthenticated({ ...user, is_cloud_user: false }, 'local');
            } else {
                // Supabase Auth
                if (!supabase) throw new Error("Supabase is not configured");

                if (mode === 'signup') {
                    const { data, error: signUpError } = await supabase.auth.signUp({
                        email,
                        password,
                    });
                    if (signUpError) throw signUpError;
                    if (!data.user) throw new Error("Sign up failed");

                    // Create local user linked to supabase
                    const localUser = await invoke<UserPublic>('register_user', {
                        username: email.split('@')[0],
                        password
                    });

                    // Get or create device identity
                    const device = await invoke<DeviceIdentity>('get_device_id', { platform: navigator.platform });
                    await invoke('update_device_last_seen', { deviceId: device.device_id });

                    // Initialize Supabase and check capabilities
                    const { capabilities } = await initializeSupabase();
                    
                    // Link local user with supabase_user_id in sync_state
                    const syncState: SyncState = {
                        is_sync_enabled: capabilities.sync,
                        supabase_user_id: data.user.id,
                        last_synced_at: undefined,
                        sync_protocol_version: 1,
                        is_premium_active: capabilities.sync,
                        device_id: device.device_id
                    };
                    
                    await invoke('set_sync_state', { syncState: syncState });

                    onAuthenticated({ ...localUser, is_cloud_user: true }, 'cloud');
                } else {
                    const { data, error: signInError } = await supabase.auth.signInWithPassword({
                        email,
                        password,
                    });
                    if (signInError) throw signInError;
                    if (!data.user) throw new Error("Sign in failed");

                    // Get or create device identity
                    const device = await invoke<DeviceIdentity>('get_device_id', { platform: navigator.platform });
                    await invoke('update_device_last_seen', { deviceId: device.device_id });

                    // Initialize Supabase and check capabilities
                    const { capabilities } = await initializeSupabase();

                    // Find or create local user
                    let localUser: UserPublic;
                    try {
                        localUser = await invoke<UserPublic>('login', {
                            username: email.split('@')[0],
                            password
                        });
                    } catch {
                        localUser = await invoke<UserPublic>('register_user', {
                            username: email.split('@')[0],
                            password
                        });
                    }

                    const syncState: SyncState = {
                        is_sync_enabled: capabilities.sync,
                        supabase_user_id: data.user.id,
                        last_synced_at: undefined,
                        sync_protocol_version: 1,
                        is_premium_active: capabilities.sync,
                        device_id: device.device_id
                    };
                    
                    await invoke('set_sync_state', { syncState: syncState });

                    onAuthenticated({ ...localUser, is_cloud_user: true }, 'cloud');
                }
            }
        } catch (e: any) {
            console.error('Auth error:', e);
            setError(e?.message || e?.toString?.() || 'Authentication failed');
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

                {/* Authentication Type Selection */}
                <div className="grid grid-cols-2 gap-2 mb-6 p-1 rounded-xl bg-bg-base/50">
                    <button
                        onClick={() => setAuthType('local')}
                        className={`py-2 text-xs font-medium rounded-lg transition-all ${authType === 'local'
                                ? 'bg-bg-surface text-text-primary shadow-sm'
                                : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        Local Account
                    </button>
                    <button
                        onClick={() => setAuthType('cloud')}
                        disabled={!isSupabaseConfigured}
                        className={`py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${authType === 'cloud'
                                ? 'bg-accent text-white shadow-sm'
                                : 'text-text-secondary hover:text-text-primary'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        Cloud Account
                        {!isSupabaseConfigured && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-surface/20">Offline</span>
                        )}
                    </button>
                </div>

                <div className="space-y-4">
                    {authType === 'local' ? (
                        <div>
                            <label className="text-xs text-text-secondary px-1">Username</label>
                            <input
                                className="w-full mt-1.5 px-3 py-2.5 rounded-xl border border-border bg-bg-base/30 text-text-primary outline-none focus:border-accent transition-all"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Choose a username"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="text-xs text-text-secondary px-1">Email Address</label>
                            <input
                                type="email"
                                className="w-full mt-1.5 px-3 py-2.5 rounded-xl border border-border bg-bg-base/30 text-text-primary outline-none focus:border-accent transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                autoFocus
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-xs text-text-secondary px-1">Password</label>
                        <input
                            type="password"
                            className="w-full mt-1.5 px-3 py-2.5 rounded-xl border border-border bg-bg-base/30 text-text-primary outline-none focus:border-accent transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    {mode === 'signup' && (
                        <div>
                            <label className="text-xs text-text-secondary px-1">Confirm Password</label>
                            <input
                                type="password"
                                className="w-full mt-1.5 px-3 py-2.5 rounded-xl border border-border bg-bg-base/30 text-text-primary outline-none focus:border-accent transition-all"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between px-1">
                        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                className="accent-accent w-4 h-4 rounded-lg"
                            />
                            Remember me
                        </label>
                    </div>

                    {error && (
                        <div className="text-sm p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 animate-in fade-in slide-in-from-top-1">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`w-full mt-2 py-3 rounded-xl font-semibold shadow-lg shadow-accent/20 transition-all active:scale-[0.98] ${authType === 'local'
                                ? 'bg-text-primary text-bg-base hover:bg-text-secondary'
                                : 'bg-accent text-white hover:opacity-90'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                {authType === 'local' ? 'Authenticating...' : 'Connecting to cloud...'}
                            </div>
                        ) : (
                            mode === 'signin' ? 'Sign In' : 'Create Account'
                        )}
                    </button>

                    {/* Help Text */}
                    {authType === 'local' && (
                        <p className="text-[10px] text-center text-text-secondary px-4 leading-relaxed">
                            Local accounts store data only on this device. You can enable cloud sync later in settings.
                        </p>
                    )}
                    
                    {authType === 'cloud' && (
                        <p className="text-[10px] text-center text-text-secondary px-4 leading-relaxed">
                            Cloud accounts synchronize your data across all devices securely.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}