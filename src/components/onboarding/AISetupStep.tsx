import { useState } from 'react';
import { Bot, Cpu, ArrowRight, ArrowLeft } from 'lucide-react';

interface AISetupStepProps {
    onNext: (data: { provider: 'gemini' | 'local'; apiKey?: string; endpoint?: string }) => void;
    onBack: () => void;
}

export function AISetupStep({ onNext, onBack }: AISetupStepProps) {
    const [provider, setProvider] = useState<'gemini' | 'local'>('gemini');
    const [apiKey, setApiKey] = useState('');
    const [endpoint, setEndpoint] = useState('http://localhost:11434');

    const handleSubmit = () => onNext({ provider, apiKey, endpoint });

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-text-primary mb-2">AI Provider</h2>
                <p className="text-sm text-text-secondary font-mono">Choose how to power AI features.</p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                    onClick={() => setProvider('gemini')}
                    className={`p-4 rounded-lg border text-left transition-all ${provider === 'gemini'
                            ? 'border-accent bg-accent/10'
                            : 'border-border bg-bg-surface hover:border-text-tertiary'
                        }`}
                >
                    <Bot size={20} className={provider === 'gemini' ? 'text-accent' : 'text-text-tertiary'} />
                    <h3 className="text-sm font-medium text-text-primary mt-3">Gemini API</h3>
                    <p className="text-xs text-text-tertiary mt-1 font-mono">Cloud-based</p>
                </button>

                <button
                    onClick={() => setProvider('local')}
                    className={`p-4 rounded-lg border text-left transition-all ${provider === 'local'
                            ? 'border-accent bg-accent/10'
                            : 'border-border bg-bg-surface hover:border-text-tertiary'
                        }`}
                >
                    <Cpu size={20} className={provider === 'local' ? 'text-accent' : 'text-text-tertiary'} />
                    <h3 className="text-sm font-medium text-text-primary mt-3">Local (Ollama)</h3>
                    <p className="text-xs text-text-tertiary mt-1 font-mono">Private & offline</p>
                </button>
            </div>

            {/* Config */}
            <div className="bg-bg-primary rounded-lg p-4 border border-border mb-6">
                {provider === 'gemini' ? (
                    <div className="space-y-2">
                        <label className="block text-xs text-text-secondary font-mono">API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API key..."
                            className="w-full px-3 py-2 bg-bg-surface border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary font-mono focus:outline-none focus:border-accent"
                        />
                    </div>
                ) : (
                    <div className="space-y-2">
                        <label className="block text-xs text-text-secondary font-mono">Endpoint</label>
                        <input
                            type="text"
                            value={endpoint}
                            onChange={(e) => setEndpoint(e.target.value)}
                            placeholder="http://localhost:11434"
                            className="w-full px-3 py-2 bg-bg-surface border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary font-mono focus:outline-none focus:border-accent"
                        />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-auto">
                <button onClick={onBack} className="px-4 py-2 text-sm text-text-tertiary hover:text-text-primary transition-colors flex items-center gap-1">
                    <ArrowLeft size={14} /> Back
                </button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-accent text-black rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90">
                    Continue <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
}
