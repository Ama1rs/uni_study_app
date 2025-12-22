import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '../lib/utils';
import { Send, Loader2, Settings, RefreshCw, Circle, Trash2, Copy, Check, Zap, Timer, Gauge } from 'lucide-react';
import { Layout } from './Layout';

interface InferenceMetrics {
    ttft_ms: number;
    tps: number;
    total_tokens: number;
    total_time_ms: number;
}

interface InferenceResult {
    content: string;
    metrics: InferenceMetrics;
}

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    metrics?: InferenceMetrics;
}

interface ModelStatus {
    loaded: boolean;
    model_path: string | null;
}

interface ChatSettings {
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    top_p: number;
}

export function ChatLocalLLM() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [modelStatus, setModelStatus] = useState<ModelStatus>({ loaded: false, model_path: null });
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<ChatSettings>({
        temperature: 0.7,
        maxTokens: 1024,
        systemPrompt: "You are a helpful AI assistant.",
        top_p: 0.95
    });
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        checkModelStatus();
        loadAdvancedSettings();
    }, []);

    const loadAdvancedSettings = async () => {
        try {
            const state = await invoke<any>('get_onboarding_state');
            if (state) {
                setSettings({
                    temperature: state.temperature ?? 0.7,
                    maxTokens: state.max_tokens ?? 1024,
                    systemPrompt: state.system_prompt ?? "You are a helpful AI assistant.",
                    top_p: state.top_p ?? 0.95
                });
            }
        } catch (error) {
            console.error("Failed to load advanced settings for chat:", error);
        }
    };

    const checkModelStatus = async () => {
        try {
            const status = await invoke<ModelStatus>('get_model_status');
            setModelStatus(status);
        } catch (error) {
            console.error("Failed to check model status:", error);
            setModelStatus({ loaded: false, model_path: null });
        }
    };

    const getModelName = () => {
        if (!modelStatus.model_path) return 'No model';
        const parts = modelStatus.model_path.split(/[/\\]/);
        const filename = parts[parts.length - 1];
        return filename.replace('.gguf', '');
    };

    const handleSend = async () => {
        if (!input.trim() || !modelStatus.loaded) return;

        const userMsg: ChatMessage = { role: 'user', content: input.trim() };

        // Build the full prompt with system prompt and conversation history
        let fullPrompt = '';
        if (settings.systemPrompt) {
            fullPrompt += `<|im_start|>system\n${settings.systemPrompt}<|im_end|>\n`;
        }

        // Add conversation history
        for (const msg of messages) {
            if (msg.role === 'user') {
                fullPrompt += `<|im_start|>user\n${msg.content}<|im_end|>\n`;
            } else if (msg.role === 'assistant') {
                fullPrompt += `<|im_start|>assistant\n${msg.content}<|im_end|>\n`;
            }
        }

        // Add current message
        fullPrompt += `<|im_start|>user\n${input.trim()}<|im_end|>\n<|im_start|>assistant\n`;

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const result = await invoke<InferenceResult>('chat_direct', {
                prompt: fullPrompt,
                max_tokens: settings.maxTokens,
                temperature: settings.temperature
            });

            const assistantMsg: ChatMessage = {
                role: 'assistant',
                content: result.content.trim(),
                metrics: result.metrics
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (error) {
            console.error("Chat failed:", error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Error: ${typeof error === 'string' ? error : 'Failed to get response from model.'}`
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (content: string, idx: number) => {
        navigator.clipboard.writeText(content);
        setCopiedId(idx);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const clearChat = () => {
        setMessages([]);
    };

    return (
        <Layout>
            <div className="flex-1 h-full flex gap-4 mx-2 mt-4 overflow-hidden">

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col glass-card rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-bg-surface/50">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2" title={modelStatus.loaded ? "Model loaded" : "No model loaded"}>
                                <Circle size={10} className={cn("fill-current", modelStatus.loaded ? "text-green-500" : "text-red-500")} />
                                <span className="font-mono text-sm text-text-primary font-medium">Local LLM</span>
                            </div>

                            <div className="h-4 w-px bg-border mx-1" />

                            <div className="flex items-center gap-2 text-xs font-mono">
                                <span className="text-text-tertiary">Model</span>
                                <span
                                    className="px-2 py-1 rounded-md bg-bg-surface border border-border text-text-secondary truncate max-w-[200px]"
                                    title={modelStatus.model_path || undefined}
                                >
                                    {getModelName()}
                                </span>
                                <button
                                    onClick={checkModelStatus}
                                    className="p-1 rounded-md hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors"
                                    title="Refresh status"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={clearChat}
                                className="p-2 rounded-md hover:bg-bg-hover text-text-tertiary hover:text-red-400 transition-colors"
                                title="Clear Chat"
                            >
                                <Trash2 size={16} />
                            </button>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={cn(
                                    "p-2 rounded-md transition-colors",
                                    showSettings ? "bg-accent/10 text-accent" : "hover:bg-bg-hover text-text-secondary hover:text-text-primary"
                                )}
                                title="Chat Settings"
                            >
                                <Settings size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-text-tertiary opacity-50">
                                <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-border flex items-center justify-center mb-4 text-accent">
                                    <Zap size={24} />
                                </div>
                                <p className="font-mono text-sm">Start a conversation with your local AI</p>
                                {!modelStatus.loaded && (
                                    <div className="mt-4 text-center">
                                        <p className="text-xs text-red-400 mb-2 font-mono uppercase tracking-widest">Off-line/No model</p>
                                        <p className="text-xs text-text-tertiary">
                                            Go to <span className="text-accent underline cursor-pointer">Settings → AI</span> to load a GGUF model.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {messages.filter(m => m.role !== 'system').map((msg, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    'flex gap-4 max-w-3xl mx-auto',
                                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                                    msg.role === 'user' ? "bg-accent text-black" : "bg-bg-surface border border-border text-text-secondary"
                                )}>
                                    {msg.role === 'user' ? 'U' : 'AI'}
                                </div>

                                <div className={cn(
                                    "flex-1 min-w-0 group relative",
                                    msg.role === 'user' ? "text-right" : "text-left"
                                )}>
                                    <div className={cn(
                                        "inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap font-sans",
                                        msg.role === 'user'
                                            ? "bg-accent/10 text-text-primary border border-accent/20 rounded-tr-sm"
                                            : "bg-bg-surface text-text-secondary border border-border rounded-tl-sm"
                                    )}>
                                        {msg.content}
                                    </div>

                                    {msg.role === 'assistant' && msg.metrics && (
                                        <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-text-tertiary uppercase tracking-wider">
                                            <div className="flex items-center gap-1">
                                                <Timer size={10} />
                                                <span>TTFT: {msg.metrics.ttft_ms}ms</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Gauge size={10} />
                                                <span>Speed: {msg.metrics.tps.toFixed(1)} t/s</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Zap size={10} />
                                                <span>Tokens: {msg.metrics.total_tokens}</span>
                                            </div>
                                        </div>
                                    )}

                                    {msg.role === 'assistant' && (
                                        <div className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleCopy(msg.content, idx)}
                                                className="p-1.5 rounded hover:bg-bg-surface text-text-tertiary hover:text-text-primary"
                                            >
                                                {copiedId === idx ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex gap-4 max-w-3xl mx-auto">
                                <div className="w-8 h-8 rounded-lg bg-bg-surface border border-border flex items-center justify-center shrink-0">
                                    <Loader2 className="animate-spin text-accent" size={14} />
                                </div>
                                <div className="flex items-center gap-1 h-8">
                                    <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    {/* Input Area */}
                    <div className="border-t border-border bg-bg-surface/30 backdrop-blur-sm px-4 py-3">
                        <div className="w-full max-w-3xl mx-auto flex flex-col gap-2">
                            <div className="relative w-full">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder={
                                        modelStatus.loaded
                                            ? "Ask something clearly. Shift+Enter for new line."
                                            : "Load a model in Settings to start chatting."
                                    }
                                    disabled={!modelStatus.loaded || loading}
                                    rows={1}
                                    className="w-full rounded-xl border border-border bg-bg-surface pl-4 pr-12 py-3 text-sm text-text-primary font-mono placeholder-text-tertiary focus:outline-none focus:border-accent resize-none custom-scrollbar"
                                    style={{ minHeight: '46px', maxHeight: '120px' }}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading || !modelStatus.loaded}
                                    className={cn(
                                        "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all",
                                        input.trim() && !loading && modelStatus.loaded
                                            ? "bg-accent text-black hover:bg-accent-hover shadow-lg shadow-accent/20"
                                            : "bg-bg-surface text-text-tertiary border border-border cursor-not-allowed"
                                    )}
                                    title={!modelStatus.loaded ? "Load a model to chat" : "Send message"}
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                            <div className="w-full flex justify-between text-[10px] text-text-tertiary font-mono px-1">
                                <span className="truncate">
                                    Status: {modelStatus.loaded ? "Ready" : "No model loaded"}
                                </span>
                                <span>Enter = send • Shift+Enter = new line</span>
                            </div>
                        </div>
                    </div>


                </div>

                {/* Settings Sidebar */}
                {showSettings && (
                    <div className="w-72 glass-card rounded-xl border-l border-border flex flex-col animate-in slide-in-from-right duration-200">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-medium text-text-primary">Session Settings</h3>
                        </div>
                        <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="space-y-4 p-3 rounded-lg bg-accent/5 border border-accent/20">
                                <p className="text-[10px] text-accent font-bold uppercase tracking-widest">Tip</p>
                                <p className="text-[10px] text-text-secondary leading-relaxed font-sans">
                                    GPU acceleration and hardware settings are in the main <strong>Settings → AI</strong> page.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-xs text-text-secondary font-mono">Temperature</label>
                                    <span className="text-xs text-accent font-mono">{settings.temperature}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={settings.temperature}
                                    onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                                    className="w-full accent-accent h-1 bg-bg-surface rounded-lg appearance-none cursor-pointer"
                                />
                                <p className="text-[10px] text-text-tertiary">Higher values make output more random.</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-xs text-text-secondary font-mono">Max Tokens</label>
                                    <span className="text-xs text-accent font-mono">{settings.maxTokens}</span>
                                </div>
                                <input
                                    type="range"
                                    min="64"
                                    max="4096"
                                    step="64"
                                    value={settings.maxTokens}
                                    onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                                    className="w-full accent-accent h-1 bg-bg-surface rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-text-secondary font-mono">Session Persona</label>
                                <textarea
                                    value={settings.systemPrompt}
                                    onChange={(e) => setSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                                    className="w-full h-32 rounded-lg border border-border bg-bg-surface p-3 text-xs text-text-primary font-mono focus:outline-none focus:border-accent resize-none"
                                    placeholder="Override global system prompt for this session..."
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
