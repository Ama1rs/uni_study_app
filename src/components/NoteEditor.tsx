import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, Save, Trash2 } from 'lucide-react';

interface Resource {
    id: number;
    repository_id: number;
    title: string;
    type: string;
    path?: string;
    content?: string;
    tags?: string;
    created_at?: string;
}

interface NoteEditorProps {
    resource: Resource;
    repositoryId: number;
    onClose: () => void;
    onSave?: () => void;
    onDelete?: () => void;
}

export function NoteEditor({ resource, onClose, onSave, onDelete }: NoteEditorProps) {
    const [content, setContent] = useState(resource.content || '');
    const [title, setTitle] = useState(resource.title);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

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
            onClose();
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
            onClose();
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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="w-[90vw] h-[90vh] max-w-6xl max-h-[90vh] rounded-2xl shadow-xl bg-bg-surface border border-border flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-border">
                    <div className="flex-1 min-w-0 mr-4">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full text-xl font-bold bg-transparent outline-none text-text-primary placeholder-text-tertiary"
                            placeholder="Note Title"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {hasChanges && (
                            <span className="text-xs text-text-tertiary px-2 py-1 rounded bg-yellow-500/10 text-yellow-400">
                                Unsaved changes
                            </span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                        >
                            <Save size={16} />
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-2 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Delete Note"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                            title="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="flex-1 w-full p-6 font-mono text-sm leading-relaxed bg-transparent text-text-primary outline-none resize-none border-0 focus:ring-0 placeholder-text-tertiary"
                        placeholder="Start typing your note here..."
                        style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace' }}
                    />
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 flex items-center justify-between p-4 border-t border-border text-xs text-text-tertiary">
                    <div className="flex items-center gap-4">
                        <span>Lines: {content.split('\n').length}</span>
                        <span>Characters: {content.length}</span>
                        {resource.created_at && (
                            <span>Created: {new Date(resource.created_at).toLocaleDateString()}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 rounded bg-bg-hover border border-border">Ctrl+S</kbd>
                        <span>to save</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

