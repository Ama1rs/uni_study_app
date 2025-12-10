import { useState, useEffect } from 'react';
import { Search, FileText, Plus, BookOpen, Clock, Zap, Brain } from 'lucide-react';
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

export function HomeHub({ onOpenFile }: { onOpenFile: (path: string) => void }) {
    const [scratchpad, setScratchpad] = useState(() => localStorage.getItem('daily_scratchpad') || '');
    const [searchQuery, setSearchQuery] = useState('');
    const { profile } = useUserProfile();

    // Get first name for greeting
    const userName = profile.name.split(' ')[0];

    // Mock metrics
    const metrics = {
        streak: 12,
        focusHours: 4.5,
        tasksDone: 8
    };

    // Simple graph data
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

    // Mock recent files
    const recentFiles = [
        { id: 1, name: 'Project Proposal.md', path: '/docs/proposal.md', time: '2h ago' },
        { id: 2, name: 'Calculus Notes.md', path: '/math/calc.md', time: '5h ago' },
        { id: 3, name: 'History Essay.md', path: '/history/essay.md', time: '1d ago' },
    ];

    useEffect(() => {
        localStorage.setItem('daily_scratchpad', scratchpad);
    }, [scratchpad]);

    const getNodeById = (id: string) => nodes.find(n => n.id === id);

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
            <div className="relative z-10 w-full h-full p-8 flex flex-col pointer-events-none">

                {/* Top-Left: Pilot's Console */}
                <div className="pointer-events-auto w-96 mb-12">
                    <h1 className="text-3xl font-bold text-text-primary mb-1">
                        {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, {userName}.
                    </h1>
                    <p className="text-text-secondary text-sm mb-6">Ready to expand your knowledge?</p>

                    <div className="flex gap-3">
                        <MetricCard icon={Zap} label="Streak" value={`${metrics.streak}d`} />
                        <MetricCard icon={Clock} label="Focus" value={`${metrics.focusHours}h`} />
                        <MetricCard icon={Brain} label="Tasks" value={`${metrics.tasksDone}`} />
                    </div>
                </div>

                {/* Center: Omni-Search */}
                <div className="pointer-events-auto max-w-xl w-full mx-auto mb-12">
                    <div className="flex items-center bg-bg-surface/80 backdrop-blur-md border border-border rounded-lg px-4 py-2">
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
                </div>

                {/* Bottom Section: Split View */}
                <div className="flex-1 flex gap-6 min-h-0">

                    {/* Bottom-Left: Project Dock */}
                    <div className="pointer-events-auto w-80 flex flex-col gap-4">
                        <div className="glass-card p-4 rounded-lg flex-1 flex flex-col min-h-0">
                            <h3 className="text-xs font-medium text-text-tertiary mb-3 uppercase tracking-wider font-mono">Recent</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                {recentFiles.map(file => (
                                    <button
                                        key={file.id}
                                        onClick={() => onOpenFile(file.path)}
                                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-bg-hover transition-colors group text-left"
                                    >
                                        <FileText size={14} className="text-text-tertiary group-hover:text-accent" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-text-secondary group-hover:text-text-primary truncate font-mono">{file.name}</p>
                                        </div>
                                        <span className="text-xs text-text-tertiary">{file.time}</span>
                                    </button>
                                ))}
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

function MetricCard({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="glass-card px-3 py-2 rounded-lg flex items-center gap-2">
            <Icon size={14} className="text-accent" />
            <div>
                <p className="text-xs text-text-tertiary font-mono">{label}</p>
                <p className="text-sm font-medium text-text-primary">{value}</p>
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
