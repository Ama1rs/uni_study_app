import { useState, useEffect, useMemo } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { open as openFile } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
import { AnimatePresence } from 'framer-motion';

// Components
import { KnowledgeGraph } from './KnowledgeGraph';
import { YouTubeLinks } from '../resources/YouTubeLinks';
import { NoteEditor } from '../editor/NoteEditor';
import { NodeDetailPanel } from './NodeDetailPanel';
import { LinkDialog } from '../resources/LinkDialog';
import { RepositoryHeader } from './components/RepositoryHeader';
import { RepositoryToolbar } from './components/RepositoryToolbar';
import { ResourceGridView } from './components/ResourceGridView';
import { ResourceListView } from './components/ResourceListView';

// Modals
import { AddNoteModal } from './modals/AddNoteModal';
import { ResourcePreviewModal } from './modals/ResourcePreviewModal';
import { toast } from 'sonner';
import { StressTestModal } from './modals/StressTestModal';
import { RepositorySettingsModal } from './modals/RepositorySettingsModal';

// Types and Utils
import { LinkV2, LinkType } from '../../types/node-system';
import { GraphLegend } from './components/GraphLegend';
import { Button } from '../../components/ui/Button';
import { RefreshCw } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useAppSettings } from '../../contexts/AppSettingsContext';

export interface Repository {
    id: number;
    name: string;
    description?: string;
}

export interface Resource {
    id: number;
    repository_id: number;
    title: string;
    type: string;
    path?: string;
    content?: string;
    tags?: string;
}

interface RepositoryViewProps {
    repository: Repository;
    onBack: () => void;
}

