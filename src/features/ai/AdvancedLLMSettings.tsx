import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings2, Cpu, Zap, MessageSquare, Sliders, Save, Loader2, Info } from 'lucide-react';

interface OnboardingState {
    completed: boolean;
    n_gpu_layers?: number;
    n_ctx?: number;
    n_threads?: number;
    system_prompt?: string;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
}

export function AdvancedLLMSettings() {
    const [settings, setSettings] = useState<OnboardingState | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const state = await invoke<OnboardingState>('get_onboarding_state');
            setSettings({
                ...state,
                n_gpu_layers: state.n_gpu_layers ?? 0,
                n_ctx: state.n_ctx ?? 2048,
                n_threads: state.n_threads ?? 4,
                system_prompt: state.system_prompt ?? "You are a helpful AI assistant.",
                temperature: state.temperature ?? 0.7,
                top_p: state.top_p ?? 0.95,
                max_tokens: state.max_tokens ?? 1024,
            });
        } catch (error) {
            console.error("Failed to load advanced AI settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await invoke('set_onboarding_state', { data: settings });
        } catch (error) {
            console.error("Failed to save advanced AI settings:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-accent" /></div>;
    }

    if (!settings) return <div>Error loading settings</div>;

    return (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Settings2 size={20} className="text-accent" />
                    Advanced LLM Configuration
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Fine-tune local inference performance and hardware acceleration.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hardware Acceleration */}
                <div className="col-span-full p-4 rounded-xl border border-dashed border-accent/30 bg-accent/5">
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-accent/20 text-accent">
                            <Zap size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-text-primary flex items-center gap-2">
                                GPU Acceleration
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-black font-bold uppercase">Performance boost</span>
                            </h3>
                            <p className="text-xs text-text-tertiary mt-1 mb-4 flex items-center gap-1">
                                <Info size={12} /> Set how many layers of the model to offload to your GPU. 0 uses only CPU.
                            </p>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-mono text-text-secondary">GPU Layers</span>
                                    <span className="text-sm font-bold text-accent">{settings.n_gpu_layers} layers</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="64"
                                    step="1"
                                    value={settings.n_gpu_layers}
                                    onChange={(e) => setSettings({ ...settings, n_gpu_layers: parseInt(e.target.value) })}
                                    className="w-full accent-accent bg-bg-surface-light h-1.5 rounded-lg appearance-none cursor-pointer"
                                />
                                <p className="text-[10px] text-text-tertiary">Recommended: Start with 32 and adjust based on your VRAM.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resource Limits */}
                <div className="space-y-4 p-5 rounded-xl border bg-bg-surface/30 border-border">
                    <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
                        <Cpu size={16} className="text-blue-400" />
                        Inference Resources
                    </h3>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-text-secondary block">Context Size (n_ctx)</label>
                            <select
                                value={settings.n_ctx}
                                onChange={(e) => setSettings({ ...settings, n_ctx: parseInt(e.target.value) })}
                                className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                            >
                                <option value={512}>512 tokens (Low RAM)</option>
                                <option value={1024}>1024 tokens</option>
                                <option value={2048}>2048 tokens (Standard)</option>
                                <option value={4096}>4096 tokens</option>
                                <option value={8192}>8192 tokens</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-mono text-text-secondary block">CPU Threads</label>
                            <input
                                type="number"
                                min="1"
                                max="32"
                                value={settings.n_threads}
                                onChange={(e) => setSettings({ ...settings, n_threads: parseInt(e.target.value) })}
                                className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                    </div>
                </div>

                {/* Sampling Parameters */}
                <div className="space-y-4 p-5 rounded-xl border bg-bg-surface/30 border-border">
                    <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
                        <Sliders size={16} className="text-purple-400" />
                        Sampling Parameters
                    </h3>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-mono text-text-secondary">Temperature</label>
                                <span className="text-xs font-bold text-accent">{settings.temperature}</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="2" step="0.1"
                                value={settings.temperature}
                                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                                className="w-full accent-accent bg-bg-surface-light h-1 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-mono text-text-secondary">Top-P</label>
                                <span className="text-xs font-bold text-accent">{settings.top_p}</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="1" step="0.05"
                                value={settings.top_p}
                                onChange={(e) => setSettings({ ...settings, top_p: parseFloat(e.target.value) })}
                                className="w-full accent-accent bg-bg-surface-light h-1 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-mono text-text-secondary block">Max Predicted Tokens</label>
                            <input
                                type="number"
                                min="1" max="8192"
                                value={settings.max_tokens}
                                onChange={(e) => setSettings({ ...settings, max_tokens: parseInt(e.target.value) })}
                                className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                    </div>
                </div>

                {/* Persona & System */}
                <div className="col-span-full space-y-4 p-5 rounded-xl border bg-bg-surface/30 border-border">
                    <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
                        <MessageSquare size={16} className="text-green-400" />
                        System Persona
                    </h3>

                    <div className="space-y-2">
                        <label className="text-xs font-mono text-text-secondary block">Global System Prompt</label>
                        <textarea
                            value={settings.system_prompt}
                            onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
                            className="w-full h-24 bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none font-sans leading-relaxed"
                            placeholder="Example: You are a physics tutor specialized in classical mechanics..."
                        />
                        <p className="text-[10px] text-text-tertiary">This prompt is injected before every chat session to guide the model's behavior.</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-2.5 rounded-xl font-bold text-black transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/20"
                    style={{ backgroundColor: 'var(--accent)' }}
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Save Advanced Configuration
                </button>
            </div>
        </div>
    );
}
