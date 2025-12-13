import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, FileText, Plus, BookOpen } from 'lucide-react';
import { useUserProfile } from '../contexts/UserProfileContext';

interface GraphNode {
    id: string;
    name: string;
    x: number;
    y: number;
}

interface GraphLink {
    source: string;
    target: string;
}

interface Resource {
    id: number;
    repository_id?: number;
    title: string;
    type: string;
    path?: string;
    created_at?: string;
}

export function HomeHub({ onOpenFile }: { onOpenFile: (path: string) => void }) {
    const [scratchpad, setScratchpad] = useState(() => localStorage.getItem('daily_scratchpad') || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [resources, setResources] = useState<Resource[]>([]);
    const [searchResults, setSearchResults] = useState<Resource[]>([]);
    const { profile } = useUserProfile();

    // Get first name for greeting
    const userName = profile?.name?.split(' ')[0] || 'User';

    // Simple graph data (Decoration)
    const nodes: GraphNode[] = [
        { id: '1', name: 'Calculus', x: 20, y: 30 },
        { id: '2', name: 'Derivatives', x: 35, y: 20 },
        { id: '3', name: 'Integrals', x: 35, y: 45 },
        { id: '4', name: 'Physics', x: 65, y: 25 },
        { id: '5', name: 'Kinematics', x: 80, y: 35 },
        { id: '6', name: 'History', x: 55, y: 60 },
        { id: '7', name: 'WWII', x: 70, y: 70 },
    ];

    const links: GraphLink[] = [
        { source: '1', target: '2' },
        { source: '1', target: '3' },
        { source: '4', target: '5' },
        { source: '2', target: '5' },
        { source: '6', target: '7' },
    ];

    useEffect(() => {
        localStorage.setItem('daily_scratchpad', scratchpad);
    }, [scratchpad]);

    useEffect(() => {
        loadResources();
    }, []);

    useEffect(() => {
        if (searchQuery.trim()) {
            const lower = searchQuery.toLowerCase();
            const results = resources.filter(r =>
                r.title.toLowerCase().includes(lower) ||
                r.type.toLowerCase().includes(lower)
            ).slice(0, 5);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, resources]);

    async function loadResources() {
        try {
            const res = await invoke<Resource[]>('get_resources', { repositoryId: null });
            setResources(res);
        } catch (e) {
            console.error("Failed to load resources:", e);
        }
    }

    const recentFiles = resources.slice(0, 5); // Already sorted by DB desc

    const getNodeById = (id: string) => nodes.find(n => n.id === id);

    async function handleFileClick(res: Resource) {
        if (res.path) {
            onOpenFile(res.path);
        } else {
            // It might be a note without a file path? 
            // Currently onOpenFile expects a path. 
            // If it's a pure DB note, we might need a way to open it.
            // For now, let's assume we pass the virtual ID or handle it if onOpenFile supports it.
            // But looking at App.tsx, onOpenFile just sets activeFile string.
            // If we want to open a note, we might need to handle it differently.
            // However, existing recent files had paths. 
            // Let's pass the ID if path is missing? No, EditorPane needs content.
            // For now, only open items with paths.
            if (res.path) onOpenFile(res.path);
        }
    }

    return (
        <div className="relative w-full h-full overflow-hidden bg-bg-primary">
            {/* 1. Simple Graph Background */}
            <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
                {/* Links */}
                {links.map((link, i) => {
                    const source = getNodeById(link.source);
                    const target = getNodeById(link.target);
                    if (!source || !target) return null;
                    return (
                        <line
                            key={i}
                            x1={`${source.x}%`}
                            y1={`${source.y}%`}
                            x2={`${target.x}%`}
                            y2={`${target.y}%`}
                            stroke="var(--border)"
                            strokeWidth="1"
                        />
                    );
                })}
                {/* Nodes */}
                {nodes.map((node) => (
                    <g key={node.id}>
                        <circle
                            cx={`${node.x}%`}
                            cy={`${node.y}%`}
                            r="4"
                            fill="var(--accent)"
                            opacity="0.6"
                        />
                        <text
                            x={`${node.x}%`}
                            y={`${node.y + 4}%`}
                            fill="var(--text-tertiary)"
                            fontSize="10"
                            textAnchor="middle"
                            fontFamily="var(--font-mono)"
                        >
                            {node.name}
                        </text>
                    </g>
                ))}
            </svg>

            {/* 2. The HUD (Foreground) */}
            <div className="relative z-10 w-full h-full p-8 flex flex-col">

                {/* Top-Left: Pilot's Console */}
                <div className="pointer-events-auto w-full max-w-2xl mb-12">
                    <h1 className="text-3xl font-bold text-text-primary mb-1">
                        {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, {userName}.
                    </h1>
                    <p className="text-text-secondary text-sm mb-6">Ready to expand your knowledge?</p>
                </div>

                {/* Center: Omni-Search */}
                <div className="pointer-events-auto max-w-xl w-full mx-auto mb-4 relative z-50">
                    <div className="flex items-center bg-bg-surface/80 backdrop-blur-md border border-border rounded-lg px-4 py-2 shadow-lg">
                        <Search className="text-text-tertiary mr-3" size={16} />
                        <input
                            type="text"
                            placeholder="Search files, commands, or topics..."
                            className="bg-transparent border-none outline-none text-sm text-text-primary w-full placeholder-text-tertiary font-mono"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <span className="text-xs text-text-tertiary font-mono border border-border px-1.5 py-0.5 rounded">⌘K</span>
                    </div>

                    {/* Search Results Dropdown */}
                    {searchQuery.trim() && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
                            {searchResults.length > 0 ? (
                                searchResults.map(res => (
                                    <button
                                        key={res.id}
                                        onClick={() => handleFileClick(res)}
                                        className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
                                    >
                                        <FileText size={14} className="text-text-secondary" />
                                        <div>
                                            <p className="text-sm text-text-primary font-medium">{res.title}</p>
                                            <p className="text-xs text-text-tertiary uppercase">{res.type}</p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-3 text-sm text-text-tertiary text-center">No results found</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Section: Split View */}
                <div className="flex-1 flex gap-6 min-h-0">

                    {/* Bottom-Left: Recent Dock */}
                    <div className="pointer-events-auto w-80 flex flex-col gap-4">
                        <div className="glass-card p-4 rounded-lg flex-1 flex flex-col min-h-0">
                            <h3 className="text-xs font-medium text-text-tertiary mb-3 uppercase tracking-wider font-mono">Recent</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                {recentFiles.length === 0 ? (
                                    <p className="text-xs text-text-tertiary text-center mt-4">No recent files</p>
                                ) : (
                                    recentFiles.map(file => (
                                        <button
                                            key={file.id}
                                            onClick={() => handleFileClick(file)}
                                            className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-bg-hover transition-colors group text-left"
                                        >
                                            <FileText size={14} className="text-text-tertiary group-hover:text-accent" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-text-secondary group-hover:text-text-primary truncate font-mono">{file.title}</p>
                                            </div>
                                            {/* <span className="text-xs text-text-tertiary">{file.created_at}</span> */}
                                        </button>
                                    ))
                                )}
                            </div>

                            <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2">
                                <ActionButton icon={Plus} label="New Note" />
                                <ActionButton icon={BookOpen} label="New Repo" />
                            </div>
                        </div>
                    </div>

                    {/* Right-Side: Daily Scratchpad */}
                    <div className="pointer-events-auto flex-1">
                        <div className="glass-card p-4 rounded-lg h-full flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider font-mono">Scratchpad</h3>
                                <span className="text-xs text-text-tertiary font-mono">auto-saved</span>
                            </div>
                            <textarea
                                className="flex-1 bg-transparent border-none outline-none resize-none font-mono text-sm text-text-secondary placeholder-text-tertiary leading-relaxed"
                                placeholder="Quick thoughts, ideas, todo's..."
                                value={scratchpad}
                                onChange={(e) => setScratchpad(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActionButton({ icon: Icon, label }: { icon: any, label: string }) {
    return (
        <button className="flex items-center justify-center gap-2 p-2 rounded-md border border-border hover:bg-bg-hover transition-colors text-xs text-text-secondary hover:text-text-primary font-mono">
            <Icon size={12} />
            {label}
        </button>
    );
}

