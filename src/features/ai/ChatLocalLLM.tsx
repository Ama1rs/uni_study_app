import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '../../lib/utils';
import {
    Send,
    Loader2,
    Settings,
    RefreshCw,
    Trash2,
    Copy,
    Check,
    Zap,
    Timer,
    Gauge,
    MessageSquare,
    Plus,
    Clock,
    Bot,
    User,
    ChevronRight,
    Sparkles,
    Trash,
    Shield
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatHistory } from './useChatHistory';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

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
    const [loading, setLoading] = useState(false);
    const [modelStatus, setModelStatus] = useState<ModelStatus>({ loaded: false, model_path: null });
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(true);
    const [settings, setSettings] = useState<ChatSettings>({
        temperature: 0.7,
        maxTokens: 1024,
        systemPrompt: "You are a helpful AI assistant.",
        top_p: 0.95
    });
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; sessionId: string | null }>({
        isOpen: false,
        sessionId: null
    });
    const [clearAllConfirm, setClearAllConfirm] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Use chat history hook
    const {
        sessions,
        currentSessionId,
        createSession,
        selectSession,
        addMessage,
        deleteSession,
        clearAllSessions,
        getCurrentMessages
    } = useChatHistory();

    const messages = getCurrentMessages();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

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
        if (!modelStatus.model_path) return 'No model loaded';
        const parts = modelStatus.model_path.split(/[/\\]/);
        const filename = parts[parts.length - 1];
        return filename.replace('.gguf', '');
    };

    const handleSend = async () => {
        if (!input.trim() || !modelStatus.loaded) return;

        const userContent = input.trim();

        // Build the full prompt
        let fullPrompt = '';
        if (settings.systemPrompt) {
            fullPrompt += `<|im_start|>system\n${settings.systemPrompt}<|im_end|>\n`;
        }
        for (const msg of messages) {
            if (msg.role === 'user') {
                fullPrompt += `<|im_start|>user\n${msg.content}<|im_end|>\n`;
            } else if (msg.role === 'assistant') {
                fullPrompt += `<|im_start|>assistant\n${msg.content}<|im_end|>\n`;
            }
        }
        fullPrompt += `<|im_start|>user\n${userContent}<|im_end|>\n<|im_start|>assistant\n`;

        addMessage('user', userContent);
        setInput('');
        setLoading(true);

        try {
            const result = await invoke<InferenceResult>('chat_direct', {
                prompt: fullPrompt,
                max_tokens: settings.maxTokens,
                temperature: settings.temperature
            });

            addMessage('assistant', result.content.trim(), result.metrics);
        } catch (error) {
            console.error("Chat failed:", error);
            addMessage('assistant', `Error: ${typeof error === 'string' ? error : 'Failed to get response from model.'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (content: string, idx: number) => {
        navigator.clipboard.writeText(content);
        setCopiedId(idx);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleNewChat = () => {
        createSession();
    };

    const handleDeleteSession = (sessionId: string) => {
        setDeleteConfirm({ isOpen: true, sessionId });
    };

    const confirmDelete = () => {
        if (deleteConfirm.sessionId) {
            deleteSession(deleteConfirm.sessionId);
        }
        setDeleteConfirm({ isOpen: false, sessionId: null });
    };

    const confirmClearAll = () => {
        clearAllSessions();
        setClearAllConfirm(false);
    };

    const formatRelativeTime = (timestamp: number): string => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex w-full h-full relative overflow-hidden bg-bg-primary">
            {/* --- Session Sidebar --- */}
            <motion.div
                initial={false}
                animate={{
                    width: showHistory ? 280 : 0,
                    opacity: showHistory ? 1 : 0,
                    marginRight: showHistory ? 16 : 0
                }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="h-[calc(100vh-5.5rem)] my-6 ml-4 bg-bg-surface/40 backdrop-blur-2xl border border-border flex flex-col z-30 overflow-hidden relative shrink-0 rounded-[2rem]"
            >
                <div className="w-[280px] flex flex-col h-full">
                    {/* Sidebar Header */}
                    <div className="p-6 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-accent-dim text-accent">
                                <MessageSquare size={16} />
                            </div>
                            <h3 className="text-sm font-bold tracking-tight text-text-primary">History</h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleNewChat}
                                className="p-2 rounded-xl bg-bg-primary/50 hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-all border border-border/50"
                                title="New Chat"
                            >
                                <Plus size={16} />
                            </button>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="p-2 rounded-xl bg-bg-primary/50 hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-all border border-border/50"
                                title="Hide History"
                            >
                                <ChevronRight size={16} className="rotate-180" />
                            </button>
                        </div>
                    </div>

                    {/* Recent History List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
                        {sessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-text-tertiary mt-10">
                                <Sparkles size={32} className="mb-4 opacity-20" />
                                <p className="text-xs font-mono uppercase tracking-[0.2em] opacity-40">No entries</p>
                            </div>
                        ) : (
                            sessions
                                .sort((a, b) => b.updatedAt - a.updatedAt)
                                .map(session => (
                                    <div
                                        key={session.id}
                                        onClick={() => selectSession(session.id)}
                                        className={cn(
                                            "group relative p-3 rounded-xl cursor-pointer transition-all duration-300 border flex items-center gap-3",
                                            session.id === currentSessionId
                                                ? "bg-accent/10 border-accent/20"
                                                : "hover:bg-bg-hover border-transparent opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-1 h-1 rounded-full",
                                            session.id === currentSessionId ? "bg-accent shadow-[0_0_8px_var(--accent)]" : "bg-transparent"
                                        )} />

                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-xs font-semibold truncate mb-0.5",
                                                session.id === currentSessionId ? "text-text-primary" : "text-text-secondary"
                                            )}>
                                                {session.title}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-[9px] text-text-tertiary/60 font-mono">
                                                <span>{formatRelativeTime(session.updatedAt)}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteSession(session.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-text-tertiary hover:text-red-400 transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-border/50">
                        <button
                            onClick={() => setClearAllConfirm(true)}
                            className="w-full h-11 flex items-center justify-center gap-2 rounded-2xl text-[10px] font-bold text-text-tertiary hover:text-red-400 hover:bg-red-500/5 transition-all uppercase tracking-widest border border-transparent hover:border-red-500/10"
                        >
                            <Trash size={12} />
                            Clear History
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* --- Main Chat Stage --- */}
            <motion.div
                layout
                className="flex-1 h-[calc(100vh-5.5rem)] my-6 mr-4 bg-bg-surface/40 backdrop-blur-2xl border border-border flex flex-col relative overflow-hidden rounded-[2rem]"
            >
                {/* Stage Header */}
                <div className="h-16 flex items-center justify-between px-6 z-20 border-b border-border/30">
                    <div className="flex items-center gap-4">
                        <AnimatePresence mode="wait">
                            {!showHistory && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8, x: -10 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, x: -10 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowHistory(true)}
                                    className="w-9 h-9 rounded-xl bg-bg-primary/50 backdrop-blur-md border border-border/50 flex items-center justify-center text-text-secondary hover:text-accent transition-all"
                                    title="Show History"
                                >
                                    <ChevronRight size={16} />
                                </motion.button>
                            )}
                        </AnimatePresence>

                        <div className="flex items-center gap-3">
                            <h1 className="text-sm font-bold text-text-primary tracking-tight">Assistant</h1>
                            <div className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-bg-primary/30 border border-border/50">
                                <div className={cn(
                                    "w-1 h-1 rounded-full",
                                    modelStatus.loaded ? "bg-accent shadow-[0_0_5px_var(--accent)]" : "bg-red-500"
                                )} />
                                <span className="text-[9px] font-mono text-text-tertiary uppercase tracking-wider">
                                    {modelStatus.loaded ? getModelName() : "Offline"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={checkModelStatus}
                            className="w-9 h-9 rounded-xl bg-bg-primary/50 border border-border/50 flex items-center justify-center text-text-secondary hover:text-accent transition-all group"
                        >
                            <RefreshCw size={16} className="group-active:rotate-180 transition-transform duration-500" />
                        </button>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center border transition-all",
                                showSettings
                                    ? "bg-accent border-accent/20 text-bg-primary"
                                    : "bg-bg-primary/50 border-border/50 text-text-secondary hover:text-text-primary"
                            )}
                        >
                            <Settings size={16} />
                        </button>
                        <div className="h-4 w-px bg-border/50 mx-1" />
                        <div className="flex items-center pl-1">
                            <div className="w-9 h-9 rounded-full border border-border/50 overflow-hidden bg-bg-primary/50 flex items-center justify-center">
                                <User size={18} className="text-text-tertiary" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-4 relative">
                    <div className="max-w-4xl mx-auto space-y-12 pb-32">
                        {messages.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-border flex items-center justify-center mb-4">
                                    <Bot size={32} className="text-accent" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold text-text-primary">Private AI Chat</h2>
                                    <p className="text-text-secondary max-w-sm mx-auto leading-relaxed text-sm">
                                        Your local neural workspace. Encrypted and offline.
                                    </p>
                                    {!modelStatus.loaded && (
                                        <div className="mt-6 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 max-w-xs mx-auto">
                                            <p className="text-xs text-red-500 font-medium mb-2">Model Offline</p>
                                            <button
                                                onClick={() => setShowSettings(true)}
                                                className="text-[10px] font-bold uppercase tracking-tight text-accent hover:underline"
                                            >
                                                Configure AI Engine
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            messages.filter(m => m.role !== 'system').map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className={cn(
                                        "flex w-full group transition-all",
                                        msg.role === 'user' ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div className={cn(
                                        "flex gap-4 max-w-[85%]",
                                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                                    )}>
                                        <div className={cn(
                                            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-1",
                                            msg.role === 'user'
                                                ? "bg-accent text-bg-primary"
                                                : "bg-bg-surface border border-border text-accent"
                                        )}>
                                            {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                                        </div>

                                        <div className={cn(
                                            "flex flex-col space-y-2",
                                            msg.role === 'user' ? "items-end" : "items-start"
                                        )}>
                                            <div className={cn(
                                                "p-5 rounded-3xl text-sm leading-relaxed border relative overflow-hidden",
                                                msg.role === 'user'
                                                    ? "bg-accent text-bg-primary border-accent/20 rounded-tr-sm"
                                                    : "bg-bg-surface text-text-primary border-border rounded-tl-sm shadow-none"
                                            )}>


                                                <div className={cn(
                                                    "markdown-content prose prose-sm max-w-none prose-invert",
                                                    "prose-p:text-text-primary/95 prose-headings:text-text-primary prose-strong:text-text-primary prose-code:text-accent",
                                                    "prose-li:text-text-primary/90 prose-ul:my-2 prose-ol:my-2",
                                                    msg.role === 'user'
                                                        ? "prose-p:text-bg-primary font-medium prose-headings:text-bg-primary prose-strong:text-bg-primary prose-code:text-bg-primary/80"
                                                        : ""
                                                )}>
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                </div>
                                            </div>

                                            {/* Metrics & Actions */}
                                            <div className={cn(
                                                "flex items-center gap-4 px-1",
                                                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                                            )}>
                                                {msg.role === 'assistant' && msg.metrics && (
                                                    <div className="flex items-center gap-3 text-[9px] font-mono text-text-tertiary uppercase tracking-widest">
                                                        <div className="flex items-center gap-1.5"><Timer size={10} />{msg.metrics.ttft_ms}ms</div>
                                                        <div className="flex items-center gap-1.5"><Gauge size={10} />{msg.metrics.tps.toFixed(1)}TPS</div>
                                                        <div className="flex items-center gap-1.5"><Zap size={10} />{msg.metrics.total_tokens}TK</div>
                                                    </div>
                                                )}

                                                {msg.role === 'assistant' && (
                                                    <button
                                                        onClick={() => handleCopy(msg.content, idx)}
                                                        className="p-1.5 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-accent transition-all opacity-0 group-hover:opacity-100"
                                                        title="Copy content"
                                                    >
                                                        {copiedId === idx ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}

                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex gap-4"
                            >
                                <div className="w-10 h-10 rounded-2xl bg-bg-surface border border-border flex items-center justify-center shrink-0">
                                    <Loader2 className="animate-spin text-accent" size={18} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="bg-bg-surface border border-border rounded-3xl rounded-tl-sm px-6 py-4 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-[9px] font-mono text-text-tertiary uppercase tracking-[0.2em] ml-2">Thinking...</span>
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* --- Input Command Center --- */}
                <div className="absolute bottom-6 inset-x-0 flex justify-center px-8 z-30 pointer-events-none">
                    <div className="w-full max-w-3xl glass-card rounded-[32px] p-2 flex flex-col gap-2 pointer-events-auto border border-border shadow-none">
                        <div className="relative flex items-end gap-2 p-1 pl-4">
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
                                        ? "Type a message..."
                                        : "Model offline"
                                }
                                disabled={!modelStatus.loaded || loading}
                                rows={1}
                                className="flex-1 bg-transparent py-4 text-sm text-text-primary placeholder-text-tertiary focus:outline-none resize-none font-sans custom-scrollbar"
                                style={{ minHeight: '52px', maxHeight: '200px' }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                                }}
                            />

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSend}
                                disabled={!input.trim() || loading || !modelStatus.loaded}
                                className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 mb-1",
                                    input.trim() && !loading && modelStatus.loaded
                                        ? "bg-accent text-bg-primary"
                                        : "bg-bg-surface text-text-tertiary border border-border"
                                )}
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            </motion.button>
                        </div>

                        <div className="flex items-center justify-between px-5 pb-2">
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest flex items-center gap-1.5">
                                    <Shield size={10} /> Local
                                </span>
                                <span className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest flex items-center gap-1.5">
                                    <Clock size={10} /> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <span className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest">
                                SHIFT + ENTER FOR NEW LINE
                            </span>
                        </div>
                    </div>
                </div>

                {/* Settings Overlay Panel */}
                <AnimatePresence>
                    {showSettings && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowSettings(false)}
                                className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40"
                            />
                            <div className="absolute inset-y-0 right-6 flex items-center z-50 pointer-events-none">
                                <motion.div
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 30 }}
                                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                    className="w-80 h-fit bg-bg-surface/40 backdrop-blur-2xl rounded-[2rem] flex flex-col overflow-hidden border border-border shadow-2xl max-h-[calc(100vh-10rem)] pointer-events-auto"
                                >
                                    <div className="p-4 pb-0 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-accent-dim text-accent">
                                                <Settings size={16} />
                                            </div>
                                            <h3 className="text-sm font-bold tracking-tight text-text-primary">Settings</h3>
                                        </div>
                                        <button
                                            onClick={() => setShowSettings(false)}
                                            className="p-2 rounded-lg hover:bg-bg-hover text-text-tertiary transition-all"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
                                        <div className="p-3 rounded-xl bg-accent-dim">
                                            <p className="text-[9px] text-text-secondary/70 leading-relaxed font-medium">
                                                Global model settings are in the dashboard.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-tertiary/60">Temperature</label>
                                                <span className="px-1.5 py-0.5 rounded bg-bg-primary/50 text-[9px] font-mono text-accent">{settings.temperature}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="2"
                                                step="0.1"
                                                value={settings.temperature}
                                                onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                                                className="w-full accent-accent h-1 bg-bg-primary/50 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-tertiary/60">Max Tokens</label>
                                                <span className="px-1.5 py-0.5 rounded bg-bg-primary/50 text-[9px] font-mono text-accent">{settings.maxTokens}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="64"
                                                max="4096"
                                                step="64"
                                                value={settings.maxTokens}
                                                onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                                                className="w-full accent-accent h-1 bg-bg-primary/50 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-tertiary/60">System Persona</label>
                                            <textarea
                                                value={settings.systemPrompt}
                                                onChange={(e) => setSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                                                className="w-full h-20 rounded-xl border border-border/20 bg-bg-primary/20 p-3 text-[10px] text-text-secondary font-mono focus:outline-none focus:border-accent/20 transition-colors custom-scrollbar"
                                                placeholder="System instructions..."
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 pt-0">
                                        <button
                                            onClick={() => setShowSettings(false)}
                                            className="w-full py-3 bg-accent text-bg-primary font-bold text-[9px] uppercase tracking-[0.2em] rounded-xl shadow-[0_4px_12px_rgba(22,163,74,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        </>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* --- Modals --- */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                title="Erase Memory"
                description="Are you sure you want to delete this neural session? This data will be permanently purged from local storage."
                confirmText="Erase"
                cancelText="Keep"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, sessionId: null })}
                danger
            />

            <ConfirmDialog
                isOpen={clearAllConfirm}
                title="Wipe All History"
                description="This will execute a full wipe of all chat history. This action is irreversible."
                confirmText="Execute Wipe"
                cancelText="Abort"
                onConfirm={confirmClearAll}
                onCancel={() => setClearAllConfirm(false)}
                danger
            />
        </div>
    );
}
