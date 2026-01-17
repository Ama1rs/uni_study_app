import { useState } from 'react';
import { X, Palette, Bot, Database, User, Share2 } from 'lucide-react';
import { ThemeCustomizer } from './ThemeCustomizer';
import { GraphSettings } from './GraphSettings';
import { AISettings } from '../ai/AISettings';
import { DataSettings } from './DataSettings';
import { ProfileSettings } from './ProfileSettings';
import { cn } from '../../lib/utils';

type SettingsTab = 'appearance' | 'graph' | 'ai' | 'data' | 'profile';

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

    if (!isOpen) return null;

    const tabs = [
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'graph', label: 'Graph View', icon: Share2 },
        { id: 'ai', label: 'AI & Intelligence', icon: Bot },
        { id: 'data', label: 'Data & Storage', icon: Database },
        { id: 'profile', label: 'Profile', icon: User },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-5xl h-[550px] flex rounded-2xl shadow-2xl overflow-hidden"
                style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                }}
            >
                {/* Sidebar */}
                <div className="w-52 border-r flex flex-col" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                    <div className="h-[56px] px-5 border-b flex items-center shrink-0" style={{ borderColor: 'var(--border)' }}>
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h2>
                    </div>
                    <div className="flex-1 p-3 space-y-1 overflow-y-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as SettingsTab)}
                                className={cn(
                                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    activeTab === tab.id
                                        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="h-[56px] flex items-center justify-end px-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {activeTab === 'appearance' && <ThemeCustomizer />}
                        {activeTab === 'graph' && <GraphSettings />}
                        {activeTab === 'ai' && <AISettings />}
                        {activeTab === 'data' && <DataSettings />}
                        {activeTab === 'profile' && <ProfileSettings />}
                    </div>
                </div>
            </div>
        </div>
    );
}
