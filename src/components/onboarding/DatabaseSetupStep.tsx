import { useState } from 'react';
import { Database, Cloud, ArrowRight, ArrowLeft } from 'lucide-react';

interface DatabaseSetupStepProps {
    onNext: (data: { type: 'sqlite' | 'supabase'; url?: string; key?: string }) => void;
    onBack: () => void;
}

export function DatabaseSetupStep({ onNext, onBack }: DatabaseSetupStepProps) {
    const [type, setType] = useState<'sqlite' | 'supabase'>('sqlite');
    const [url, setUrl] = useState('');
    const [key, setKey] = useState('');

    const handleSubmit = () => onNext({ type, url, key });

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-text-primary mb-2">Data Storage</h2>
                <p className="text-sm text-text-secondary font-mono">Local or cloud sync.</p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                    onClick={() => setType('sqlite')}
                    className={`p-4 rounded-lg border text-left transition-all ${type === 'sqlite'
                            ? 'border-accent bg-accent/10'
                            : 'border-border bg-bg-surface hover:border-text-tertiary'
                        }`}
                >
                    <Database size={20} className={type === 'sqlite' ? 'text-accent' : 'text-text-tertiary'} />
                    <h3 className="text-sm font-medium text-text-primary mt-3">Local SQLite</h3>
                    <p className="text-xs text-text-tertiary mt-1 font-mono">Offline-first</p>
                </button>

                <button
                    onClick={() => setType('supabase')}
                    className={`p-4 rounded-lg border text-left transition-all ${type === 'supabase'
                            ? 'border-accent bg-accent/10'
                            : 'border-border bg-bg-surface hover:border-text-tertiary'
                        }`}
                >
                    <Cloud size={20} className={type === 'supabase' ? 'text-accent' : 'text-text-tertiary'} />
                    <h3 className="text-sm font-medium text-text-primary mt-3">Supabase</h3>
                    <p className="text-xs text-text-tertiary mt-1 font-mono">Cross-device sync</p>
                </button>
            </div>

            {/* Supabase Config */}
            {type === 'supabase' && (
                <div className="bg-bg-primary rounded-lg p-4 border border-border mb-6 space-y-3">
                    <div className="space-y-2">
                        <label className="block text-xs text-text-secondary font-mono">Project URL</label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://your-project.supabase.co"
                            className="w-full px-3 py-2 bg-bg-surface border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary font-mono focus:outline-none focus:border-accent"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-xs text-text-secondary font-mono">Anon Key</label>
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="your-anon-key"
                            className="w-full px-3 py-2 bg-bg-surface border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary font-mono focus:outline-none focus:border-accent"
                        />
                    </div>
                </div>
            )}

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