export function RepositoryView({ repository, onBack }: RepositoryViewProps) {
    const { settings } = useAppSettings();
    const [activeView, setActiveView] = useState<'graph' | 'list' | 'videos' | 'editor'>('graph');
    const [previousView, setPreviousView] = useState<'graph' | 'list' | 'videos'>('graph');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [listViewType, setListViewType] = useState<'grid' | 'list'>('grid');

    const [resources, setResources] = useState<Resource[]>([]);
    const [links, setLinks] = useState<LinkV2[]>([]);
    const [linkTypes, setLinkTypes] = useState<LinkType[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [showAddNote, setShowAddNote] = useState(false);
    const [activeNoteResource, setActiveNoteResource] = useState<Resource | null>(null);
    const [previewResource, setPreviewResource] = useState<Resource | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
    const [graphKey, setGraphKey] = useState(0);

    // Dialog & Modal State
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkSourceId, setLinkSourceId] = useState<number | null>(null);
    const [showStressTest, setShowStressTest] = useState(false);
    const [showRepositorySettings, setShowRepositorySettings] = useState(false);
    const [editingTagsResource, setEditingTagsResource] = useState<Resource | null>(null);
    const [noteWidth, setNoteWidth] = useState(800);
    const [linkPosition, setLinkPosition] = useState<{ x: number, y: number } | null>(null);

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        action: () => void;
    }>({ isOpen: false, title: '', description: '', action: () => { } });

    useEffect(() => {
        loadData();
    }, [repository.id]);

    useEffect(() => {
        if (previewResource?.path) {
            const raw = previewResource.path.replace(/\\/g, '/');
            const isHttp = raw.startsWith('http://') || raw.startsWith('https://');

            if (isHttp) {
                setPreviewUrl(raw);
                return;
            }

            if (previewResource.type === 'pdf' || previewResource.type === 'image') {
                // Read file as base64 from backend and create a Blob URL in the renderer.
                // Blob URLs are more reliable for large files than data: URLs and avoid asset:// issues in Tauri v2.
                // Revoke any previous blob URL when creating a new one.
                if (previewBlobUrl) {
                    try { URL.revokeObjectURL(previewBlobUrl); } catch (e) { /* ignore */ }
                    setPreviewBlobUrl(null);
                }

                const mimeType = previewResource.type === 'pdf'
                    ? 'application/pdf'
                    : `image/${raw.split('.').pop()?.toLowerCase() || 'png'}`;

                invoke<string>('read_file_base64', { path: previewResource.path })
                    .then(base64 => {
                        try {
                            const binaryString = atob(base64);
                            const len = binaryString.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            const blob = new Blob([bytes], { type: mimeType });
                            const blobUrl = URL.createObjectURL(blob);
                            setPreviewBlobUrl(blobUrl);
                            setPreviewUrl(blobUrl);
                        } catch (e) {
                            console.error('Failed to construct blob from base64:', e);
                            // fallback to data URL
                            setPreviewUrl(`data:${mimeType};base64,${base64}`);
                        }
                    })
                    .catch(err => {
                        console.error('read_file_base64 failed:', err);
                        // Fallback to convertFileSrc if reading as base64 fails
                        try {
                            setPreviewUrl(convertFileSrc(raw));
                        } catch (e) {
                            console.error('convertFileSrc failed fallback:', e);
                            setPreviewUrl(raw);
                        }
                    });
            } else {
                try {
                    setPreviewUrl(convertFileSrc(raw));
                } catch (e) {
                    console.error('convertFileSrc failed:', e);
                    setPreviewUrl(raw);
                }
            }
        } else {
            setPreviewUrl(null);
        }
        // Cleanup: revoke blob URL when previewResource changes or on unmount
        return () => {
            if (previewBlobUrl) {
                try { URL.revokeObjectURL(previewBlobUrl); } catch (e) { /* ignore */ }
                setPreviewBlobUrl(null);
            }
        };
    }, [previewResource]);

    // Keyboard shortcuts
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (activeView !== 'graph' || !selectedNodeId) return;
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                const res = resources.find(r => r.id === selectedNodeId);
                if (res) {
                    setConfirmState({
                        isOpen: true,
                        title: 'Delete Resource',
                        description: `Are you sure you want to delete "${res.title}"?`,
                        action: () => {
                            invoke('delete_resource', { id: res.id })
                                .then(() => {
                                    loadData();
                                    setSelectedNodeId(null);
                                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                                })
                                .catch(err => console.error(err));
                        }
                    });
                }
            }

            if (e.key === 'e' || e.key === 'E') {
                const res = resources.find(r => r.id === selectedNodeId);
                if (res) handleResourceOpen(res);
            }

            if (e.key === 'Escape') {
                setSelectedNodeId(null);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeView, selectedNodeId, resources]);

    async function loadData() {
        try {
            const [resResources, resLinks, resTypes] = await Promise.all([
                invoke<Resource[]>('get_resources', { repositoryId: repository.id }),
                invoke<LinkV2[]>('get_links_v2_cmd'),
                invoke<LinkType[]>('get_link_types_cmd')
            ]);
            setResources(resResources);
            setLinks(resLinks);
            setLinkTypes(resTypes);
        } catch (e) {
            console.error("Error loading data:", e);
        }
    }

    // Extract all unique tags from resources
    const allTags = Array.from(
        new Set(
            resources
                .flatMap(r => r.tags?.split(',').map(t => t.trim()).filter(t => t) || [])
        )
    ).sort();

    async function deleteTag(tag: string) {
        try {
            // Remove tag from all resources that have it
            const resourcesWithTag = resources.filter(r =>
                r.tags?.toLowerCase().includes(tag.toLowerCase())
            );

            for (const res of resourcesWithTag) {
                const tags = res.tags
                    ?.split(',')
                    .map(t => t.trim())
                    .filter(t => t.toLowerCase() !== tag.toLowerCase())
                    .join(',') || '';

                await invoke('update_resource', {
                    id: res.id,
                    tags: tags || null
                });
            }

            loadData();
            toast.success(`Tag "${tag}" removed`);
        } catch (e) {
            console.error("Failed to delete tag:", e);
            toast.error(`Failed to delete tag: ${e}`);
        }
    }

    // Debounce search query to prevent heavy graph recalculations on every keystroke
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const listFilteredResources = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return resources.filter(r =>
            r.title.toLowerCase().includes(query) ||
            (r.tags && r.tags.toLowerCase().includes(query))
        );
    }, [resources, searchQuery]);

    const graphFilteredResources = useMemo(() => {
        const query = debouncedSearchQuery.toLowerCase();
        return resources.filter(r =>
            r.title.toLowerCase().includes(query) ||
            (r.tags && r.tags.toLowerCase().includes(query))
        );
    }, [resources, debouncedSearchQuery]);

    const graphData = useMemo(() => {
        const nodes = graphFilteredResources.map(r => {
            // Generate distinct colors based on type
            let color = '#ffffff';
            switch (r.type.toLowerCase()) {
                case 'pdf': color = '#FF4D4D'; break; // Red for PDFs
                case 'image': color = '#4D94FF'; break; // Blue for Images
                case 'note': color = '#FFB84D'; break; // Orange for Notes
                case 'epub': case 'azw3': case 'fb2': color = '#4DFF88'; break; // Green for Books
                case 'document': case 'docx': case 'doc': case 'txt': case 'md': color = '#B84DFF'; break; // Purple for Documents
                default: color = '#94A3B8'; // Slate for others
            }

            return {
                id: r.id.toString(),
                name: r.title,
                val: r.type === 'image' ? 8 : (r.type === 'note' ? 2 : 1), // Make image nodes much larger for previews
                color: color,
                type: r.type,
                imgUrl: r.type === 'image' ? r.path : undefined
            };
        });

        const linksData = links
            .filter(l => graphFilteredResources.some(r => r.id === l.source_id) && graphFilteredResources.some(r => r.id === l.target_id))
            .map(l => {
                const typeInfo = linkTypes.find(t => t.id === l.type_id);
                return {
                    source: l.source_id.toString(),
                    target: l.target_id.toString(),
                    color: typeInfo?.color || 'rgba(255,255,255,0.2)',
                    width: l.strength ? l.strength * 2 : 1,
                    dashed: typeInfo?.stroke_style !== 'solid'
                };
            });

        return { nodes, links: linksData };
    }, [graphFilteredResources, links, linkTypes]);

    async function importFile() {
        try {
            setIsImporting(true);
            const selected = await openFile({
                multiple: false,
                filters: [{
                    name: 'Documents',
                    extensions: ['pdf', 'txt', 'md', 'doc', 'docx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'epub', 'azw3', 'fb2', 'ibooks']
                }]
            });

            if (selected && typeof selected === 'string') {
                await invoke('import_resource', {
                    repositoryId: repository.id,
                    filePath: selected
                });
                loadData();
            }
        } catch (e: any) {
            console.error("Failed to import:", e);
        } finally {
            setIsImporting(false);
        }
    }

    async function deleteResource(e: React.MouseEvent, id: number) {
        e.stopPropagation();
        const res = resources.find(r => r.id === id);
        if (!res) return;

        setConfirmState({
            isOpen: true,
            title: 'Delete Resource',
            description: `Are you sure you want to delete "${res.title}"?`,
            action: async () => {
                try {
                    await invoke('delete_resource', { id });
                    loadData();
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                } catch (e: any) {
                    console.error(e);
                }
            }
        });
    }

    async function addNote(content: string, tags?: string) {
        try {
            await invoke('process_text_to_nodes', {
                repositoryId: repository.id,
                text: content,
                tags: tags || null
            });
            setShowAddNote(false);
            loadData();
            toast.success("Note created successfully");
        } catch (e) {
            console.error("Failed to add note:", e);
            toast.error(`Failed to create note: ${e}`);
        }
    }

    async function editTags(resource: Resource, tags: string) {
        try {
            await invoke('update_resource', {
                id: resource.id,
                tags: tags || null
            });
            loadData();
            toast.success("Tags updated");
        } catch (e) {
            console.error("Failed to update tags:", e);
            toast.error(`Failed to update tags: ${e}`);
        }
    }

    function handleResourceOpen(res: Resource) {
        if (res.type === 'note') {
            setPreviousView(activeView as 'graph' | 'list' | 'videos');
            setActiveNoteResource(res);
            setActiveView('editor');
            return;
        }

        const isBook = ['epub', 'azw3', 'fb2', 'ibooks'].includes(res.type.toLowerCase());
        if ((['pdf', 'document', 'image', 'file', 'video'].includes(res.type) || isBook) && res.path) {
            setPreviewResource(res);
            return;
        }
    }

    async function openInDefaultApp(path?: string) {
        if (!path) return;
        try {
            await openPath(path);
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="flex flex-col h-full w-full absolute inset-0">
            {activeView !== 'videos' && (
                <>
                    <RepositoryHeader
                        repository={repository}
                        activeView={activeView}
                        setActiveView={setActiveView}
                        showStressTest={showStressTest}
                        setShowStressTest={setShowStressTest}
                        showRepositorySettings={showRepositorySettings}
                        setShowRepositorySettings={setShowRepositorySettings}
                        onBack={onBack}
                    />

                    <RepositoryToolbar
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        availableTags={allTags}
                        onShowAddNote={() => setShowAddNote(true)}
                        onImportFile={importFile}
                        isImporting={isImporting}
                        activeView={activeView}
                    />
                </>
            )}

            <div className="flex-1 min-h-0 overflow-hidden relative bg-bg-base">
                <div className={`absolute inset-0 w-full h-full ${activeView === 'graph' ? 'block' : 'hidden'}`}>
                    {resources.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-base z-10">
                            <div className="max-w-md text-center p-8">
                                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-accent">
                                    <RefreshCw size={32} className="animate-spin-slow" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-text-primary">Empty Knowledge Graph</h3>
                                <p className="text-text-secondary mb-8 leading-relaxed">
                                    This subject has no content yet. Start by adding notes or importing documents to visualize connections relative to your learning.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <Button
                                        variant="primary"
                                        size="default"
                                        className="w-full sm:w-auto min-w-[140px]"
                                        onClick={() => setShowAddNote(true)}
                                    >
                                        Create Note
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="default"
                                        className="w-full sm:w-auto min-w-[140px]"
                                        onClick={importFile}
                                    >
                                        Import File
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {settings.graph_show_legend && <GraphLegend />}
                            <Button
                                variant="secondary"
                                size="compact"
                                className="absolute top-4 right-4 z-10 bg-bg-surface/80 backdrop-blur shadow-sm border-border/50"
                                onClick={() => setGraphKey(k => k + 1)}
                            >
                                <RefreshCw size={14} className="mr-2" />
                                Reset Layout
                            </Button>
                            <KnowledgeGraph
                                key={graphKey}
                                data={graphData}
                                onNodeClick={(node) => setSelectedNodeId(node ? parseInt(node.id) : null)}
                                onOpenNode={(node) => {
                                    const res = resources.find(r => r.id.toString() === node.id);
                                    if (res) handleResourceOpen(res);
                                }}
                                onEditNode={(node) => {
                                    const res = resources.find(r => r.id.toString() === node.id);
                                    if (res) handleResourceOpen(res);
                                }}
                                onDeleteNode={(node) => {
                                    setConfirmState({
                                        isOpen: true,
                                        title: 'Delete Node',
                                        description: `Are you sure you want to delete "${node.name}"?`,
                                        action: () => {
                                            invoke('delete_resource', { id: parseInt(node.id) })
                                                .then(() => {
                                                    loadData();
                                                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                                                })
                                                .catch(e => console.error(e));
                                        }
                                    });
                                }}
                                onLinkNode={(node, pos) => {
                                    setLinkSourceId(parseInt(node.id));
                                    if (pos) {
                                        setLinkPosition(pos);
                                    }
                                    setShowLinkDialog(true);
                                }}
                            />
                        </>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {activeView === 'list' && listViewType === 'grid' && (
                        <ResourceGridView
                            resources={listFilteredResources}
                            onOpenResource={handleResourceOpen}
                            onDeleteResource={deleteResource}
                            onEditTags={(res) => setEditingTagsResource(res)}
                            onShowAddNote={() => setShowAddNote(true)}
                            onImportFile={importFile}
                        />
                    )}
                    {activeView === 'list' && listViewType === 'list' && (
                        <ResourceListView
                            resources={listFilteredResources}
                            onOpenResource={handleResourceOpen}
                            onDeleteResource={deleteResource}
                            onEditTags={(res) => setEditingTagsResource(res)}
                            onShowAddNote={() => setShowAddNote(true)}
                            onImportFile={importFile}
                        />
                    )}
                </AnimatePresence>

                <div className={`absolute inset-0 w-full h-full ${activeView === 'videos' ? 'block' : 'hidden'}`}>
                    <YouTubeLinks repository={repository} onBack={() => setActiveView('graph')} />
                </div>

                <div className={`absolute inset-0 w-full h-full ${activeView === 'editor' ? 'block' : 'hidden'} z-20`}>
                    {activeNoteResource && (
                        <NoteEditor
                            resource={activeNoteResource}
                            repositoryId={repository.id}
                            noteWidth={noteWidth}
                            onClose={() => {
                                setActiveView(previousView);
                                setActiveNoteResource(null);
                            }}
                            onSave={() => loadData()}
                            onDelete={() => {
                                loadData();
                                setActiveView(previousView);
                                setActiveNoteResource(null);
                            }}
                        />
                    )}
                </div>
            </div>

            <AddNoteModal
                isOpen={showAddNote}
                onClose={() => setShowAddNote(false)}
                onAddNote={addNote}
            />

            <ResourcePreviewModal
                resource={previewResource}
                previewUrl={previewUrl}
                onClose={() => setPreviewResource(null)}
                onOpenExternally={openInDefaultApp}
            />

            <StressTestModal
                isOpen={showStressTest}
                onClose={() => setShowStressTest(false)}
                repositoryId={repository.id}
                onComplete={() => {
                    loadData();
                    setShowStressTest(false);
                }}
            />

            {selectedNodeId && (
                <NodeDetailPanel
                    nodeId={selectedNodeId}
                    title={resources.find(r => r.id === selectedNodeId)?.title || 'Unknown'}
                    type={resources.find(r => r.id === selectedNodeId)?.type || 'file'}
                    onClose={() => setSelectedNodeId(null)}
                    onMetadataChange={() => { }}
                />
            )}

            {showLinkDialog && linkSourceId && (
                <LinkDialog
                    sourceId={linkSourceId}
                    resources={resources}
                    position={linkPosition}
                    onClose={() => {
                        setShowLinkDialog(false);
                        setLinkSourceId(null);
                        setLinkPosition(null);
                    }}
                    onLinkCreated={() => {
                        loadData();
                        setShowLinkDialog(false);
                        setLinkSourceId(null);
                        setLinkPosition(null);
                    }}
                />
            )}

            {/* Edit Tags Modal */}
            {editingTagsResource && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="glass-card p-6 rounded-2xl w-96 shadow-xl bg-bg-surface">
                        <h3 className="text-lg font-bold mb-4 text-text-primary">Edit Tags</h3>
                        <p className="text-sm text-text-secondary mb-4">Add tags to "{editingTagsResource.title}" (comma-separated)</p>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target as HTMLFormElement);
                            const tags = (formData.get('tags') as string).trim();
                            editTags(editingTagsResource, tags);
                            setEditingTagsResource(null);
                        }}>
                            <input
                                name="tags"
                                type="text"
                                defaultValue={editingTagsResource.tags || ''}
                                placeholder="math, calculus, important"
                                className="w-full px-4 py-2 rounded-lg outline-none border border-border bg-transparent text-text-primary placeholder-text-tertiary focus:border-accent transition-colors"
                                autoFocus
                            />

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditingTagsResource(null)}
                                    className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg text-sm text-black font-medium bg-accent hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
                                >
                                    Save Tags
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <RepositorySettingsModal
                isOpen={showRepositorySettings}
                onClose={() => setShowRepositorySettings(false)}
                noteWidth={noteWidth}
                onNoteWidthChange={setNoteWidth}
                allTags={allTags}
                onDeleteTag={deleteTag}
                listViewType={listViewType}
                onListViewTypeChange={setListViewType}
            />

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.action}
                onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                danger
                confirmText="Delete"
            />
        </div>
    );
}
