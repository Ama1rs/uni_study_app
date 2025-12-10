import { useState } from 'react';
import { ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';


interface Section {
    id: string;
    title: string;
    content: string[];
    collapsed?: boolean;
}

export function EditorPane() {
    const [sections, setSections] = useState<Section[]>([
        {
            id: '1',
            title: 'Introduction',
            content: [
                'This project aims to develop a new machine learning model.',
                'Key objectives include improving accuracy by 10% and reducing latency.',
                'The model will be trained on the new dataset.'
            ]
        },
        {
            id: '2',
            title: 'Methodology',
            content: [
                'Data preprocessing will involve normalization and augmentation.',
                'We will use a transformer-based architecture.',
                'Training will be conducted on 4 GPUs.'
            ]
        }
    ]);

    const toggleSection = (id: string) => {
        setSections(sections.map(s =>
            s.id === id ? { ...s, collapsed: !s.collapsed } : s
        ));
    };

    return (
        <div className="flex-1 h-full flex flex-col glass-card rounded-xl mx-2 my-4 overflow-hidden">
            {/* Editor Header */}
            <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-bg-surface/50">
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                    <span>Home</span>
                    <ChevronRight size={14} />
                    <span>Projects</span>
                    <ChevronRight size={14} />
                    <span className="text-text-primary font-medium">Project Proposal</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">Saved</span>
                    <button className="p-1 hover:bg-white/5 rounded text-text-secondary">
                        <MoreHorizontal size={16} />
                    </button>
                </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto p-8 font-mono text-sm leading-relaxed">
                <h1 className="text-3xl font-bold text-text-primary mb-8">Project Proposal</h1>

                {sections.map(section => (
                    <div key={section.id} className="mb-6 group">
                        <div
                            className="flex items-center gap-2 mb-2 cursor-pointer select-none"
                            onClick={() => toggleSection(section.id)}
                        >
                            <button className="text-text-tertiary hover:text-accent transition-colors">
                                {section.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                            </button>
                            <h2 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors">
                                {section.title}
                            </h2>
                        </div>

                        {!section.collapsed && (
                            <div className="pl-6 border-l border-border/50 ml-2 space-y-2">
                                {section.content.map((line, i) => (
                                    <p key={i} className="text-text-secondary hover:text-text-primary transition-colors">
                                        {line}
                                    </p>
                                ))}
                                <div className="h-4" /> {/* Spacer */}
                            </div>
                        )}
                    </div>
                ))}

                {/* Code Block Example */}
                <div className="mt-4 pl-6 ml-2">
                    <div className="bg-bg-surface border border-border rounded-lg p-4 font-mono text-xs text-text-secondary">
                        <div className="flex justify-between mb-2 text-text-tertiary">
                            <span>python</span>
                            <button className="hover:text-text-primary">Copy</button>
                        </div>
                        <pre>
                            <span className="text-accent">def</span> <span className="text-yellow-500">train_model</span>(data):
                            <span className="text-gray-500"># Model training logic</span>
                            <span className="text-accent">return</span> model
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
