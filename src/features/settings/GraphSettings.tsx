import { Share2, Circle, Settings2, Type } from 'lucide-react';
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
                                    className={`group flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${activeComponent === comp.id
                                        ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm'
                                        : 'border-[var(--border)] hover:border-[var(--border-light)]'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg transition-colors ${activeComponent === comp.id ? 'bg-[var(--accent)] text-white' : 'bg-white/5 text-[var(--text-secondary)]'}`}>
                                        <comp.icon size={16} />
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
                                    <h3 className="text-[10px] font-bold tracking-widest uppercase opacity-40 ml-1" style={{ color: 'var(--text-primary)' }}>NODE BASE SIZE</h3>
                                    <span className="text-xs font-mono text-[var(--accent)]">{settings.graph_node_size.toFixed(1)}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="0.1"
                                    value={settings.graph_node_size}
                                    onChange={(e) => updateSettings({ graph_node_size: parseFloat(e.target.value) })}
                                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                                    style={{ backgroundColor: 'var(--bg-hover)' }}
                                />
                            </div>
                        )}

                        {activeComponent === 'links' && (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[10px] font-bold tracking-widest uppercase opacity-40 ml-1" style={{ color: 'var(--text-primary)' }}>LINK WIDTH</h3>
                                    <span className="text-xs font-mono text-[var(--accent)]">{settings.graph_link_width.toFixed(1)}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="5"
                                    step="0.1"
                                    value={settings.graph_link_width}
                                    onChange={(e) => updateSettings({ graph_link_width: parseFloat(e.target.value) })}
                                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                                    style={{ backgroundColor: 'var(--bg-hover)' }}
                                />
                            </div>
                        )}

                        {activeComponent === 'labels' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                                            <Settings2 size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Show Labels</div>
                                            <div className="text-[10px] opacity-40 uppercase tracking-wider">Always visible</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateSettings({ graph_show_labels: !settings.graph_show_labels })}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${settings.graph_show_labels ? 'bg-[var(--accent)]' : 'bg-[var(--bg-hover)]'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${settings.graph_show_labels ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                                            <Settings2 size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Show Legend</div>
                                            <div className="text-[10px] opacity-40 uppercase tracking-wider">Concept types list</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateSettings({ graph_show_legend: !settings.graph_show_legend })}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${settings.graph_show_legend ? 'bg-[var(--accent)]' : 'bg-[var(--bg-hover)]'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${settings.graph_show_legend ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                                            <Settings2 size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Show Topology</div>
                                            <div className="text-[10px] opacity-40 uppercase tracking-wider">Neural diagnostics</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateSettings({ graph_show_topology: !settings.graph_show_topology })}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${settings.graph_show_topology ? 'bg-[var(--accent)]' : 'bg-[var(--bg-hover)]'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${settings.graph_show_topology ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-[10px] font-bold tracking-widest uppercase opacity-40 ml-1" style={{ color: 'var(--text-primary)' }}>LABEL FONT SIZE</h3>
                                        <span className="text-xs font-mono text-[var(--accent)]">{settings.graph_label_size}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="6"
                                        max="24"
                                        step="1"
                                        value={settings.graph_label_size}
                                        onChange={(e) => updateSettings({ graph_label_size: parseInt(e.target.value) })}
                                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                                        style={{ backgroundColor: 'var(--bg-hover)' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Color Picker Section */}
                <div className="flex flex-col items-center bg-black/5 rounded-[2rem] p-6 border border-white/5 shadow-inner backdrop-blur-md justify-center min-h-[300px]" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                    {activeComponent !== 'labels' ? (
                        <>
                            <ColorPicker
                                color={getCurrentColor()}
                                onChange={handleColorChange}
                                size={180}
                            />
                            <div className="mt-8 text-center">
                                <p className="text-[10px] font-bold opacity-30 tracking-widest uppercase mb-2">HEX CODE</p>
                                <div className="px-4 py-2 rounded-xl border border-white/10 font-mono text-sm text-[var(--accent)]" style={{ backgroundColor: 'var(--bg-surface)' }}>
                                    {getCurrentColor()}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full space-y-6 text-center opacity-40">
                            <div className="p-6 rounded-full border-2 border-dashed" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
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


        </div>
    );
}
