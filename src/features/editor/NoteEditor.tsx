import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Resource } from '../../types/node-system';
import ReactMarkdown from 'react-markdown';

import { Save, Trash2, ArrowLeft, Sparkles, SpellCheck, FileText, Bot, X, Zap, Eye, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlashcardPreviewModal } from '../resources/FlashcardPreviewModal';


interface NoteEditorProps {
    resource: Resource;
    repositoryId?: number;
    noteWidth?: number;
    onClose: () => void;
    onSave?: () => void;
    onDelete?: () => void;
}

export function NoteEditor({ resource, repositoryId: _repositoryId, noteWidth = 800, onClose, onSave, onDelete }: NoteEditorProps) {
    const [content, setContent] = useState(resource.content || '');
    const [title, setTitle] = useState(resource.title);
    const [isSaving, setIsSaving] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showFloatingAi, setShowFloatingAi] = useState(false);
    const [selection, setSelection] = useState<{ start: number, end: number } | null>(null);
    const [showFlashcardModal, setShowFlashcardModal] = useState(false);
    const [generatedCards, setGeneratedCards] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setContent(resource.content || '');
        setTitle(resource.title);
        setHasChanges(false);
    }, [resource]);

    useEffect(() => {
        const originalContent = resource.content || '';
        const originalTitle = resource.title;
        setHasChanges(content !== originalContent || title !== originalTitle);
    }, [content, title, resource]);

    async function handleSave() {
        if (!hasChanges) {
            return;
        }

        setIsSaving(true);
        try {
            // Update the resource with new content and title
            await invoke('update_resource', {
                id: resource.id,
                title: title !== resource.title ? title : undefined,
                content: content !== (resource.content || '') ? content : undefined,
                tags: undefined // Keep existing tags
            });

            if (onSave) onSave();
            setHasChanges(false);
        } catch (e: any) {
            console.error('Failed to save note:', e);
            alert(`Failed to save note: ${e.toString()}`);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            await invoke('delete_resource', { id: resource.id });
            if (onDelete) onDelete();
            onClose();
        } catch (e: any) {
            console.error('Failed to delete note:', e);
            alert(`Failed to delete note: ${e.toString()}`);
        }
    }


    async function handleAiAction(action: 'grammar' | 'simplify' | 'summarize') {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = selection?.start ?? textarea.selectionStart;
        const end = selection?.end ?? textarea.selectionEnd;
        const hasSelection = start !== end;
        const selectedText = hasSelection ? content.substring(start, end) : content;

        if (!selectedText.trim()) {
            alert("No text to process!");
            return;
        }

        setAiLoading(true);
        setShowFloatingAi(false);

        let systemPrompt = "You are a helpful writing assistant.";
        let userPrompt = "";

        switch (action) {
            case 'grammar':
                systemPrompt = "You are an expert editor. Fix all grammar, spelling, and punctuation errors in the user's text. Return ONLY the corrected text. Do not add any conversational filler.";
                userPrompt = `Correct the grammar in the following text:\n\n${selectedText}`;
                break;
            case 'simplify':
                systemPrompt = "You are an expert editor. Rewrite the user's text to be simpler, clearer, and easier to understand. Return ONLY the simplified text. Do not add conversational filler.";
                userPrompt = `Simplify the following text:\n\n${selectedText}`;
                break;
            case 'summarize':
                systemPrompt = "You are an expert summarizer. Create a concise summary of the user's text. Return ONLY the summary. Do not add conversational filler.";
                userPrompt = `Summarize the following text:\n\n${selectedText}`;
                break;
        }

        try {
            const result = await invoke<any>('chat_direct', {
                prompt: `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`,
                max_tokens: 2048,
                temperature: 0.3
            });

            const newText = result.content.trim();

            if (action === 'summarize' && !hasSelection) {
                const updatedContent = content + "\n\n## Summary\n" + newText;
                setContent(updatedContent);
            } else {
                if (hasSelection) {
                    const before = content.substring(0, start);
                    const after = content.substring(end);
                    setContent(before + newText + after);
                } else {
                    setContent(newText);
                }
            }
        } catch (e: any) {
            console.error("AI Action failed:", e);
            alert(`AI Action failed: ${e.toString()}`);
        } finally {
            setAiLoading(false);
        }
    }

    async function handleGenerateFlashcards() {
        const textarea = textareaRef.current;
        if (!textarea) return;

        let targetText = "";
        let headingPath = undefined;

        const start = selection?.start ?? textarea.selectionStart;
        const end = selection?.end ?? textarea.selectionEnd;
        const hasSelection = start !== end;

        if (hasSelection) {
            targetText = content.substring(start, end);
        } else {
            // "Smart" section detection
            // Search backwards for the nearest heading
            const textBefore = content.substring(0, start);

            let lastHeadingMatch = null;

            // Find the last heading before the cursor
            const linesBefore = textBefore.split('\n');
            let headingLineIndex = -1;

            for (let i = linesBefore.length - 1; i >= 0; i--) {
                const line = linesBefore[i];
                if (line.trim().startsWith('#')) {
                    headingLineIndex = i;
                    lastHeadingMatch = line;
                    headingPath = line.replace(/^[#\s]+/, '');
                    break;
                }
            }

            if (headingLineIndex !== -1 && lastHeadingMatch) {
                const headingStartPos = textBefore.lastIndexOf(lastHeadingMatch);

                if (headingStartPos !== -1) {
                    const contentFromHeading = content.substring(headingStartPos);
                    const matchNext = contentFromHeading.slice(1).search(/\n#{1,6}\s/);

                    if (matchNext !== -1) {
                        targetText = contentFromHeading.substring(0, matchNext + 1);
                    } else {
                        targetText = contentFromHeading;
                    }
                }
            } else {
                targetText = content;
            }
        }

        if (!targetText.trim() || targetText.length < 10) {
            alert("Not enough text references found. Please select content or ensure you are under a heading.");
            return;
        }

        setAiLoading(true);
        setShowFloatingAi(false);

        try {
            const result = await invoke<any>('generate_flashcards', { text: targetText });
            const resultStr = result.content;

            // Attempt to clean markdown json blocks if present
            let jsonStr = resultStr;
            if (jsonStr.includes("```json")) {
                jsonStr = jsonStr.split("```json")[1].split("```")[0];
            } else if (jsonStr.includes("```")) {
                jsonStr = jsonStr.split("```")[1].split("```")[0];
            }

            const cards = JSON.parse(jsonStr);
            if (Array.isArray(cards)) {
                setGeneratedCards(cards.map(c => ({
                    ...c,
                    heading_path: headingPath
                })));
                setShowFlashcardModal(true);
            } else {
                alert("AI returned invalid format. Try again.");
            }

        } catch (e: any) {
            console.error("Flashcard generation failed:", e);
            alert(`Generation failed: ${e.toString()}`);
        } finally {
            setAiLoading(false);
        }
    }

    const handleSelect = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if (start !== end) {
            setSelection({ start, end });
            setShowFloatingAi(true);
        } else {
            setShowFloatingAi(false);
            setSelection(null);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-bg-base relative">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-6 p-6 border-b border-border bg-bg-surface/50 backdrop-blur-md z-10">
                <button
                    onClick={onClose}
                    className="p-2.5 rounded-xl hover:bg-white/5 text-text-secondary hover:text-text-primary transition-all hover:scale-110 active:scale-95"
                    title="Back"
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="flex-1 min-w-0">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full text-2xl font-bold bg-transparent outline-none text-text-primary placeholder-text-tertiary transition-all focus:placeholder-transparent"
                        placeholder="Note Title"
                    />
                </div>

                <div className="flex items-center gap-4">
                    {hasChanges && (
                        <span className="text-xs font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded-full animate-pulse border border-accent/20">
                            Unsaved Changes
                        </span>
                    )}

                    {aiLoading && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-hover border border-border text-text-secondary">
                            <Sparkles size={18} className="animate-spin text-accent" />
                            <span className="text-sm font-medium text-text-primary">AI Thinking...</span>
                        </div>
                    )}

                    <div className="w-px h-8 bg-border mx-2" />

                <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewMode('edit')}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${viewMode === 'edit' ? 'bg-accent text-white' : 'border border-border text-text-secondary hover:text-text-primary'}`}
                            title="Edit Mode"
                        >
                            <Code size={16} /> Edit
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${viewMode === 'preview' ? 'bg-accent text-white' : 'border border-border text-text-secondary hover:text-text-primary'}`}
                            title="Preview Mode"
                        >
                            <Eye size={16} /> Preview
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={isSaving || (!hasChanges && !isSaving)}
                            className="px-5 py-2.5 rounded-xl bg-accent text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-accent/20 font-semibold disabled:cursor-not-allowed"
                        >
                            <Save size={18} />
                            {isSaving ? 'Saving...' : hasChanges ? 'Save' : 'Saved'}
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-2.5 rounded-xl text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-all hover:scale-110 active:scale-95"
                            title="Delete Note"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 min-h-0 relative group flex overflow-hidden flex-col">
                {/* Content Area */}
                <div className="flex-1 min-h-0 relative group flex overflow-hidden">
                {/* Edit Panel */}
                {(viewMode === 'edit' || viewMode === 'split') && (
                    <div className={`flex flex-col ${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-hidden border-r border-border`}>
                        <div className="flex-1 bg-bg-base overflow-y-auto overflow-x-hidden custom-scrollbar flex justify-center">
                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onSelect={handleSelect}
                                onKeyUp={handleSelect}
                                onMouseUp={handleSelect}
                                className="p-8 font-mono text-sm leading-relaxed bg-transparent text-text-primary outline-none resize-none border-0 focus:ring-0 placeholder-text-tertiary flex-shrink-0"
                                placeholder="Start typing your note here... (Markdown supported)"
                                style={{ 
                                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                                    width: `${noteWidth}px`,
                                    minHeight: '100%'
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Preview Panel */}
                {(viewMode === 'preview' || viewMode === 'split') && (
                    <div className={`flex-1 overflow-y-auto p-8 text-text-primary ${viewMode === 'split' ? 'w-1/2 border-l border-border' : 'w-full'} custom-scrollbar`}>
                        <div className="flex justify-center">
                            <div className="prose prose-invert max-w-none" style={{ width: `${noteWidth}px` }}>
                                <ReactMarkdown
                                    components={{
                                        h1: ({ children }) => <h1 className="text-3xl font-bold mb-6 mt-8 text-text-primary">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-2xl font-bold mb-4 mt-6 text-text-primary">{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-xl font-bold mb-3 mt-5 text-text-primary">{children}</h3>,
                                        h4: ({ children }) => <h4 className="text-lg font-bold mb-2 mt-4 text-text-primary">{children}</h4>,
                                        h5: ({ children }) => <h5 className="text-base font-bold mb-2 mt-3 text-text-primary">{children}</h5>,
                                        h6: ({ children }) => <h6 className="text-sm font-bold mb-2 mt-2 text-text-primary">{children}</h6>,
                                        p: ({ children }) => <p className="mb-4 leading-relaxed text-text-primary">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2 text-text-primary">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-text-primary">{children}</ol>,
                                        li: ({ children }) => <li className="ml-2 text-text-primary">{children}</li>,
                                        blockquote: ({ children }) => <blockquote className="border-l-4 border-accent/50 pl-4 italic my-4 text-text-secondary">{children}</blockquote>,
                                        code: ({ children, className }) => {
                                            const inline = !className?.includes('language-');
                                            return inline ? 
                                                <code className="bg-bg-hover px-1.5 py-0.5 rounded text-accent font-mono text-sm">{children}</code> :
                                                <code className={`block bg-bg-hover p-4 rounded-xl my-4 overflow-x-auto text-text-primary font-mono text-sm ${className || ''}`}>{children}</code>;
                                        },
                                        pre: ({ children }) => <pre className="bg-bg-hover p-4 rounded-xl my-4 overflow-x-auto">{children}</pre>,
                                        a: ({ children, href }) => <a href={href} className="text-accent hover:underline">{children}</a>,
                                        strong: ({ children }) => <strong className="font-bold text-text-primary">{children}</strong>,
                                        em: ({ children }) => <em className="italic text-text-primary">{children}</em>,
                                        table: ({ children }) => <table className="border-collapse w-full my-4 border border-border">{children}</table>,
                                        th: ({ children }) => <th className="border border-border bg-bg-hover px-4 py-2 text-text-primary font-semibold">{children}</th>,
                                        td: ({ children }) => <td className="border border-border px-4 py-2 text-text-primary">{children}</td>,
                                        hr: () => <hr className="my-6 border-border" />,
                                    }}
                                >
                                    {content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                )}
                </div>

                <AnimatePresence>
                    {showFloatingAi && (
                        <motion.div
                            className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-bg-surface backdrop-blur-md border border-border rounded-2xl shadow-2xl p-2 flex items-center gap-1 z-50"
                            initial={{ opacity: 0, y: 20, scale: 0.9, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                            exit={{ opacity: 0, y: 20, scale: 0.9, x: '-50%' }}
                        >
                            <div className="flex items-center gap-1 px-2 mr-2 border-r border-border">
                                <Sparkles size={16} className="text-accent" />
                                <span className="text-[10px] uppercase font-bold tracking-wider text-accent">AI Tools</span>
                            </div>

                            <button
                                onClick={() => handleAiAction('grammar')}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-bg-hover rounded-xl text-text-primary transition-colors group"
                                title="Correct Grammar"
                            >
                                <SpellCheck size={14} className="text-text-secondary group-hover:text-accent group-hover:scale-110 transition-all" />
                                <span>Correct</span>
                            </button>
                            <button
                                onClick={() => handleAiAction('simplify')}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-bg-hover rounded-xl text-text-primary transition-colors group"
                                title="Simplify Text"
                            >
                                <Bot size={14} className="text-text-secondary group-hover:text-accent group-hover:scale-110 transition-all" />
                                <span>Simplify</span>
                            </button>
                            <button
                                onClick={() => handleAiAction('summarize')}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-bg-hover rounded-xl text-text-primary transition-colors group"
                                title="Summarize Selection"
                            >
                                <FileText size={14} className="text-text-secondary group-hover:text-accent group-hover:scale-110 transition-all" />
                                <span>Summarize</span>
                            </button>

                            <div className="w-px h-4 bg-border mx-1" />

                            <button
                                onClick={handleGenerateFlashcards}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-bg-hover rounded-xl text-text-primary transition-colors group"
                                title="Generate Flashcards"
                            >
                                <Zap size={14} className="text-text-secondary group-hover:text-accent group-hover:scale-110 transition-all" />
                                <span>Flashcards</span>
                            </button>

                            <button
                                onClick={() => setShowFloatingAi(false)}
                                className="ml-1 p-1.5 hover:bg-white/10 rounded-lg text-text-tertiary hover:text-text-primary transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {/* Footer */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-border bg-bg-base text-xs text-text-tertiary">
                <div className="flex items-center gap-4">
                    <span>{content.split('\n').length} lines</span>
                    <span>{content.length} chars</span>
                    {resource.created_at && (
                        <span>Created {new Date(resource.created_at).toLocaleDateString()}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="opacity-50">Markdown supported</span>
                </div>
            </div>

            <AnimatePresence>
                {showFlashcardModal && (
                    <FlashcardPreviewModal
                        noteId={resource.id}
                        initialCards={generatedCards}
                        onClose={() => setShowFlashcardModal(false)}
                        onSave={() => {
                            // Maybe toast notification?
                            setShowFlashcardModal(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

