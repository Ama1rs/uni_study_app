import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Video, FileText, Plus, ExternalLink } from 'lucide-react';
import { KnowledgeGraph } from '../knowledge-graph/KnowledgeGraph';

interface Course {
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
}

interface Link {
    id: number;
    source_id: number;
    target_id: number;
}

interface CourseDetailProps {
    course: Course;
    onBack: () => void;
}

export function CourseDetail({ course, onBack }: CourseDetailProps) {
    const [activeTab, setActiveTab] = useState<'graph' | 'lectures' | 'resources'>('graph');

    // Data states
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [links, setLinks] = useState<Link[]>([]);

    // UI states
    const [showAddLecture, setShowAddLecture] = useState(false);
    const [newLectureTitle, setNewLectureTitle] = useState('');
    const [newLectureUrl, setNewLectureUrl] = useState('');

    const [showAddNote, setShowAddNote] = useState(false); // For text note
    const [noteContent, setNoteContent] = useState('');

    useEffect(() => {
        loadData();
    }, [course.id]);

    async function loadData() {
        await Promise.all([loadLectures(), loadResources(), loadLinks()]);
    }

    async function loadLectures() {
        try {
            const res = await invoke<Lecture[]>('get_lectures', { repository_id: course.id });
            setLectures(res);
        } catch (e) { console.error(e); }
    }

    async function loadResources() {
        try {
            const res = await invoke<Resource[]>('get_resources', { repository_id: course.id });
            setResources(res);
        } catch (e) { console.error(e); }
    }

    async function loadLinks() {
        try {
            // In a real app we might filter links by course, but for now we fetch all and filter client-side 
            // or assume the backend handles scoping if we implemented it. 
            // Our current backend get_links returns ALL links. 
            // We should ideally filter links where both source and target are in our resources list.
            const res = await invoke<Link[]>('get_links');
            setLinks(res);
        } catch (e) { console.error(e); }
    }

    // --- Actions ---

    async function addLecture() {
        if (!newLectureTitle || !newLectureUrl) return;
        let thumbnail = '';
        const ytMatch = newLectureUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (ytMatch && ytMatch[1]) {
            thumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
        }

        try {
            // Tauri commands expect camelCase arg names (repositoryId)
            await invoke('create_lecture', {
                repositoryId: course.id,
                title: newLectureTitle,
                url: newLectureUrl,
                thumbnail
            });
            setNewLectureTitle('');
            setNewLectureUrl('');
            setShowAddLecture(false);
            loadLectures();
        } catch (e) { console.error(e); }
    }

    async function importFile() {
        // In a real implementation, we would use the dialog API to select a file.
        // For this prototype, we'll simulate it or use a simple prompt if dialog isn't available.
        // Since we can't easily open a native dialog from this agent environment without user interaction,
        // we will assume the user provides a path string for now (dev mode).
        // Or better, we just use a text input for the path.
        const path = prompt("Enter full file path to import (e.g. C:\\Users\\...\\doc.pdf):");
        if (!path) return;

        try {
            await invoke('import_resource', {
                repositoryId: course.id,
                filePath: path
            });
            loadResources();
        } catch (e) {
            alert("Failed to import: " + e);
        }
    }

    async function addNote() {
        if (!noteContent) return;
        try {
            await invoke('process_text_to_nodes', {
                repositoryId: course.id,
                text: noteContent
            });
            setNoteContent('');
            setShowAddNote(false);
            loadResources();
            loadLinks(); // New nodes might be linked
        } catch (e) { console.error(e); }
    }

    // async function createLink(sourceId: number, targetId: number) {
    //     try {
    //         await invoke('create_link', { sourceId, targetId });
    //         loadLinks();
    //     } catch (e) { console.error(e); }
    // }

    // --- Graph Data Preparation ---
    const graphData = {
        nodes: resources.map(r => ({
            id: r.id.toString(),
            name: r.title,
            val: r.type === 'note' ? 2 : 1,
            color: r.type === 'pdf' ? '#ef4444' : r.type === 'note' ? '#eab308' : '#3b82f6',
            type: r.type
        })),
        links: links
            .filter(l => resources.some(r => r.id === l.source_id) && resources.some(r => r.id === l.target_id))
            .map(l => ({
                source: l.source_id.toString(),
                target: l.target_id.toString()
            }))
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{course.name}</h1>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{course.code} • {course.semester}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-black/20 p-1 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                    {(['graph', 'lectures', 'resources'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden relative">

                {/* GRAPH TAB */}
                {activeTab === 'graph' && (
                    <div className="h-full w-full rounded-2xl border overflow-hidden relative" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                        {resources.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                <p style={{ color: 'var(--text-secondary)' }} className="mb-4">No resources yet. Add notes or import files to see the graph.</p>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowAddNote(true)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm">Add Note</button>
                                    <button onClick={importFile} className="px-4 py-2 rounded-xl border border-gray-600 text-gray-300 text-sm">Import File</button>
                                </div>
                            </div>
                        ) : (
                            <KnowledgeGraph data={graphData} />
                        )}

                        {/* Floating Action Button for Graph */}
                        <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                            <button
                                onClick={() => setShowAddNote(true)}
                                className="p-3 rounded-full shadow-lg text-white hover:scale-105 transition-transform"
                                style={{ backgroundColor: 'var(--accent)' }}
                                title="Add Smart Note"
                            >
                                <FileText size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* LECTURES TAB */}
                {activeTab === 'lectures' && (
                    <div className="h-full overflow-y-auto pr-2">
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => setShowAddLecture(true)}
                                className="px-4 py-2 rounded-xl flex items-center gap-2 text-white transition-colors"
                                style={{ backgroundColor: 'var(--accent)' }}
                            >
                                <Plus size={18} /> Add Video
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {lectures.map(l => (
                                <div key={l.id} className="group rounded-xl border overflow-hidden hover:shadow-lg transition-all" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                                    <div className="aspect-video bg-black relative cursor-pointer" onClick={() => window.open(l.url, '_blank')}>
                                        {l.thumbnail ? (
                                            <img src={l.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><Video className="text-gray-600" /></div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                            <ExternalLink className="text-white" />
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <h3 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{l.title}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* RESOURCES TAB */}
                {activeTab === 'resources' && (
                    <div className="h-full overflow-y-auto pr-2">
                        <div className="flex justify-end mb-4 gap-2">
                            <button onClick={importFile} className="px-4 py-2 rounded-xl border flex items-center gap-2 transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                                Import File
                            </button>
                            <button onClick={() => setShowAddNote(true)} className="px-4 py-2 rounded-xl flex items-center gap-2 text-white transition-colors" style={{ backgroundColor: 'var(--accent)' }}>
                                <Plus size={18} /> Add Note
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {resources.map(r => (
                                <div key={r.id} className="p-4 rounded-xl border flex items-center justify-between hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${r.type === 'pdf' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                            {r.type === 'pdf' ? <FileText size={18} /> : <FileText size={18} />}
                                        </div>
                                        <div>
                                            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.title}</h3>
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.type} • {r.tags || 'No tags'}</p>
                                        </div>
                                    </div>
                                    {r.path && (
                                        <button onClick={() => alert(`Opening file: ${r.path}`)} className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>
                                            Open
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS */}
            {showAddLecture && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="p-6 rounded-2xl w-96 shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Add Video</h3>
                        <input className="w-full px-4 py-2 rounded-lg mb-3 outline-none border bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} placeholder="Title" value={newLectureTitle} onChange={e => setNewLectureTitle(e.target.value)} autoFocus />
                        <input className="w-full px-4 py-2 rounded-lg mb-4 outline-none border bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} placeholder="YouTube URL" value={newLectureUrl} onChange={e => setNewLectureUrl(e.target.value)} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAddLecture(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
                            <button onClick={addLecture} className="px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: 'var(--accent)' }}>Add</button>
                        </div>
                    </div>
                </div>
            )}

            {showAddNote && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="p-6 rounded-2xl w-[600px] shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Add Smart Note</h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Paste text below. Double newlines will split the text into separate linked nodes.</p>
                        <textarea
                            className="w-full h-64 px-4 py-3 rounded-xl mb-4 outline-none border bg-transparent resize-none"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            placeholder="Enter your notes here..."
                            value={noteContent}
                            onChange={e => setNoteContent(e.target.value)}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAddNote(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
                            <button onClick={addNote} className="px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: 'var(--accent)' }}>Process & Add</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
