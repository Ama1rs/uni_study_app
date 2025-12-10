import { useState } from 'react';
import { X, Palette, Bot, Database, User } from 'lucide-react';
import { ThemeCustomizer } from './settings/ThemeCustomizer';
import { AISettings } from './settings/AISettings';
import { DataSettings } from './settings/DataSettings';
import { ProfileSettings } from './settings/ProfileSettings';
import { cn } from '../lib/utils';

type SettingsTab = 'appearance' | 'ai' | 'data' | 'profile';

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

    if (!isOpen) return null;

    const tabs = [
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'ai', label: 'AI & Intelligence', icon: Bot },
        { id: 'data', label: 'Data & Storage', icon: Database },
        { id: 'profile', label: 'Profile', icon: User },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-4xl h-[80vh] flex rounded-2xl shadow-2xl overflow-hidden"
                style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                }}
            >
                {/* Sidebar */}
                <div className="w-64 border-r flex flex-col" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                    <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h2>
                    </div>
                    <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as SettingsTab)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                    activeTab === tab.id
                                        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-end p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {activeTab === 'appearance' && <ThemeCustomizer />}
                        {activeTab === 'ai' && <AISettings />}
                        {activeTab === 'data' && <DataSettings />}
                        {activeTab === 'profile' && <ProfileSettings />}
                    </div>
                </div>
            </div>
        </div>
    );
}
