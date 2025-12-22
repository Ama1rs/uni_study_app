import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Resource } from '../../types/node-system';
import {
    Save,
    ArrowLeft,
    Plus,
    Layers,
    Presentation,
    Layout,
    Play,
    Settings
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PresentationEditorProps {
    resource: Resource;
    onClose: () => void;
    onSave?: () => void;
}

interface Slide {
    id: string;
    title: string;
    content: string;
}

export function PresentationEditor({ resource, onClose, onSave }: PresentationEditorProps) {
    const [slides, setSlides] = useState<Slide[]>(() => {
        try {
            return JSON.parse(resource.content || '[]');
        } catch {
            return [{ id: '1', title: 'Welcome', content: 'Start your presentation here...' }];
        }
    });
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [title, setTitle] = useState(resource.title);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        const originalContent = resource.content || '[]';
        setHasChanges(JSON.stringify(slides) !== originalContent || title !== resource.title);
    }, [slides, title, resource]);

    async function handleSave() {
        setIsSaving(true);
        try {
            await invoke('update_resource', {
                id: resource.id,
                title,
                content: JSON.stringify(slides)
            });
            if (onSave) onSave();
            onClose();
        } catch (e) {
            console.error("Save failed:", e);
        } finally {
            setIsSaving(false);
        }
    }

    const addSlide = () => {
        const newSlide: Slide = {
            id: Date.now().toString(),
            title: 'New Slide',
            content: ''
        };
        setSlides([...slides, newSlide]);
        setActiveSlideIndex(slides.length);
    };

    const updateSlide = (index: number, updates: Partial<Slide>) => {
        const newSlides = [...slides];
        newSlides[index] = { ...newSlides[index], ...updates };
        setSlides(newSlides);
    };

    const activeSlide = slides[activeSlideIndex] || slides[0];

    return (
        <div className="flex flex-col h-full w-full bg-bg-base">
            {/* Toolbar */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border bg-bg-surface/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-text-tertiary">
                        <ArrowLeft size={20} />
                    </button>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="bg-transparent border-none outline-none text-lg font-bold text-text-primary"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-surface border border-border text-text-primary hover:bg-white/5 transition-all">
                        <Play size={16} />
                        <span>Present</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white font-bold disabled:opacity-50 shadow-lg shadow-accent/20"
                    >
                        <Save size={16} />
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Slides list */}
                <div className="w-64 border-r border-border bg-bg-surface/20 flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-text-tertiary">
                        <span>Slides</span>
                        <button onClick={addSlide} className="p-1 hover:bg-white/5 rounded"><Plus size={14} /></button>
                    </div>

                    <div className="space-y-3">
                        {slides.map((slide, idx) => (
                            <motion.button
                                key={slide.id}
                                onClick={() => setActiveSlideIndex(idx)}
                                className={`w-full aspect-video rounded-lg border text-left p-3 flex flex-col justify-between transition-all ${activeSlideIndex === idx
                                    ? "bg-accent/10 border-accent"
                                    : "bg-bg-surface border-border hover:border-text-tertiary"
                                    }`}
                            >
                                <span className={`text-[10px] font-bold ${activeSlideIndex === idx ? "text-accent" : "text-text-tertiary"}`}>
                                    {idx + 1}
                                </span>
                                <span className="text-xs font-medium text-text-primary truncate">{slide.title || 'Untitled'}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col p-10 items-center overflow-y-auto bg-bg-primary">
                    <div className="w-full max-w-4xl aspect-[16/9] bg-bg-surface rounded-2xl shadow-2xl border border-white/5 p-12 flex flex-col gap-8 relative group">
                        <input
                            value={activeSlide?.title || ''}
                            onChange={e => updateSlide(activeSlideIndex, { title: e.target.value })}
                            placeholder="Slide Title"
                            className="text-4xl font-bold bg-transparent border-none outline-none text-text-primary placeholder:opacity-30"
                        />
                        <textarea
                            value={activeSlide?.content || ''}
                            onChange={e => updateSlide(activeSlideIndex, { content: e.target.value })}
                            placeholder="Enter content..."
                            className="flex-1 bg-transparent border-none outline-none text-xl text-text-secondary resize-none placeholder:opacity-20 leading-relaxed"
                        />

                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 hover:bg-white/5 rounded-lg text-text-tertiary"><Layers size={16} /></button>
                            <button className="p-2 hover:bg-white/5 rounded-lg text-text-tertiary"><Layout size={16} /></button>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-4 text-text-tertiary">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-surface border border-border text-xs">
                            <Settings size={12} />
                            <span>16:9 Aspect Ratio</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-surface border border-border text-xs">
                            <Presentation size={12} />
                            <span>Modern Theme</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
