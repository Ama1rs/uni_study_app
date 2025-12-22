import { useState, useEffect } from 'react';
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

// Modals
import { TemplateModal } from './modals/TemplateModal';
import { AddNoteModal } from './modals/AddNoteModal';
import { ResourcePreviewModal } from './modals/ResourcePreviewModal';
import { StressTestModal } from './modals/StressTestModal';

// Types and Utils
import { LinkV2, LinkType } from '../../types/node-system';

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
    const [activeView, setActiveView] = useState<'graph' | 'list' | 'videos' | 'editor'>('graph');
    const [searchQuery, setSearchQuery] = useState('');

    const [resources, setResources] = useState<Resource[]>([]);
    const [links, setLinks] = useState<LinkV2[]>([]);
    const [linkTypes, setLinkTypes] = useState<LinkType[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showAddNote, setShowAddNote] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [activeNoteResource, setActiveNoteResource] = useState<Resource | null>(null);
    const [previewResource, setPreviewResource] = useState<Resource | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

    // Dialog & Modal State
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkSourceId, setLinkSourceId] = useState<number | null>(null);
    const [showStressTest, setShowStressTest] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filterTypes, setFilterTypes] = useState<string[]>([]);
    const [filterStatus, setFilterStatus] = useState<string[]>([]);

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

            if (previewResource.type === 'pdf') {
                invoke<string>('read_file_base64', { path: previewResource.path })
                    .then(base64 => {
                        setPreviewUrl(`data:application/pdf;base64,${base64}`);
                    })
                    .catch(e => {
                        console.error('Failed to read PDF:', e);
                        try {
                            setPreviewUrl(convertFileSrc(raw));
                        } catch (err) {
                            console.error('Fallback failed:', err);
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
    }, [previewResource]);

    // Keyboard shortcuts
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (activeView !== 'graph' || !selectedNodeId) return;
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                const res = resources.find(r => r.id === selectedNodeId);
                if (res && confirm(`Are you sure you want to delete "${res.title}"?`)) {
                    invoke('delete_resource', { id: res.id })
                        .then(() => {
                            loadData();
                            setSelectedNodeId(null);
                        })
                        .catch(err => console.error(err));
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
                invoke<Resource[]>('get_resources', { repository_id: repository.id }),
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

    const availableTypes = Array.from(new Set(resources.map(r => r.type)));

    const filteredResources = resources.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.tags && r.tags.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesType = filterTypes.length === 0 || filterTypes.includes(r.type);
        return matchesSearch && matchesType;
    });

    const graphData = {
        nodes: filteredResources.map(r => ({
            id: r.id.toString(),
            name: r.title,
            val: r.type === 'note' ? 2 : 1,
            color: r.type === 'pdf' ? '#ef4444' : r.type === 'note' ? '#eab308' : r.type === 'image' ? '#10b981' : r.type === 'document' ? '#8b5cf6' : r.type === 'video' ? '#a855f7' : '#3b82f6',
            type: r.type
        })),
        links: links
            .filter(l => filteredResources.some(r => r.id === l.source_id) && filteredResources.some(r => r.id === l.target_id))
            .map(l => {
                const typeInfo = linkTypes.find(t => t.id === l.type_id);
                return {
                    source: l.source_id.toString(),
                    target: l.target_id.toString(),
                    color: typeInfo?.color || 'rgba(255,255,255,0.2)',
                    width: l.strength ? l.strength * 2 : 1,
                    dashed: typeInfo?.stroke_style !== 'solid'
                };
            })
    };

    async function importFile() {
        try {
            setIsImporting(true);
            const selected = await openFile({
                multiple: false,
                filters: [{
                    name: 'Documents',
                    extensions: ['pdf', 'txt', 'md', 'doc', 'docx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg']
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
        if (!confirm('Are you sure you want to delete this resource?')) return;
        try {
            await invoke('delete_resource', { id });
            loadData();
        } catch (e: any) {
            console.error(e);
        }
    }

    async function addNote(content: string) {
        try {
            await invoke('process_text_to_nodes', {
                repositoryId: repository.id,
                text: content
            });
            setShowAddNote(false);
            setNoteContent('');
            loadData();
        } catch (e: any) {
            console.error(e);
        }
    }

    function handleResourceOpen(res: Resource) {
        if (res.type === 'note') {
            setActiveNoteResource(res);
            setActiveView('editor');
            return;
        }
        if (['pdf', 'document', 'image', 'file', 'video'].includes(res.type) && res.path) {
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
            <RepositoryHeader
                repository={repository}
                activeView={activeView}
                setActiveView={setActiveView}
                showStressTest={showStressTest}
                setShowStressTest={setShowStressTest}
                onBack={onBack}
            />

            <RepositoryToolbar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                filterTypes={filterTypes}
                onToggleType={(type) => setFilterTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                availableTypes={availableTypes}
                filterStatus={filterStatus}
                onToggleStatus={(status) => setFilterStatus(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status])}
                onShowTemplates={() => setShowTemplates(true)}
                onImportFile={importFile}
                isImporting={isImporting}
                activeView={activeView}
            />

            <div className="flex-1 min-h-0 overflow-hidden relative bg-bg-base">
                <div className={`absolute inset-0 w-full h-full ${activeView === 'graph' ? 'block' : 'hidden'}`}>
                    <KnowledgeGraph
                        data={graphData}
                        onNodeClick={(node) => setSelectedNodeId(node ? parseInt(node.id) : null)}
                        onEditNode={(node) => {
                            const res = resources.find(r => r.id.toString() === node.id);
                            if (res) handleResourceOpen(res);
                        }}
                        onDeleteNode={(node) => {
                            if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
                                invoke('delete_resource', { id: parseInt(node.id) })
                                    .then(() => loadData())
                                    .catch(e => console.error(e));
                            }
                        }}
                        onLinkNode={(node) => {
                            setLinkSourceId(parseInt(node.id));
                            setShowLinkDialog(true);
                        }}
                    />
                </div>

                <AnimatePresence mode="wait">
                    {activeView === 'list' && (
                        <ResourceGridView
                            resources={filteredResources}
                            onOpenResource={handleResourceOpen}
                            onDeleteResource={deleteResource}
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
                            onClose={() => {
                                setActiveView('graph');
                                setActiveNoteResource(null);
                            }}
                            onSave={() => loadData()}
                            onDelete={() => {
                                loadData();
                                setActiveView('graph');
                                setActiveNoteResource(null);
                            }}
                        />
                    )}
                </div>
            </div>

            <TemplateModal
                isOpen={showTemplates}
                onClose={() => setShowTemplates(false)}
                onSelectTemplate={(content) => {
                    setNoteContent(content);
                    setShowTemplates(false);
                    setShowAddNote(true);
                }}
            />

            <AddNoteModal
                isOpen={showAddNote}
                onClose={() => setShowAddNote(false)}
                onAddNote={addNote}
                initialContent={noteContent}
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
                    onClose={() => {
                        setShowLinkDialog(false);
                        setLinkSourceId(null);
                    }}
                    onLinkCreated={() => {
                        loadData();
                        setShowLinkDialog(false);
                        setLinkSourceId(null);
                    }}
                />
            )}
        </div>
    );
}
