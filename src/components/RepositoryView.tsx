import { useState, useEffect } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { open as openFile } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
import { KnowledgeGraph } from './KnowledgeGraph';
import { YouTubeLinks } from './YouTubeLinks';
import { NoteEditor } from './NoteEditor';
import { NodeDetailPanel } from './NodeDetailPanel';
import { SearchFilterPanel } from './SearchFilterPanel';
import { LinkDialog } from './LinkDialog';
import { LinkV2, LinkType } from '../types/node-system';
import { ArrowLeft, Search, Filter, FileText, StickyNote, Link as LinkIcon, Settings, Upload, Trash2, LayoutTemplate, Video, Edit, Image as ImageIcon, File as FileIcon, X } from 'lucide-react';


interface Repository {
    id: number;
    name: string;
    description?: string;
    // color: string; // Removed color as it's not in DB yet
}

interface Resource {
    id: number;
    repository_id: number;
    title: string;
    type: string;
    path?: string;
    content?: string;
    tags?: string;
}

// Replaced local Link interface with LinkV2 from types

interface RepositoryViewProps {
    repository: Repository;
    onBack: () => void;
}

export function RepositoryView({ repository, onBack }: RepositoryViewProps) {
    const [activeView, setActiveView] = useState<'graph' | 'list' | 'videos'>('graph');
    const [searchQuery, setSearchQuery] = useState('');

    const [resources, setResources] = useState<Resource[]>([]);
    const [links, setLinks] = useState<LinkV2[]>([]);
    const [linkTypes, setLinkTypes] = useState<LinkType[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showAddNote, setShowAddNote] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [editingNote, setEditingNote] = useState<Resource | null>(null);
    const [previewResource, setPreviewResource] = useState<Resource | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

    // Link Dialog State
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkSourceId, setLinkSourceId] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, [repository.id]);

    useEffect(() => {
        if (previewResource?.path) {
            const raw = previewResource.path.replace(/\\/g, '/');
            const isHttp = raw.startsWith('http://') || raw.startsWith('https://');
            try {
                const localUrl = convertFileSrc(raw, 'asset');
                setPreviewUrl(isHttp ? raw : localUrl);
            } catch (e) {
                console.error('convertFileSrc failed, falling back to raw path', e);
                setPreviewUrl(raw);
            }
        } else {
            setPreviewUrl(null);
        }
    }, [previewResource]);

    // Keyboard shortcuts
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // Only if graph view is active and a node is selected
            if (activeView !== 'graph' || !selectedNodeId) return;

            // Ignore if typing in an input
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                const res = resources.find(r => r.id === selectedNodeId);
                if (res) {
                    if (confirm(`Are you sure you want to delete "${res.title}"?`)) {
                        invoke('delete_resource', { id: res.id })
                            .then(() => {
                                loadData();
                                setSelectedNodeId(null);
                            })
                            .catch(err => console.error(err));
                    }
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

    // State for filtering - MOVED UP due to dependency
    const [showFilters, setShowFilters] = useState(false);
    const [filterTypes, setFilterTypes] = useState<string[]>([]);
    const [filterStatus, setFilterStatus] = useState<string[]>([]);

    // Determine available types dynamically from current resources
    const availableTypes = Array.from(new Set(resources.map(r => r.type)));

    const filteredResources = resources.filter(r => {
        // Search query
        const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.tags && r.tags.toLowerCase().includes(searchQuery.toLowerCase()));

        // Type filter
        const matchesType = filterTypes.length === 0 || filterTypes.includes(r.type);
        return matchesSearch && matchesType;
    });

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
            // Fallback for legacy links if v2 fails (migration might not have run or empty)
            try {
                const legacyLinks = await invoke<any[]>('get_links');
                if (legacyLinks.length > 0 && links.length === 0) {
                    console.log("Fallback to legacy links");
                    setLinks(legacyLinks.map(l => ({
                        id: l.id,
                        source_id: l.source_id,
                        target_id: l.target_id,
                        strength: 1,
                        bidirectional: false
                    })));
                }
            } catch (err) { console.error(err); }
        }
    }

    // Transform resources to graph data
    // Use filteredResources so the graph reflects the current search/filter state
    const graphData = {
        nodes: filteredResources.map(r => ({
            id: r.id.toString(),
            name: r.title,
            val: r.type === 'note' ? 2 : 1,
            color:
                r.type === 'pdf' ? '#ef4444' :
                    r.type === 'note' ? '#eab308' :
                        r.type === 'image' ? '#10b981' :
                            r.type === 'document' ? '#8b5cf6' :
                                r.type === 'video' ? '#a855f7' :
                                    '#3b82f6',
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


    // (State definitions for filters moved up)

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
            alert(`Failed to import file: ${e.toString()}`);
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
            alert(`Failed to delete: ${e.toString()}`);
        }
    }

    async function addNote() {
        if (!noteContent) { alert("Empty note!"); return; }
        try {
            await invoke('process_text_to_nodes', {
                repositoryId: repository.id,
                text: noteContent
            });
            setNoteContent('');
            setShowAddNote(false);
            loadData();
        } catch (e: any) {
            console.error(e);
            alert(`Failed to add note: ${e.toString()}`);
        }
    }

    function handleResourceOpen(res: Resource) {
        if (res.type === 'note') {
            setEditingNote(res);
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
            alert('Unable to open file with default application.');
        }
    }

    return (
        <div className="flex flex-col h-full w-full absolute inset-0">
            {/* Fixed Header */}
            <div className="flex-shrink-0 flex flex-col md:flex-row items-center justify-between p-6 border-b border-border bg-bg-base z-10" style={{ borderColor: 'var(--border)' }}>
                <div className="flex flex-col items-center md:items-start md:flex-row gap-4 w-full">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-xl hover:bg-white/5 transition-colors self-start md:self-center"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col items-center md:items-start">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{repository.name}</h1>
                        </div>
                        <p className="text-sm text-center md:text-left" style={{ color: 'var(--text-secondary)' }}>{repository.description || 'No description'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-black/20 p-1 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                        <button
                            onClick={() => setActiveView('graph')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === 'graph' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Graph
                        </button>
                        <button
                            onClick={() => setActiveView('list')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === 'list' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            List
                        </button>
                    </div>
                    <button
                        onClick={() => setActiveView('videos')}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${activeView === 'videos' ? 'bg-white/10 text-white border-accent/70' : 'text-gray-300 hover:text-white hover:border-accent/50'}`}
                        style={{ borderColor: 'var(--border)' }}
                        title="YouTube Videos"
                    >
                        Videos
                    </button>
                    <button className="p-2.5 rounded-xl border hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                        <Settings size={20} />
                    </button>
                </div>
            </div>



            // ...

            {/* Toolbar - hidden on Videos page */}
            {activeView !== 'videos' && (
                <div className="flex-shrink-0 flex gap-4 p-6 border-b border-border bg-bg-base relative" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search nodes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-transparent outline-none focus:border-blue-500 transition-colors"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 transition-colors ${(filterTypes.length > 0 || filterStatus.length > 0)
                                ? 'bg-accent/10 border-accent text-accent'
                                : 'hover:bg-white/5 text-text-secondary'
                                }`}
                            style={{ borderColor: (filterTypes.length > 0) ? '' : 'var(--border)' }}
                        >
                            <Filter size={18} />
                            Filter
                            {(filterTypes.length > 0) && (
                                <span className="bg-accent text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.2em] text-center">
                                    {filterTypes.length}
                                </span>
                            )}
                        </button>

                        <SearchFilterPanel
                            isOpen={showFilters}
                            onClose={() => setShowFilters(false)}
                            selectedTypes={filterTypes}
                            onToggleType={(type) => {
                                setFilterTypes(prev =>
                                    prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                                );
                            }}
                            availableTypes={availableTypes}
                            selectedStatus={filterStatus}
                            onToggleStatus={(status) => {
                                setFilterStatus(prev =>
                                    prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
                                );
                            }}
                            availableStatuses={[]} // Disabling status filter for now as discussed
                        />
                    </div>

                    <button onClick={() => setShowTemplates(true)} className="px-4 py-2.5 rounded-xl border flex items-center gap-2 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }} title="Templates">
                        <LayoutTemplate size={18} /> Template
                    </button>
                    <button onClick={importFile} disabled={isImporting} className="px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50" style={{ backgroundColor: 'var(--accent)' }}>
                        <Upload size={18} /> Import
                    </button>
                </div>
            )}

            {/* Content Area - Full Page */}
            <div className="flex-1 min-h-0 overflow-hidden relative bg-bg-base">
                {/* Graph View */}
                <div className={`absolute inset-0 w-full h-full ${activeView === 'graph' ? 'block' : 'hidden'}`}>
                    <KnowledgeGraph
                        data={graphData}
                        onNodeClick={(node) => {
                            if (node) {
                                setSelectedNodeId(parseInt(node.id));
                            } else {
                                setSelectedNodeId(null);
                            }
                        }}
                        onEditNode={(node) => {
                            // Find full resource object
                            const res = resources.find(r => r.id.toString() === node.id);
                            if (res) handleResourceOpen(res);
                        }}
                        onDeleteNode={(node) => {
                            if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
                                invoke('delete_resource', { id: parseInt(node.id) })
                                    .then(() => loadData())
                                    .catch(e => alert(`Failed to delete: ${e}`));
                            }
                        }}
                        onLinkNode={(node) => {
                            setLinkSourceId(parseInt(node.id));
                            setShowLinkDialog(true);
                        }}
                    />
                </div>

                {/* List View */}
                <div className={`absolute inset-0 w-full h-full overflow-y-auto ${activeView === 'list' ? 'block' : 'hidden'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                        {filteredResources.length === 0 && (
                            <div className="glass-card p-8 flex flex-col items-center justify-center text-center w-full h-full min-h-[300px]">
                                <p style={{ color: 'var(--text-secondary)' }} className="mb-4">No resources yet. Add notes or import files to see the graph.</p>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowAddNote(true)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm">Add Note</button>
                                    <button onClick={importFile} className="px-4 py-2 rounded-xl border border-gray-600 text-gray-300 text-sm">Import File</button>
                                </div>
                            </div>
                        )}
                        {filteredResources.map(res => (
                            <div key={res.id} className="rounded-2xl overflow-hidden cursor-pointer flex flex-col relative border border-border/50 bg-bg-surface/30 hover:bg-bg-surface hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300 transform hover:-translate-y-1 group">
                                <div
                                    className="aspect-video bg-black/40 relative flex items-center justify-center overflow-hidden"
                                    onClick={() => handleResourceOpen(res)}
                                >
                                    <div className={`flex flex-col items-center gap-2 ${res.type === 'pdf' ? 'text-red-400' :
                                        res.type === 'note' ? 'text-yellow-400' :
                                            res.type === 'image' ? 'text-emerald-400' :
                                                res.type === 'document' ? 'text-purple-300' :
                                                    res.type === 'video' ? 'text-purple-400' :
                                                        'text-blue-400'
                                        }`}>
                                        {res.type === 'pdf' && <FileText size={32} strokeWidth={1.5} />}
                                        {res.type === 'note' && <StickyNote size={32} strokeWidth={1.5} />}
                                        {res.type === 'file' && <LinkIcon size={32} strokeWidth={1.5} />}
                                        {res.type === 'image' && <ImageIcon size={32} strokeWidth={1.5} />}
                                        {res.type === 'document' && <FileIcon size={32} strokeWidth={1.5} />}
                                        {res.type === 'video' && <Video size={32} strokeWidth={1.5} />}
                                    </div>
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        {res.type === 'note' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingNote(res);
                                                }}
                                                className="p-2 rounded-xl bg-black/60 text-white/70 hover:text-accent hover:bg-black/80 transition-all backdrop-blur-sm z-10 opacity-0 group-hover:opacity-100"
                                                title="Edit Note"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => deleteResource(e, res.id)}
                                            className="p-2 rounded-xl bg-black/60 text-white/70 hover:text-red-400 hover:bg-black/80 transition-all backdrop-blur-sm z-10 opacity-0 group-hover:opacity-100"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 relative">
                                    <h3 className="font-semibold text-text-primary line-clamp-2 leading-relaxed mb-2 group-hover:text-accent transition-colors">{res.title}</h3>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${res.type === 'pdf' ? 'bg-red-500/10 text-red-400' :
                                            res.type === 'note' ? 'bg-yellow-500/10 text-yellow-400' :
                                                res.type === 'image' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    res.type === 'document' ? 'bg-purple-500/10 text-purple-400' :
                                                        res.type === 'video' ? 'bg-purple-500/10 text-purple-400' :
                                                            'bg-blue-500/10 text-blue-400'
                                            }`}>{res.type}</span>
                                        {res.tags && <span className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400">#{res.tags}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Videos View */}
                <div className={`absolute inset-0 w-full h-full ${activeView === 'videos' ? 'block' : 'hidden'}`}>
                    <YouTubeLinks repository={repository} onBack={() => setActiveView('graph')} />
                </div>
            </div>

            {/* Template Selection Modal */}
            {showTemplates && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="p-6 rounded-2xl w-[500px] shadow-xl bg-bg-surface border border-border">
                        <h3 className="text-lg font-bold mb-4 text-text-primary">Choose a Template</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { id: 'cornell', name: 'Cornell Method', desc: 'Structured notes with cues and summary', content: "# Topic\n\n## Cues\n- Key Point 1\n- Key Point 2\n\n## Notes\nDetailed notes here...\n\n## Summary\nBrief summary..." },
                                { id: 'meeting', name: 'Meeting Notes', desc: 'Agenda, attendees, and action items', content: "# Meeting: [Title]\n**Date:** [Today]\n**Attendees:** \n\n## Agenda\n1. \n2. \n\n## Action Items\n- [ ] " },
                                { id: 'concept', name: 'Concept Definition', desc: 'Deep dive into a single concept', content: "# Concept: \n\n**Definition:** \n\n**Examples:** \n- \n- \n\n**Related:**" },
                                { id: 'feynman', name: 'Feynman Technique', desc: 'Explain it like I am 5', content: "# Concept Name\n\n## Explanation\n(Explain in simple terms)\n\n## Analogies\n\n## Knowledge Gaps\n" }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setNoteContent(t.content);
                                        setShowTemplates(false);
                                        setShowAddNote(true);
                                    }}
                                    className="p-4 rounded-xl border border-border hover:bg-white/5 hover:border-accent/50 text-left transition-all group"
                                >
                                    <div className="font-semibold text-text-primary group-hover:text-accent mb-1">{t.name}</div>
                                    <div className="text-xs text-text-secondary">{t.desc}</div>
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setShowTemplates(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Note Modal */}
            {showAddNote && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="p-6 rounded-2xl w-[600px] shadow-xl bg-bg-surface border border-border">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-text-primary">Add Smart Note</h3>
                            <select className="px-3 py-1 rounded-lg text-sm border border-border bg-transparent outline-none cursor-pointer text-text-secondary focus:border-accent transition-colors" onChange={(e) => {
                                const t = e.target.value;
                                if (t === 'cornell') setNoteContent("# Topic\n\n## Cues\n- Key Point 1\n- Key Point 2\n\n## Notes\nDetailed notes here...\n\n## Summary\nBrief summary...");
                                if (t === 'meeting') setNoteContent("# Meeting: [Title]\n**Date:** [Today]\n**Attendees:** \n\n## Agenda\n1. \n2. \n\n## Action Items\n- [ ] ");
                                if (t === 'concept') setNoteContent("# Concept: \n\n**Definition:** \n\n**Examples:** \n- \n- \n\n**Related:**");
                                if (t === '') setNoteContent('');
                            }}>
                                <option value="">No Template</option>
                                <option value="cornell">Cornell Method</option>
                                <option value="meeting">Meeting Notes</option>
                                <option value="concept">Concept Definition</option>
                            </select>
                        </div>
                        <p className="text-sm mb-4 text-text-secondary">Paste text below. Double newlines will split the text into separate linked nodes.</p>
                        <textarea className="w-full h-64 px-4 py-3 rounded-xl mb-4 outline-none border border-border bg-transparent resize-none text-text-primary focus:border-accent transition-colors placeholder:text-text-tertiary" placeholder="Enter your notes here..." value={noteContent} onChange={e => setNoteContent(e.target.value)} autoFocus />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAddNote(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                            <button onClick={addNote} className="px-4 py-2 rounded-lg text-sm text-white bg-accent hover:opacity-90 transition-opacity">Process & Add</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resource Preview Modal */}
            {previewResource && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="p-6 rounded-2xl w-[900px] max-w-[95vw] shadow-2xl bg-bg-surface border border-border">
                        <div className="flex justify-between items-start gap-4 mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-text-primary">{previewResource.title}</h3>
                                <p className="text-xs uppercase tracking-wider text-text-secondary">{previewResource.type}</p>
                            </div>
                            <button
                                onClick={() => setPreviewResource(null)}
                                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
                                title="Close preview"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-black/20 rounded-xl border border-border/70 overflow-hidden h-[70vh] flex items-center justify-center">
                            {previewResource.type === 'pdf' && previewUrl && (
                                <iframe
                                    src={`${previewUrl}#toolbar=1`}
                                    className="w-full h-full"
                                    title={previewResource.title}
                                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                                    referrerPolicy="no-referrer"
                                />
                            )}

                            {previewResource.type === 'image' && previewUrl && (
                                <img src={previewUrl} alt={previewResource.title} className="max-h-full max-w-full object-contain" />
                            )}

                            {previewResource.type === 'document' && (
                                <div className="flex flex-col items-center justify-center gap-3 text-text-secondary p-6 text-center">
                                    <p>Document preview is not supported in-app. Open with your system viewer.</p>
                                    <button
                                        onClick={() => openInDefaultApp(previewResource.path)}
                                        className="px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity"
                                    >
                                        Open in default app
                                    </button>
                                </div>
                            )}

                            {previewResource.type === 'file' && (
                                <div className="flex flex-col items-center justify-center gap-3 text-text-secondary p-6 text-center">
                                    <p>Preview not available for this file type.</p>
                                    <button
                                        onClick={() => openInDefaultApp(previewResource.path)}
                                        className="px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity"
                                    >
                                        Open in default app
                                    </button>
                                </div>
                            )}

                            {previewResource.type === 'video' && previewUrl && (
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full"
                                    title={previewResource.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    referrerPolicy="no-referrer"
                                />
                            )}

                            {!previewUrl && ['pdf', 'image', 'video'].includes(previewResource.type) && (
                                <div className="text-text-secondary">Unable to preview this file.</div>
                            )}
                        </div>

                        <div className="flex justify-between items-center mt-4">
                            <div className="text-xs text-text-secondary truncate">
                                {previewResource.path}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openInDefaultApp(previewResource.path)}
                                    className="px-4 py-2 rounded-lg text-sm border border-border text-text-primary hover:bg-white/5 transition-colors"
                                >
                                    Open externally
                                </button>
                                <button
                                    onClick={() => setPreviewResource(null)}
                                    className="px-4 py-2 rounded-lg text-sm bg-accent text-white hover:opacity-90 transition-opacity"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Note Editor Modal */}
            {editingNote && (
                <NoteEditor
                    resource={editingNote}
                    repositoryId={repository.id}
                    onClose={() => setEditingNote(null)}
                    onSave={() => {
                        loadData();
                        setEditingNote(null);
                    }}
                    onDelete={() => {
                        loadData();
                        setEditingNote(null);
                    }}
                />
            )}

            {/* Node Detail Panel */}
            {selectedNodeId && (
                <NodeDetailPanel
                    nodeId={selectedNodeId}
                    title={resources.find(r => r.id === selectedNodeId)?.title || 'Unknown'}
                    type={resources.find(r => r.id === selectedNodeId)?.type || 'file'}
                    onClose={() => setSelectedNodeId(null)}
                    onMetadataChange={() => { /* maybe refresh graph if needed */ }}
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
