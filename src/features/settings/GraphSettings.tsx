import { Share2, Circle, Settings2, Type, Maximize2, Move } from 'lucide-react';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { ColorPicker } from '../../components/ui/ColorPicker';
import { useState } from 'react';

type GraphComponent = 'nodes' | 'links' | 'labels';

export function GraphSettings() {
    const { settings, updateSettings } = useAppSettings();
    const [activeComponent, setActiveComponent] = useState<GraphComponent>('nodes');

    const handleColorChange = (hex: string) => {
        if (activeComponent === 'nodes') updateSettings({ graph_node_color: hex });
        else if (activeComponent === 'links') updateSettings({ graph_link_color: hex });
    };

    const getCurrentColor = () => {
        if (activeComponent === 'nodes') return settings.graph_node_color;
        if (activeComponent === 'links') return settings.graph_link_color;
        return '#000000';
    };

    return (
        <div className="p-6 space-y-8 animate-fade-in-up">
            <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
                    Graph View Customization
                </h2>
                <p className="text-sm opacity-60" style={{ color: 'var(--text-primary)' }}>
                    Fine-tune the visual representation of your knowledge network
                </p>
            </div>

            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* Component Selector */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold tracking-widest uppercase opacity-40 ml-1">SELECT ELEMENT</h3>
                        <div className="flex flex-col gap-2">
                            {[
                                { id: 'nodes', label: 'Nodes', icon: Circle, desc: 'Central knowledge points' },
                                { id: 'links', label: 'Connections', icon: Share2, desc: 'Relationships between nodes' },
                                { id: 'labels', label: 'Labels', icon: Type, desc: 'Node names and titles' },
                            ].map((comp) => (
                                <button
                                    key={comp.id}
                                    onClick={() => setActiveComponent(comp.id as GraphComponent)}
                                    className={`group flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${activeComponent === comp.id
                                        ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-[0_0_20px_rgba(0,0,0,0.1)]'
                                        : 'border-[var(--border)] hover:border-[var(--border-light)]'
                                        }`}
                                >
                                    <div className={`p-2.5 rounded-xl transition-colors ${activeComponent === comp.id ? 'bg-[var(--accent)] text-white' : 'bg-white/5 text-[var(--text-secondary)]'}`}>
                                        <comp.icon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{comp.label}</div>
                                        <div className="text-[10px] opacity-40 uppercase tracking-wider">{comp.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Numeric Controls */}
                    <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                        {activeComponent === 'nodes' && (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[10px] font-bold tracking-widest uppercase opacity-40 ml-1 text-white">NODE BASE SIZE</h3>
                                    <span className="text-xs font-mono text-[var(--accent)]">{settings.graph_node_size.toFixed(1)}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="0.1"
                                    value={settings.graph_node_size}
                                    onChange={(e) => updateSettings({ graph_node_size: parseFloat(e.target.value) })}
                                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                                />
                            </div>
                        )}

                        {activeComponent === 'links' && (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[10px] font-bold tracking-widest uppercase opacity-40 ml-1 text-white">LINK WIDTH</h3>
                                    <span className="text-xs font-mono text-[var(--accent)]">{settings.graph_link_width.toFixed(1)}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="5"
                                    step="0.1"
                                    value={settings.graph_link_width}
                                    onChange={(e) => updateSettings({ graph_link_width: parseFloat(e.target.value) })}
                                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                                />
                            </div>
                        )}

                        {activeComponent === 'labels' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                                            <Settings2 size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">Show Labels</div>
                                            <div className="text-[10px] opacity-40 uppercase tracking-wider">Always visible</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateSettings({ graph_show_labels: !settings.graph_show_labels })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.graph_show_labels ? 'bg-[var(--accent)]' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.graph_show_labels ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                                            <Settings2 size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">Show Legend</div>
                                            <div className="text-[10px] opacity-40 uppercase tracking-wider">Concept types list</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateSettings({ graph_show_legend: !settings.graph_show_legend })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.graph_show_legend ? 'bg-[var(--accent)]' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.graph_show_legend ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                                            <Settings2 size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">Show Topology</div>
                                            <div className="text-[10px] opacity-40 uppercase tracking-wider">Neural diagnostics</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateSettings({ graph_show_topology: !settings.graph_show_topology })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.graph_show_topology ? 'bg-[var(--accent)]' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.graph_show_topology ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-[10px] font-bold tracking-widest uppercase opacity-40 ml-1 text-white">LABEL FONT SIZE</h3>
                                        <span className="text-xs font-mono text-[var(--accent)]">{settings.graph_label_size}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="6"
                                        max="24"
                                        step="1"
                                        value={settings.graph_label_size}
                                        onChange={(e) => updateSettings({ graph_label_size: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Color Picker Section */}
                <div className="flex flex-col items-center bg-black/10 rounded-[2rem] p-8 border border-white/5 shadow-2xl backdrop-blur-md">
                    {activeComponent !== 'labels' ? (
                        <>
                            <ColorPicker
                                color={getCurrentColor()}
                                onChange={handleColorChange}
                                size={220}
                            />
                            <div className="mt-8 text-center">
                                <p className="text-[10px] font-bold opacity-30 tracking-widest uppercase mb-2">HEX CODE</p>
                                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 font-mono text-sm text-[var(--accent)]">
                                    {getCurrentColor()}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full space-y-6 text-center opacity-40">
                            <div className="p-6 rounded-full bg-white/5 border-2 border-dashed border-white/10">
                                <Type size={64} />
                            </div>
                            <div>
                                <h4 className="font-bold">Label Aesthetics</h4>
                                <p className="text-xs max-w-[200px] mt-2 leading-relaxed">
                                    Labels use the global typography system for maximum clarity.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Section */}
            <div className="pt-6 border-t border-[var(--border)]">
                <div className="flex items-center gap-2 mb-6">
                    <div className="h-[1px] flex-1 bg-[var(--border)]" />
                    <p className="text-[10px] font-bold opacity-30 tracking-widest uppercase">GRAPH PREVIEW</p>
                    <div className="h-[1px] flex-1 bg-[var(--border)]" />
                </div>

                <div className="h-[200px] rounded-[2rem] border-2 shadow-inner overflow-hidden relative"
                    style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border)',
                    }}>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {/* Mock Graph Items */}
                        <div className="relative">
                            {/* Connections */}
                            <svg className="absolute inset-0 w-[400px] h-[200px] overflow-visible" style={{ left: '-200px', top: '-100px' }}>
                                <line x1="200" y1="100" x2="100" y2="50" stroke={settings.graph_link_color} strokeWidth={settings.graph_link_width} />
                                <line x1="200" y1="100" x2="300" y2="60" stroke={settings.graph_link_color} strokeWidth={settings.graph_link_width} />
                                <line x1="200" y1="100" x2="220" y2="170" stroke={settings.graph_link_color} strokeWidth={settings.graph_link_width} />
                            </svg>

                            {/* Center Node */}
                            <div
                                className="absolute rounded-full shadow-lg flex items-center justify-center"
                                style={{
                                    width: settings.graph_node_size * 10,
                                    height: settings.graph_node_size * 10,
                                    backgroundColor: settings.graph_node_color,
                                    left: -settings.graph_node_size * 5,
                                    top: -settings.graph_node_size * 5,
                                    boxShadow: `0 0 20px ${settings.graph_node_color}40`
                                }}
                            />

                            {/* Peripheral Nodes */}
                            <div className="absolute w-4 h-4 rounded-full opacity-60" style={{ backgroundColor: settings.graph_node_color, left: -108, top: -58 }} />
                            <div className="absolute w-6 h-6 rounded-full opacity-60" style={{ backgroundColor: settings.graph_node_color, left: 92, top: -48 }} />
                            <div className="absolute w-3 h-3 rounded-full opacity-60" style={{ backgroundColor: settings.graph_node_color, left: 18, top: 62 }} />

                            {/* Labels */}
                            {settings.graph_show_labels && (
                                <>
                                    <div className="absolute text-white font-bold whitespace-nowrap" style={{ fontSize: settings.graph_label_size, left: 20, top: -10 }}>Main Topic</div>
                                    <div className="absolute text-white/50" style={{ fontSize: settings.graph_label_size * 0.8, left: -140, top: -75 }}>Subtopic A</div>
                                    <div className="absolute text-white/50" style={{ fontSize: settings.graph_label_size * 0.8, left: 115, top: -65 }}>Subtopic B</div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute bottom-4 right-4 flex gap-2">
                        <div className="p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white/40"><Move size={14} /></div>
                        <div className="p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white/40"><Maximize2 size={14} /></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
