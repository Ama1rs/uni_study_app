import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Resource } from '../../types/node-system';
import ReactMarkdown from 'react-markdown';

import { Save, Trash2, ArrowLeft, Sparkles, SpellCheck, FileText, Bot, Zap, Eye, Code, GitMerge } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlashcardPreviewModal } from '../resources/FlashcardPreviewModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { MermaidDiagram } from '../../components/ui/MermaidDiagram';


interface NoteEditorProps {
    resource: Resource;
    repositoryId?: number;
    noteWidth?: number;
    onClose: () => void;
    onSave?: () => void;
    onDelete?: () => void;
}

export function NoteEditor({ resource, repositoryId: _repositoryId, noteWidth = 700, onClose, onSave, onDelete }: NoteEditorProps) {
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
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [menuView, setMenuView] = useState<'main' | 'ai'>('main');
    const [showControls, setShowControls] = useState(true);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        action: () => void;
    }>({ isOpen: false, title: '', description: '', action: () => { } });

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

    // Auto-hide controls after 3 seconds of inactivity
    useEffect(() => {
        const resetTimeout = () => {
            setShowControls(true);
            if (hideControlsTimeout.current) {
                clearTimeout(hideControlsTimeout.current);
            }
            hideControlsTimeout.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        };

        resetTimeout();
        window.addEventListener('mousemove', resetTimeout);
        window.addEventListener('keydown', resetTimeout);

        return () => {
            window.removeEventListener('mousemove', resetTimeout);
            window.removeEventListener('keydown', resetTimeout);
            if (hideControlsTimeout.current) {
                clearTimeout(hideControlsTimeout.current);
            }
        };
    }, []);

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
            alert(`Failed to save note: ${e.toString()} `);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete() {
        setConfirmState({
            isOpen: true,
            title: 'Delete Note',
            description: 'Are you sure you want to delete this note? This action cannot be undone.',
            action: async () => {
                try {
                    await invoke('delete_resource', { id: resource.id });
                    if (onDelete) onDelete();
                    onClose();
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                } catch (e: any) {
                    console.error('Failed to delete note:', e);
                    alert(`Failed to delete note: ${e.toString()} `); // Could replace with toast if available
                }
            }
        });
    }


    async function handleAiAction(action: 'grammar' | 'simplify' | 'summarize' | 'flowchart') {
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
                userPrompt = `Correct the grammar in the following text: \n\n${selectedText} `;
                break;
            case 'simplify':
                systemPrompt = "You are an expert editor. Rewrite the user's text to be simpler, clearer, and easier to understand. Return ONLY the simplified text. Do not add conversational filler.";
                userPrompt = `Simplify the following text: \n\n${selectedText} `;
                break;
            case 'summarize':
                systemPrompt = "You are an expert summarizer. Create a concise summary of the user's text. Return ONLY the summary. Do not add conversational filler.";
                userPrompt = `Summarize the following text: \n\n${selectedText} `;
                break;
            case 'flowchart':
                systemPrompt = `You are a strict Mermaid.js code generator.

CRITICAL SYNTAX RULES (Violations = Parse Error):
1. **ONE Connection Per Line**:
   - ❌ WRONG: \`A --> B & C\` or \`A --> B | C\`
   - ✅ RIGHT:
     \`A --> B\`
     \`A --> C\`

2. **Edge Labels**: Pipes \`|Label|\` ONLY.
   - ❌ WRONG: \`A --> [Yes] --> B\`
   - ✅ RIGHT: \`A -->|Yes| B\`

3. **Arrows**: Use ONLY \`-->\`.
   - ❌ WRONG: \`-->>\`, \`-.->\`, \`==>\`, \`|---| ml-auto\`
   - ✅ RIGHT: \`-->\`

4. **Node IDs**: Simple alphanumeric. NO SPACES.
   - ❌ WRONG: \`[Create Note]\` as an ID.
   - ✅ RIGHT: \`create_note[Create Note]\`

5. **No Styling**: Do not add styles, classes, or formatting.

OUTPUT FORMAT:
Return ONLY the mermaid code block. Starts with \`\`\`mermaid.`;
                userPrompt = `Generate a safe, simple mermaid flowchart for: \n\n${selectedText} `;
                break;
        }

        try {
            const result = await invoke<any>('chat_direct', {
                prompt: `<| im_start |> system\n${systemPrompt}<| im_end |>\n <| im_start |> user\n${userPrompt}<| im_end |>\n <| im_start |> assistant\n`,
                max_tokens: 2048,
                temperature: 0.3
            });

            const newText = result.content.trim();

            if (action === 'summarize' && !hasSelection) {
                const updatedContent = content + "\n\n## Summary\n" + newText;
                setContent(updatedContent);
            } else if (action === 'flowchart') {
                if (newText.includes('INVALID_INPUT')) {
                    alert("The selected text doesn't contain enough information to generate a flowchart.");
                } else {
                    // Extract compatible mermaid code
                    let mermaidCode = newText;
                    if (mermaidCode.includes('```mermaid')) {
                        mermaidCode = mermaidCode.split('```mermaid')[1];
                        if (mermaidCode.includes('```')) {
                            mermaidCode = mermaidCode.split('```')[0];
                        }
                    } else if (mermaidCode.includes('```')) {
                        mermaidCode = mermaidCode.split('```')[1];
                        if (mermaidCode.includes('```')) {
                            mermaidCode = mermaidCode.split('```')[0];
                        }
                    }

                    // Clean up common LLM artifacts and artifacts
                    mermaidCode = mermaidCode
                        .replace(/<\|.*?\|>/g, '')  // Remove <| im_end |> etc
                        .replace(/<\/?think>/g, '') // Remove <think> tags
                        .replace(/\|\|/g, '|')      // Fix double pipes in labels
                        .trim();

                    const flowChartBlock = `\n\`\`\`mermaid\n${mermaidCode}\n\`\`\`\n`;

                    if (hasSelection) {
                        const before = content.substring(0, start);
                        const after = content.substring(end);
                        // We append the flowchart AFTER the selection, preserving the original text context usually
                        setContent(before + selectedText + flowChartBlock + after);
                    } else {
                        setContent(content + flowChartBlock);
                    }
                }
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
            alert(`AI Action failed: ${e.toString()} `);
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
        } else {
            setShowFloatingAi(false);
            setSelection(null);
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if (start !== end) {
            e.preventDefault();
            setMenuPosition({ x: e.clientX, y: e.clientY });
            setMenuView('main');
            setShowFloatingAi(true);
        }
    };

    const handleStandardAction = (action: 'copy' | 'cut' | 'paste' | 'selectAll') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.focus();

        try {
            switch (action) {
                case 'copy':
                    document.execCommand('copy');
                    break;
                case 'cut':
                    document.execCommand('cut');
                    break;
                case 'paste':
                    // Paste is restricted in many browsers via execCommand
                    // Using navigator.clipboard as fallback/primary if possible
                    navigator.clipboard.readText().then(text => {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const newContent = content.substring(0, start) + text + content.substring(end);
                        setContent(newContent);
                    });
                    break;
                case 'selectAll':
                    textarea.select();
                    break;
            }
        } catch (err) {
            console.error('Action failed:', err);
        }
        setShowFloatingAi(false);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // Don't close if clicking inside the menu
            const menu = document.getElementById('ai-context-menu');
            if (menu && menu.contains(e.target as Node)) return;
            setShowFloatingAi(false);
        };
        if (showFloatingAi) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [showFloatingAi]);

    return (
        <div className="flex flex-col h-full w-full bg-bg-base relative">
            {/* Minimal Floating Top Bar - fades on inactivity */}
            <motion.div
                className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3"
                initial={{ opacity: 1 }}
                animate={{ opacity: showControls ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                style={{ pointerEvents: showControls ? 'auto' : 'none' }}
            >
                {/* Left side - Back button and title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-all flex-shrink-0"
                        title="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-transparent outline-none text-sm font-medium text-text-secondary hover:text-text-primary focus:text-text-primary placeholder-text-tertiary transition-colors max-w-md truncate"
                        placeholder="Untitled"
                    />
                </div>

                {/* Right side - Controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {aiLoading && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-surface/80 backdrop-blur border border-border text-text-secondary text-xs">
                            <Sparkles size={14} className="animate-spin text-accent" />
                            <span>AI...</span>
                        </div>
                    )}

                    <div className="flex items-center bg-bg-surface/80 backdrop-blur rounded-lg border border-border/50 p-0.5">
                        <button
                            onClick={() => setViewMode('edit')}
                            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${viewMode === 'edit' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
                            title="Edit Mode"
                        >
                            <Code size={14} /> Edit
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${viewMode === 'preview' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
                            title="Preview Mode"
                        >
                            <Eye size={14} /> Preview
                        </button>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${hasChanges
                            ? 'bg-accent text-white hover:opacity-90'
                            : 'bg-bg-surface/80 backdrop-blur border border-border/50 text-text-secondary'
                            } disabled:opacity-50`}
                    >
                        <Save size={14} />
                        {isSaving ? 'Saving...' : hasChanges ? 'Save' : 'Saved'}
                    </button>

                    <button
                        onClick={handleDelete}
                        className="p-2 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete Note"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </motion.div>

            {/* Full-height Editor Content */}
            <div className="flex-1 min-h-0 relative flex overflow-hidden">
                {/* Edit Panel */}
                {(viewMode === 'edit' || viewMode === 'split') && (
                    <div className={`flex-1 min-h-0 flex flex-col ${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-hidden`}>
                        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onSelect={handleSelect}
                                onKeyUp={handleSelect}
                                onMouseUp={handleSelect}
                                onContextMenu={handleContextMenu}
                                className="flex-1 font-mono text-sm leading-[1.8] bg-transparent text-text-primary outline-none resize-none border-0 focus:ring-0 placeholder-text-tertiary overflow-y-auto"
                                placeholder="Start writing..."
                                style={{
                                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                                    width: '100%',
                                    height: '100%',
                                    paddingTop: '80px',
                                    paddingBottom: '60px',
                                    paddingLeft: `max(24px, calc(50% - ${noteWidth / 2}px))`,
                                    paddingRight: `max(24px, calc(50% - ${noteWidth / 2}px))`
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Preview Panel */}
                {(viewMode === 'preview' || viewMode === 'split') && (
                    <div className={`flex-1 overflow-y-auto text-text-primary ${viewMode === 'split' ? 'w-1/2 border-l border-border' : 'w-full'}`}
                        style={{
                            paddingTop: '80px',
                            paddingBottom: '60px',
                            paddingLeft: `max(24px, calc(50% - ${noteWidth / 2}px))`,
                            paddingRight: `max(24px, calc(50% - ${noteWidth / 2}px))`
                        }}
                    >
                        <div className="prose prose-invert max-w-none" style={{ maxWidth: `${noteWidth}px` }}>
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
                                        const match = /language-(\w+)/.exec(className || '');
                                        const isMermaid = match && match[1] === 'mermaid';

                                        if (isMermaid) {
                                            return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
                                        }

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
                )}

                <AnimatePresence>
                    {showFloatingAi && (
                        <motion.div
                            id="ai-context-menu"
                            className="fixed bg-[#202124] border border-[#3c4043] rounded-xl shadow-2xl p-1.5 flex flex-col min-w-[200px] z-[9999] overflow-hidden"
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            style={{
                                left: Math.min(menuPosition.x, window.innerWidth - 220),
                                top: Math.min(menuPosition.y, window.innerHeight - 300),
                                transform: 'translate(4px, 4px)'
                            }}
                        >
                            {menuView === 'main' ? (
                                <>
                                    <button
                                        onClick={() => handleStandardAction('copy')}
                                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium hover:bg-white/5 rounded-lg text-text-primary transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Save size={14} className="opacity-40" />
                                            <span>Copy</span>
                                        </div>
                                        <span className="text-[10px] opacity-20 font-mono">Ctrl+C</span>
                                    </button>
                                    <button
                                        onClick={() => handleStandardAction('cut')}
                                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium hover:bg-white/5 rounded-lg text-text-primary transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Trash2 size={14} className="opacity-40" />
                                            <span>Cut</span>
                                        </div>
                                        <span className="text-[10px] opacity-20 font-mono">Ctrl+X</span>
                                    </button>
                                    <button
                                        onClick={() => handleStandardAction('paste')}
                                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium hover:bg-white/5 rounded-lg text-text-primary transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText size={14} className="opacity-40" />
                                            <span>Paste</span>
                                        </div>
                                        <span className="text-[10px] opacity-20 font-mono">Ctrl+V</span>
                                    </button>

                                    <div className="h-px bg-white/5 my-1" />

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuView('ai');
                                        }}
                                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium hover:bg-accent/10 text-accent rounded-lg transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Sparkles size={14} className="text-accent" />
                                            <span className="font-bold">AI Tools</span>
                                        </div>
                                        <ArrowLeft size={12} className="rotate-180 opacity-40 group-hover:opacity-100 transition-opacity" />
                                    </button>

                                    <div className="h-px bg-white/5 my-1" />

                                    <button
                                        onClick={() => handleStandardAction('selectAll')}
                                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium hover:bg-white/5 rounded-lg text-text-primary transition-all group"
                                    >
                                        <span>Select All</span>
                                        <span className="text-[10px] opacity-20 font-mono">Ctrl+A</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuView('main');
                                        }}
                                        className="flex items-center gap-3 w-full px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-text-tertiary hover:text-text-primary transition-colors hover:bg-white/5 rounded-lg"
                                    >
                                        <ArrowLeft size={12} />
                                        <span>Back to Menu</span>
                                    </button>

                                    <div className="h-px bg-white/5 my-1" />

                                    <button
                                        onClick={() => handleAiAction('grammar')}
                                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium hover:bg-accent/5 hover:text-accent rounded-lg text-text-primary transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <SpellCheck size={16} className="text-text-secondary group-hover:text-accent transition-colors" />
                                            <span>Correct Grammar</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => handleAiAction('simplify')}
                                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium hover:bg-accent/5 hover:text-accent rounded-lg text-text-primary transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Bot size={16} className="text-text-secondary group-hover:text-accent transition-colors" />
                                            <span>Simplify Text</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => handleAiAction('summarize')}
                                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium hover:bg-accent/5 hover:text-accent rounded-lg text-text-primary transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText size={16} className="text-text-secondary group-hover:text-accent transition-colors" />
                                            <span>Summarize</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => handleAiAction('flowchart')}
                                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium hover:bg-accent/5 hover:text-accent rounded-lg text-text-primary transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <GitMerge size={16} className="text-text-secondary group-hover:text-accent transition-colors" />
                                            <span>Generate Flowchart</span>
                                        </div>
                                    </button>

                                    <div className="h-px bg-white/5 my-1" />

                                    <button
                                        onClick={handleGenerateFlashcards}
                                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium hover:bg-accent/5 hover:text-accent rounded-lg text-text-primary transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Zap size={16} className="text-text-secondary group-hover:text-accent transition-colors" />
                                            <span>Generate Flashcards</span>
                                        </div>
                                        <Sparkles size={12} className="text-accent animate-pulse" />
                                    </button>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Minimal Footer - just line count, very subtle */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 text-[10px] text-text-tertiary/50"
                initial={{ opacity: 1 }}
                animate={{ opacity: showControls ? 0.7 : 0 }}
                transition={{ duration: 0.3 }}
            >
                <span>{content.split('\n').length} lines · {content.length} chars</span>
                <span>Markdown supported</span>
            </motion.div>

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

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.action}
                onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                danger
                confirmText="Delete"
            />
        </div >
    );
}
