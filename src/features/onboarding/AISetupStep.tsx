import { useState } from 'react';
import { Key, Cpu, ArrowRight, ArrowLeft, BookOpen, PenTool, Sparkles } from 'lucide-react';

interface AISetupStepProps {
    onNext: (data: { source: 'api' | 'local'; usageProfile: 'study' | 'writing' | 'general'; apiEndpoint?: string }) => void;
    onBack: () => void;
}

export function AISetupStep({ onNext, onBack }: AISetupStepProps) {
    const [source, setSource] = useState<'api' | 'local'>('api');
    const [usageProfile, setUsageProfile] = useState<'study' | 'writing' | 'general'>('study');
    const [apiEndpoint, setApiEndpoint] = useState('');

    const handleSubmit = () => onNext({ source, usageProfile, apiEndpoint: source === 'api' ? apiEndpoint : undefined });

    const USAGE_PROFILES = [
        {
            id: 'study' as const,
            icon: BookOpen,
            title: 'Study Assistant',
            description: 'Notes, summaries, flashcards'
        },
        {
            id: 'writing' as const,
            icon: PenTool,
            title: 'Writing Helper',
            description: 'Essays, research, documents'
        },
        {
            id: 'general' as const,
            icon: Sparkles,
            title: 'General AI',
            description: 'All-purpose assistance'
        }
    ];

    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-bold text-text-primary mb-1">AI Configuration</h2>
                <p className="text-sm text-text-secondary">Choose how to power AI features.</p>
            </div>

            {/* AI Source Selection */}
            <div className="mb-5">
                <label className="block text-xs text-text-secondary mb-2">AI Source</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setSource('api')}
                        className={`p-4 rounded-lg border text-left transition-all ${source === 'api'
                                ? 'border-accent bg-accent/10'
                                : 'border bg-surface hover:border hover:bg-hover'
                            }`}
                    >
                        <Key size={20} className={source === 'api' ? 'text-accent' : 'text-text-secondary'} />
                        <h3 className="text-sm font-medium text-text-primary mt-2">API Key</h3>
                        <p className="text-xs text-text-secondary mt-0.5">Cloud-based</p>
                    </button>

                    <button
                        onClick={() => setSource('local')}
                        className={`p-4 rounded-lg border text-left transition-all ${source === 'local'
                                ? 'border-accent bg-accent/10'
                                : 'border bg-surface hover:border hover:bg-hover'
                            }`}
                    >
                        <Cpu size={20} className={source === 'local' ? 'text-accent' : 'text-text-secondary'} />
                        <h3 className="text-sm font-medium text-text-primary mt-2">Local Model</h3>
                        <p className="text-xs text-text-secondary mt-0.5">Private & offline</p>
                    </button>
                </div>
            </div>

            {/* Usage Profile Selection */}
            <div className="mb-5">
                <label className="block text-xs text-text-secondary mb-2">Usage Profile</label>
                <div className="space-y-2">
                    {USAGE_PROFILES.map((profile) => (
                        <button
                            key={profile.id}
                            onClick={() => setUsageProfile(profile.id)}
                            className={`w-full p-3 rounded-lg border text-left transition-all ${usageProfile === profile.id
                                    ? 'border-accent bg-accent/10'
                                    : 'border bg-surface hover:border hover:bg-hover'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <profile.icon size={16} className={usageProfile === profile.id ? 'text-accent' : 'text-text-secondary'} />
                                <div>
                                    <h3 className="text-sm font-medium text-text-primary">{profile.title}</h3>
                                    <p className="text-xs text-text-secondary">{profile.description}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Configuration */}
            {source === 'api' && (
                <div className="bg-card rounded-lg p-4 border mb-6">
                    <div>
                        <label className="block text-xs text-text-secondary mb-1.5">API Endpoint</label>
                        <input
                            type="text"
                            value={apiEndpoint}
                            onChange={(e) => setApiEndpoint(e.target.value)}
                            placeholder="https://api.openai.com/v1 or your OpenAI-compatible endpoint"
                            className="w-full px-3 py-2 bg-surface border rounded-md text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
                        />
                        <p className="text-xs text-text-tertiary mt-1">For OpenAI, Anthropic, or other OpenAI-compatible APIs</p>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-auto pt-4">
                <button onClick={onBack} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1">
                    <ArrowLeft size={14} /> Back
                </button>
                <button 
                    onClick={handleSubmit} 
                    className="px-4 py-2 bg-accent text-white rounded-md text-sm font-medium flex items-center gap-1 hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={source === 'api' && !apiEndpoint}
                >
                    Continue <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
}