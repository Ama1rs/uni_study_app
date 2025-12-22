import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Bot, Cpu, Key, FolderOpen, Save, Loader2, CheckCircle2, XCircle, Trash2, Settings2 } from 'lucide-react';
import { AdvancedLLMSettings } from './AdvancedLLMSettings';

interface OnboardingState {
    completed: boolean;
    ai_provider?: 'gemini' | 'local';
    ai_api_key?: string;
    ai_endpoint?: string;
    n_gpu_layers?: number;
    n_ctx?: number;
    n_threads?: number;
}

interface ModelStatus {
    loaded: boolean;
    model_path: string | null;
}

export function AISettings() {
    const [provider, setProvider] = useState<'gemini' | 'local'>('gemini');
    const [apiKey, setApiKey] = useState('');
    const [modelPath, setModelPath] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fullState, setFullState] = useState<OnboardingState | null>(null);
    const [modelStatus, setModelStatus] = useState<ModelStatus>({ loaded: false, model_path: null });
    const [loadingModel, setLoadingModel] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        loadSettings();
        checkModelStatus();
    }, []);

    const loadSettings = async () => {
        try {
            const state = await invoke<OnboardingState>('get_onboarding_state');
            setFullState(state);
            setProvider(state.ai_provider || 'gemini');
            setApiKey(state.ai_api_key || '');
            setModelPath(state.ai_endpoint || ''); // Reuse endpoint field for model path
        } catch (error) {
            console.error("Failed to load AI settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const checkModelStatus = async () => {
        try {
            const status = await invoke<ModelStatus>('get_model_status');
            setModelStatus(status);
            if (status.model_path) {
                setModelPath(status.model_path);
            }
        } catch (error) {
            console.error("Failed to check model status:", error);
        }
    };

    const handleSave = async () => {
        if (!fullState) return;
        setSaving(true);
        try {
            await invoke('set_onboarding_state', {
                data: {
                    ...fullState,
                    ai_provider: provider,
                    ai_api_key: apiKey,
                    ai_endpoint: modelPath // Store model path in endpoint field
                }
            });
        } catch (error) {
            console.error("Failed to save AI settings:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleSelectModel = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: 'GGUF Models', extensions: ['gguf'] }]
            });
            if (selected && typeof selected === 'string') {
                setModelPath(selected);
                setLoadError(null);
            }
        } catch (error) {
            console.error("Failed to select model:", error);
        }
    };

    const handleLoadModel = async () => {
        if (!modelPath) return;
        setLoadingModel(true);
        setLoadError(null);
        try {
            // Include advanced params from fullState if they exist
            const result = await invoke<string>('load_gguf_model', {
                modelPath: modelPath,
                nGpuLayers: fullState?.n_gpu_layers ?? 0,
                nCtx: fullState?.n_ctx ?? 2048,
                nThreads: fullState?.n_threads ?? 4
            });
            console.log(result);
            await checkModelStatus();
        } catch (error) {
            console.error("Failed to load model:", error);
            setLoadError(typeof error === 'string' ? error : 'Failed to load model');
        } finally {
            setLoadingModel(false);
        }
    };

    const handleUnloadModel = async () => {
        try {
            await invoke<string>('unload_gguf_model');
            await checkModelStatus();
        } catch (error) {
            console.error("Failed to unload model:", error);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-accent" /></div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>AI & Intelligence</h2>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Configure your AI assistant provider</p>
                </div>
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showAdvanced
                            ? 'bg-accent text-black shadow-lg shadow-accent/20'
                            : 'bg-bg-surface border border-border text-text-secondary hover:text-text-primary'
                        }`}
                >
                    <Settings2 size={14} />
                    {showAdvanced ? 'Simple View' : 'Advanced Configuration'}
                </button>
            </div>

            {showAdvanced ? (
                <AdvancedLLMSettings />
            ) : (
                <div className="space-y-6">
                    {/* Provider Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setProvider('gemini')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${provider === 'gemini'
                                ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                                : 'border-[var(--border)] hover:border-[var(--border-light)]'
                                }`}
                        >
                            <Bot size={24} className="mb-2" style={{ color: provider === 'gemini' ? 'var(--accent)' : 'var(--text-secondary)' }} />
                            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Gemini API</h3>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Cloud-based, requires API key</p>
                        </button>

                        <button
                            onClick={() => setProvider('local')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${provider === 'local'
                                ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                                : 'border-[var(--border)] hover:border-[var(--border-light)]'
                                }`}
                        >
                            <Cpu size={24} className="mb-2" style={{ color: provider === 'local' ? 'var(--accent)' : 'var(--text-secondary)' }} />
                            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Local GGUF Model</h3>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Direct inference, private & offline</p>
                        </button>
                    </div>

                    {/* Configuration Fields */}
                    <div className="space-y-4 p-4 rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                        {provider === 'gemini' ? (
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                                    <Key size={16} /> API Key
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter Gemini API Key"
                                    className="w-full px-4 py-2 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                                />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Model Status */}
                                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: modelStatus.loaded ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                                    {modelStatus.loaded ? (
                                        <>
                                            <CheckCircle2 size={16} className="text-green-500" />
                                            <span className="text-sm text-green-500">Model loaded</span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle size={16} className="text-red-400" />
                                            <span className="text-sm text-red-400">No model loaded</span>
                                        </>
                                    )}
                                </div>

                                {/* Model Path */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                                        <FolderOpen size={16} /> GGUF Model File
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={modelPath}
                                            onChange={(e) => setModelPath(e.target.value)}
                                            placeholder="Select a .gguf model file"
                                            className="flex-1 px-4 py-2 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all text-sm"
                                            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                                        />
                                        <button
                                            onClick={handleSelectModel}
                                            className="px-4 py-2 rounded-lg border text-sm hover:bg-[var(--bg-hover)] transition-colors"
                                            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                                        >
                                            Browse
                                        </button>
                                    </div>
                                </div>


                                {/* Load Error */}
                                {loadError && (
                                    <div className="p-3 rounded-lg text-sm text-red-400" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                                        {loadError}
                                    </div>
                                )}

                                {/* Load/Unload Buttons */}
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleLoadModel}
                                        disabled={!modelPath || loadingModel}
                                        className="flex-1 px-4 py-2 rounded-lg font-medium text-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                        style={{ backgroundColor: 'var(--accent)' }}
                                    >
                                        {loadingModel ? <Loader2 size={16} className="animate-spin" /> : <Cpu size={16} />}
                                        {loadingModel ? 'Loading...' : 'Load Model'}
                                    </button>
                                    {modelStatus.loaded && (
                                        <button
                                            onClick={handleUnloadModel}
                                            className="px-4 py-2 rounded-lg font-medium border text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2"
                                            style={{ borderColor: 'var(--border)' }}
                                        >
                                            <Trash2 size={16} />
                                            Unload
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
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
            )}
        </div>
    );
}
