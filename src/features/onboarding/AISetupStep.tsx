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
        <div className="flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-bold text-text-primary mb-1">AI Provider</h2>
                <p className="text-sm text-text-secondary">Choose how to power AI features.</p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                    onClick={() => setProvider('gemini')}
                    className={`p-4 rounded-lg border text-left transition-all ${provider === 'gemini'
                            ? 'border-accent bg-accent/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                >
                    <Bot size={20} className={provider === 'gemini' ? 'text-accent' : 'text-text-secondary'} />
                    <h3 className="text-sm font-medium text-text-primary mt-2">Gemini API</h3>
                    <p className="text-xs text-text-secondary mt-0.5">Cloud-based</p>
                </button>

                <button
                    onClick={() => setProvider('local')}
                    className={`p-4 rounded-lg border text-left transition-all ${provider === 'local'
                            ? 'border-accent bg-accent/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                >
                    <Cpu size={20} className={provider === 'local' ? 'text-accent' : 'text-text-secondary'} />
                    <h3 className="text-sm font-medium text-text-primary mt-2">Local (Ollama)</h3>
                    <p className="text-xs text-text-secondary mt-0.5">Private & offline</p>
                </button>
            </div>

            {/* Config */}
            <div className="bg-black/20 rounded-lg p-4 border border-white/10 mb-6">
                {provider === 'gemini' ? (
                    <div>
                        <label className="block text-xs text-text-secondary mb-1.5">API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API key..."
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
                        />
                    </div>
                ) : (
                    <div>
                        <label className="block text-xs text-text-secondary mb-1.5">Endpoint</label>
                        <input
                            type="text"
                            value={endpoint}
                            onChange={(e) => setEndpoint(e.target.value)}
                            placeholder="http://localhost:11434"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
                        />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-auto pt-4">
                <button onClick={onBack} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1">
                    <ArrowLeft size={14} /> Back
                </button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-accent text-black rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90">
                    Continue <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
}
