import { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as openFile } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
import {
    ArrowLeft,
    Video,
    FileText,
    Plus,
    Upload,
    Trash2,
    Play,
    LayoutTemplate,
    Network,
    Grid as GridIcon,
    Edit
} from 'lucide-react';
import { KnowledgeGraph } from './KnowledgeGraph';
import { VideoPlayerModal } from './VideoPlayerModal';
import { YouTubeLinks } from './YouTubeLinks';
import { NoteEditor } from './NoteEditor';

interface Repository {
    id: number;
    name: string;
    code?: string;
    semester?: string;
    description?: string;
}

interface Lecture {
    id: number;
    repository_id: number;
    title: string;
    url: string;
    thumbnail?: string;
}

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

interface Link {
    id: number;
    source_id: number;
    target_id: number;
}

interface RepositoryDetailProps {
    repository: Repository;
    onBack: () => void;
}

export function RepositoryDetail({ repository, onBack }: RepositoryDetailProps) {
    const [activeView, setActiveView] = useState<'main' | 'videos'>('main');
    const [viewMode, setViewMode] = useState<'graph' | 'grid'>('grid');

    // Data states
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [links, setLinks] = useState<Link[]>([]);

    // UI states
    const [showAddLecture, setShowAddLecture] = useState(false);
    const [newLectureTitle, setNewLectureTitle] = useState('');
    const [newLectureUrl, setNewLectureUrl] = useState('');

    const [showAddNote, setShowAddNote] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [noteContent, setNoteContent] = useState('');

    const [isImporting, setIsImporting] = useState(false);
    const [playingVideo, setPlayingVideo] = useState<{ url: string, title: string } | null>(null);
    const [editingNote, setEditingNote] = useState<Resource | null>(null);

    // Linking UI
    const [linkSource, setLinkSource] = useState<{ id: string, title: string } | null>(null);
    const [linkTargetId, setLinkTargetId] = useState<string>('');

    useEffect(() => {
        loadData();
    }, [repository.id]);

    async function loadData() {
        await Promise.all([loadLectures(), loadResources(), loadLinks()]);
    }

    async function loadLectures() {
        try {
            const res = await invoke<Lecture[]>('get_lectures', { repository_id: repository.id });
            setLectures(res);
        } catch (e) { console.error(e); }
    }

    async function loadResources() {
        try {
            const res = await invoke<Resource[]>('get_resources', { repository_id: repository.id });
            setResources(res);
        } catch (e) { console.error(e); }
    }

    async function loadLinks() {
        try {
            const res = await invoke<Link[]>('get_links');
            setLinks(res);
        } catch (e) { console.error(e); }
    }

    // Unified Data for Graph/Grid
    const allItems = useMemo(() => [
        ...lectures.map(l => ({
            id: `lecture-${l.id}`,
            dbId: l.id,
            title: l.title,
            type: 'video',
            path: l.url,
            thumbnail: l.thumbnail,
            date: null
        })),
        ...resources.map(r => ({
            id: `resource-${r.id}`,
            dbId: r.id,
            title: r.title,
            type: r.type,
            path: r.path,
            thumbnail: r.type === 'video' ? r.content : null,
            date: r.created_at
        }))
    ], [lectures, resources]);

    // Graph Data
    const graphData = useMemo(() => {
        const nodeMap = new Map(allItems.map(i => [i.id, i]));
        return {
            nodes: allItems.map(item => ({
                id: item.id,
                name: item.title,
                val: item.type === 'note' ? 2 : (item.type === 'video' ? 3 : 1),
                color: item.type === 'pdf' ? '#ef4444' : item.type === 'note' ? '#eab308' : (item.type === 'video' ? '#a855f7' : '#3b82f6'),
                type: item.type
            })),
            links: links
                .map(l => ({
                    source: `resource-${l.source_id}`,
                    target: `resource-${l.target_id}`
                }))
                .filter(l => nodeMap.has(l.source as string) && nodeMap.has(l.target as string))
        };
    }, [allItems, links]);

    // --- Actions ---

    async function handleItemClick(item: typeof allItems[0]) {
        if (item.type === 'video' && item.path) {
            setPlayingVideo({ url: item.path, title: item.title });
        } else if (item.path) {
            console.log("Opening:", item.path);
            try {
                await openPath(item.path);
            } catch (e) {
                console.error("Failed to open file:", e);
                alert(`Failed to open file: ${e}`);
            }
        }
    }

    async function addLecture() {
        if (!newLectureTitle || !newLectureUrl) return;
        let thumbnail = '';
        const ytMatch = newLectureUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (ytMatch && ytMatch[1]) {
            thumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
        }

        try {
            await invoke('create_resource', {
                repositoryId: repository.id,
                title: newLectureTitle,
                type: 'video', // Unified type
                path: newLectureUrl,
                content: thumbnail,
                tags: 'video'
            });
            setNewLectureTitle('');
            setNewLectureUrl('');
            setShowAddLecture(false);
            loadResources();
        } catch (e: any) {
            console.error(e);
            alert(`Failed to add video: ${e.toString()}`);
        }
    }

    async function importFile() {
        try {
            setIsImporting(true);
            const selected = await openFile({
                multiple: false,
                filters: [{
                    name: 'Documents',
                    extensions: ['pdf', 'txt', 'md', 'doc', 'docx', 'ppt', 'pptx']
                }]
            });

            if (selected && typeof selected === 'string') {
                await invoke('import_resource', {
                    repositoryId: repository.id,
                    filePath: selected
                });
                loadResources();
            }
        } catch (e: any) {
            console.error("Failed to import:", e);
            alert(`Failed to import file: ${e.toString()}`);
        } finally {
            setIsImporting(false);
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
            loadResources();
            loadLinks();
        } catch (e: any) {
            console.error(e);
            alert(`Failed to add note: ${e.toString()}`);
        }
    }

    async function createLink() {
        if (!linkSource || !linkTargetId) return;
        try {
            const parseId = (id: string) => {
                const [type, val] = id.split('-');
                return { type, id: parseInt(val) };
            };
            const source = parseId(linkSource.id);
            const target = parseId(linkTargetId);

            if (source.type !== 'resource' || target.type !== 'resource') {
                alert("Only 'Resources' can be linked currently.");
                return;
            }

            await invoke('create_link', {
                sourceId: source.id,
                targetId: target.id
            });

            setLinkSource(null);
            setLinkTargetId('');
            loadLinks();
        } catch (e: any) {
            console.error(e);
            alert(`Failed to link: ${e.toString()}`);
        }
    }

    async function deleteItem(e: React.MouseEvent, item: typeof allItems[0]) {
        e.stopPropagation();
        if (!confirm(`Delete this ${item.type}?`)) return;
        try {
            if (item.id.startsWith('lecture-')) {
                await invoke('delete_lecture', { id: item.dbId });
                loadLectures();
            } else {
                await invoke('delete_resource', { id: item.dbId });
                loadResources();
            }
        } catch (e: any) {
            console.error(e);
            alert(`Failed to delete: ${e.toString()}`);
        }
    }

    const HEADER_HEIGHT = 80;

    // If videos view is active, show YouTubeLinks component
    if (activeView === 'videos') {
        return (
            <div className="h-full w-full relative">
                <YouTubeLinks repository={repository} onBack={() => setActiveView('main')} />
            </div>
        );
    }

    return (
        <div className="h-full w-full absolute inset-0 relative bg-bg-base">
            {/* Fixed Header */}
            <div
                className="absolute top-0 left-0 right-0 z-30 bg-bg-base border-b border-white/5"
                style={{ height: HEADER_HEIGHT }}
            >
                <div className="flex items-center justify-between h-full px-6">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5 transition-colors text-text-secondary hover:text-text-primary">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary">{repository.name}</h1>
                            <p className="text-sm text-text-secondary">{repository.code} • {repository.semester}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-bg-surface p-1 rounded-xl border border-border">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                <GridIcon size={16} /> <span className="hidden sm:inline">Grid</span>
                            </button>
                            <button
                                onClick={() => setViewMode('graph')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'graph' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                <Network size={16} /> <span className="hidden sm:inline">Graph</span>
                            </button>
                        </div>
                        <div className="h-6 w-px bg-border" />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveView('videos')}
                                className="px-4 py-2 rounded-xl border border-border hover:bg-white/5 transition-colors text-text-primary flex items-center gap-2"
                                title="YouTube Videos"
                            >
                                <Video size={18} />
                                <span className="text-sm hidden sm:inline">Videos</span>
                            </button>
                            <button onClick={() => setShowAddLecture(true)} className="p-2.5 rounded-xl border border-border hover:bg-white/5 transition-colors text-text-primary" title="Add Video"><Video size={20} /></button>

                            {/* Explicit Import Button */}
                            <button onClick={importFile} disabled={isImporting} className="hidden md:flex px-4 py-2.5 rounded-xl border border-border hover:bg-white/5 transition-colors disabled:opacity-50 text-text-primary items-center gap-2 font-medium" title="Import File">
                                <Upload size={18} /> Import
                            </button>
                            <button onClick={importFile} disabled={isImporting} className="md:hidden p-2.5 rounded-xl border border-border hover:bg-white/5 transition-colors disabled:opacity-50 text-text-primary" title="Import File">
                                <Upload size={20} />
                            </button>

                            {/* Templates Button */}
                            <button onClick={() => setShowTemplates(true)} className="p-2.5 rounded-xl border border-border hover:bg-white/5 transition-colors text-text-primary" title="Templates"><LayoutTemplate size={20} /></button>

                            <button onClick={() => setShowAddNote(true)} className="px-4 py-2.5 rounded-xl flex items-center gap-2 text-white transition-colors hover:opacity-90 bg-accent font-medium shadow-lg shadow-accent/20"><Plus size={20} /> Add Note</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div
                className="absolute left-0 right-0 bottom-0 overflow-hidden relative"
                style={{ top: HEADER_HEIGHT }}
            >
                {allItems.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-20 h-20 rounded-full bg-bg-surface flex items-center justify-center mb-6 border border-border"><FileText size={40} className="text-text-tertiary" /></div>
                        <h3 className="text-xl font-bold mb-2 text-text-primary">Empty Repository</h3>
                        <p className="text-text-secondary max-w-sm">Your repository is empty. Start by capturing a thought, importing a document, or saving a lecture.</p>
                    </div>
                ) : (
                    <>
                        {/* Persistent Graph View - Absolute positioned to prevent layout shifts */}
                        <div className="absolute inset-0 w-full h-full" style={{ display: viewMode === 'graph' ? 'block' : 'none' }}>
                            <KnowledgeGraph data={graphData} />
                        </div>

                        {/* Persistent Grid View - Absolute positioned to prevent layout shifts */}
                        <div className="absolute inset-0 w-full h-full overflow-y-scroll p-6" style={{ display: viewMode === 'grid' ? 'block' : 'none' }}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                                {allItems.map(item => (
                                    <div key={item.id} className="group rounded-2xl overflow-hidden cursor-pointer flex flex-col relative border border-border/50 bg-bg-surface/30 hover:bg-bg-surface hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300 transform hover:-translate-y-1">
                                        <div
                                            className="aspect-video bg-black/40 relative flex items-center justify-center overflow-hidden"
                                            onClick={() => {
                                                if (item.type === 'note') {
                                                    const noteResource = resources.find(r => r.id === item.dbId);
                                                    if (noteResource) setEditingNote(noteResource);
                                                } else {
                                                    handleItemClick(item);
                                                }
                                            }}
                                        >
                                            {item.type === 'video' ? (
                                                item.thumbnail ? <img src={item.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" alt={item.title} /> : <div className="flex flex-col items-center gap-2 text-purple-400"><Video size={32} strokeWidth={1.5} /></div>
                                            ) : (
                                                <div className={`flex flex-col items-center gap-2 ${item.type === 'pdf' ? 'text-red-400' : 'text-yellow-400'}`}><FileText size={32} strokeWidth={1.5} /></div>
                                            )}
                                            {item.type === 'video' && <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors"><div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg"><Play size={20} className="text-white fill-white ml-1" /></div></div>}

                                            {/* Action Buttons */}
                                            <div className="absolute top-3 right-3 flex gap-2 z-10">
                                                {item.type === 'note' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const noteResource = resources.find(r => r.id === item.dbId);
                                                            if (noteResource) setEditingNote(noteResource);
                                                        }}
                                                        className="p-2 rounded-xl bg-black/60 text-white/70 hover:text-accent hover:bg-black/80 transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100"
                                                        title="Edit Note"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                <button onClick={(e) => deleteItem(e, item)} className="p-2 rounded-xl bg-black/60 text-white/70 hover:text-red-400 hover:bg-black/80 transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                            </div>
                                        </div>

                                        <div className="p-4 relative">
                                            <h3 className="font-semibold text-text-primary line-clamp-2 leading-relaxed mb-8 group-hover:text-accent transition-colors">{item.title}</h3>
                                            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${item.type === 'video' ? 'bg-purple-500/10 text-purple-400' : item.type === 'pdf' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{item.type}</span>
                                                <button onClick={(e) => { e.stopPropagation(); setLinkSource({ id: item.id, title: item.title }); }} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-accent transition-all" title="Link to...">
                                                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center"><div className="w-1 h-1 bg-current rounded-full" /></div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            {playingVideo && <VideoPlayerModal url={playingVideo.url} title={playingVideo.title} onClose={() => setPlayingVideo(null)} />}

            {showAddLecture && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="p-6 rounded-2xl w-96 shadow-xl bg-bg-surface border border-border">
                        <h3 className="text-lg font-bold mb-4 text-text-primary">Add Video</h3>
                        <input className="w-full px-4 py-2 rounded-lg mb-3 outline-none border border-border bg-transparent text-text-primary focus:border-accent transition-colors" placeholder="Title" value={newLectureTitle} onChange={e => setNewLectureTitle(e.target.value)} autoFocus />
                        <input className="w-full px-4 py-2 rounded-lg mb-4 outline-none border border-border bg-transparent text-text-primary focus:border-accent transition-colors" placeholder="YouTube URL" value={newLectureUrl} onChange={e => setNewLectureUrl(e.target.value)} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAddLecture(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                            <button onClick={addLecture} className="px-4 py-2 rounded-lg text-sm text-white bg-accent hover:opacity-90 transition-opacity">Add</button>
                        </div>
                    </div>
                </div>
            )}

            {showAddNote && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="p-6 rounded-2xl w-[600px] shadow-xl bg-bg-surface border border-border">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-text-primary">Add Smart Note</h3>

                            {/* Short Template Select for convenience if user didn't use the Template Button */}
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

            {/* Linking Modal */}
            {linkSource && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="p-6 rounded-2xl w-96 shadow-xl bg-bg-surface border border-border">
                        <h3 className="text-lg font-bold mb-4 text-text-primary">Link "{linkSource.title}" to...</h3>
                        <p className="text-sm text-text-secondary mb-4">Select another note or resource to create a connection.</p>
                        <div className="max-h-60 overflow-y-auto mb-4 space-y-2 pr-2">
                            {allItems.filter(i => i.id !== linkSource.id && i.id.startsWith('resource-')).map(item => (
                                <button key={item.id} onClick={() => setLinkTargetId(item.id)} className={`w-full text-left p-3 rounded-xl border transition-all ${linkTargetId === item.id ? 'bg-accent/20 border-accent text-accent' : 'bg-white/5 border-transparent hover:bg-white/10 text-text-primary'}`}>
                                    <div className="font-medium truncate">{item.title}</div>
                                    <div className="text-xs text-text-secondary uppercase">{item.type}</div>
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => { setLinkSource(null); setLinkTargetId(''); }} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                            <button onClick={createLink} disabled={!linkTargetId} className="px-4 py-2 rounded-lg text-sm text-white bg-accent hover:opacity-90 transition-opacity disabled:opacity-50">Connect</button>
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
        </div>
    );
}
