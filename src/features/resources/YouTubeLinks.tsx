import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Video, Trash2, Play, Grid3x3, List as ListIcon, Plus, AlertCircle, RefreshCcw, Youtube, Folder, ChevronRight, X } from 'lucide-react';
import { VideoPlayerModal } from './VideoPlayerModal';

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
    group_name?: string;
    is_completed: boolean;
    order_index?: number;
}

interface YouTubeLinksProps {
    repository: Repository;
    onBack: () => void;
}

export function YouTubeLinks({ repository, onBack }: YouTubeLinksProps) {
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showThumbnails] = useState(true);
    const [showAddVideo, setShowAddVideo] = useState(false);
    const [newVideoTitle, setNewVideoTitle] = useState('');
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [showImportPlaylist, setShowImportPlaylist] = useState(false);
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [folderName, setFolderName] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [playingVideo, setPlayingVideo] = useState<{ url: string, title: string } | null>(null);
    const [coursePlayer, setCoursePlayer] = useState<{ group: string, videos: Lecture[], startIndex: number } | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

    useEffect(() => {
        void loadLectures();
    }, [repository.id]);

    async function loadLectures() {
        setLoading(true);
        setError(null);
        try {
            const lectureRes = await invoke<Lecture[]>('get_lectures', { repositoryId: repository.id });
            lectureRes.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
            setLectures(lectureRes);
        } catch (e) {
            console.error('Failed to load videos:', e);
            setError('Could not load videos. Please retry.');
            setLectures([]);
        } finally {
            setLoading(false);
        }
    }

    async function addVideo() {
        if (!newVideoTitle || !newVideoUrl) return;
        const repositoryId = Number(repository.id);
        let thumbnail = '';
        const ytMatch = newVideoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (ytMatch && ytMatch[1]) thumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;

        try {
            await invoke('create_lecture', {
                repositoryId: repositoryId,
                title: newVideoTitle,
                url: newVideoUrl,
                thumbnail: thumbnail || null,
                groupName: selectedGroup !== 'Individual Videos' ? selectedGroup : null,
                orderIndex: lectures.length
            });
            setNewVideoTitle(''); setNewVideoUrl(''); setShowAddVideo(false);
            void loadLectures();
        } catch (e: any) { alert(`Failed: ${e.toString()}`); }
    }

    async function importPlaylist() {
        if (!playlistUrl) return;
        try {
            setIsImporting(true);
            await invoke('import_youtube_playlist', {
                repositoryId: repository.id,
                url: playlistUrl,
                folderName: folderName || null
            });
            setPlaylistUrl(''); setFolderName(''); setShowImportPlaylist(false);
            void loadLectures();
        } catch (e: any) { alert(`Failed: ${e.toString()}`); } finally { setIsImporting(false); }
    }

    async function deleteVideo(e: React.MouseEvent, id: number) {
        e.stopPropagation();
        if (!confirm('Delete video?')) return;
        try { await invoke('delete_lecture', { id }); void loadLectures(); } catch (e: any) { alert(e.toString()); }
    }

    async function toggleLectureComplete(id: number, completed: boolean) {
        try {
            await invoke('update_lecture_progress', { id, completed });

            // Optimistic Update for main list
            setLectures(prev => prev.map(l => l.id === id ? { ...l, is_completed: completed } : l));

            // Sync with course player if active
            if (coursePlayer) {
                setCoursePlayer(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        videos: prev.videos.map(v => v.id === id ? { ...v, is_completed: completed } : v)
                    };
                });
            }
        } catch (e) {
            console.error('Failed to update lecture status:', e);
        }
    }

    const groups = lectures.reduce((acc, lecture) => {
        const group = lecture.group_name || 'Individual Videos';
        if (!acc[group]) acc[group] = [];
        acc[group].push(lecture);
        return acc;
    }, {} as Record<string, Lecture[]>);

    const HEADER_HEIGHT = 80;

    return (
        <div className="h-full w-full bg-bg-base flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="flex-shrink-0 z-30 bg-bg-base border-b border-white/5" style={{ height: HEADER_HEIGHT }}>
                <div className="flex items-center justify-between h-full px-6">
                    <div className="flex items-center gap-4">
                        <button onClick={selectedGroup ? () => setSelectedGroup(null) : onBack} className="p-2 rounded-xl hover:bg-white/5 transition-colors text-text-secondary hover:text-text-primary">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-text-primary tracking-tight">{repository.name}</h1>
                                {selectedGroup && (
                                    <>
                                        <ChevronRight size={18} className="text-text-tertiary" />
                                        <h2 className="text-2xl font-bold text-accent">{selectedGroup}</h2>
                                    </>
                                )}
                            </div>
                            <p className="text-sm text-text-secondary">
                                {selectedGroup ? `${groups[selectedGroup]?.length || 0} Lessons` : `${lectures.length} Total Videos`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Options */}
                        <div className="flex items-center bg-bg-surface border border-border rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
                                title="Grid View"
                            >
                                <Grid3x3 size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
                                title="List View"
                            >
                                <ListIcon size={16} />
                            </button>
                        </div>

                        <div className="h-6 w-px bg-border mx-1" />

                        {/* Actions */}
                        <button
                            onClick={loadLectures}
                            className="p-2.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-colors border border-transparent"
                            title="Refresh"
                        >
                            <RefreshCcw size={18} />
                        </button>

                        <button
                            onClick={() => setShowImportPlaylist(true)}
                            className="px-4 py-2 rounded-lg flex items-center gap-2 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors font-medium text-sm border border-border"
                        >
                            <Youtube size={16} className="text-red-500" />
                            <span>Import Playlist</span>
                        </button>

                        <button
                            onClick={() => setShowAddVideo(true)}
                            className="px-4 py-2 rounded-lg flex items-center gap-2 bg-accent text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-sm"
                        >
                            <Plus size={16} />
                            <span>Add Video</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 min-h-0 overflow-auto">
                {error && <div className="p-12 text-center text-red-400 font-medium">{error}</div>}

                {!error && !loading && (
                    <div className="p-8 max-w-[1600px] mx-auto">
                        {!selectedGroup ? (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Playlists / Folders */}
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <Folder size={20} className="text-accent" />
                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-text-tertiary">Learning Paths</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {Object.keys(groups).filter(g => g !== 'Individual Videos').map(groupName => (
                                            <FolderCard
                                                key={groupName}
                                                name={groupName}
                                                lectures={groups[groupName]}
                                                onClick={() => setSelectedGroup(groupName)}
                                                onPlay={() => setCoursePlayer({ group: groupName, videos: groups[groupName], startIndex: 0 })}
                                            />
                                        ))}
                                        <button
                                            onClick={() => setShowImportPlaylist(true)}
                                            className="group flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-border/50 hover:border-accent/40 hover:bg-accent/5 transition-all text-text-tertiary hover:text-accent"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-bg-surface flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Plus size={24} />
                                            </div>
                                            <span className="font-bold text-sm">New Learning Path</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Individual Videos */}
                                {groups['Individual Videos'] && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <Video size={20} className="text-purple-400" />
                                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-text-tertiary">Quick Access Videos</h3>
                                        </div>
                                        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                                            {groups['Individual Videos'].map(lecture => (
                                                <VideoCard
                                                    key={lecture.id}
                                                    lecture={lecture}
                                                    showThumbnails={showThumbnails}
                                                    viewMode={viewMode}
                                                    onClick={() => setPlayingVideo({ url: lecture.url, title: lecture.title })}
                                                    onDelete={(e) => deleteVideo(e, lecture.id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="animate-in fade-in zoom-in-95 duration-300">
                                {/* Folder Content View */}
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-2xl bg-accent text-white shadow-lg shadow-accent/20">
                                            <Folder size={24} />
                                        </div>
                                        <div>
                                            <h1 className="text-3xl font-black text-text-primary tracking-tight">{selectedGroup}</h1>
                                            <p className="text-sm text-text-secondary font-medium">
                                                {groups[selectedGroup].length} Lessons • {Math.round((groups[selectedGroup].filter(l => l.is_completed).length / groups[selectedGroup].length) * 100)}% Complete
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setCoursePlayer({ group: selectedGroup, videos: groups[selectedGroup], startIndex: 0 })}
                                        className="px-8 py-4 rounded-2xl bg-accent text-white font-black text-lg shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                                    >
                                        <Play size={20} className="fill-white" />
                                        RESUME LEARNING
                                    </button>
                                </div>

                                <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                                    {groups[selectedGroup].map((lecture, idx) => (
                                        <VideoCard
                                            key={lecture.id}
                                            lecture={lecture}
                                            showThumbnails={showThumbnails}
                                            viewMode={viewMode}
                                            onClick={() => setCoursePlayer({ group: selectedGroup, videos: groups[selectedGroup], startIndex: idx })}
                                            onDelete={(e) => deleteVideo(e, lecture.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {loading && <div className="p-12 text-center text-text-tertiary">Scanning repository…</div>}
            </div>

            {/* Modals & Player */}
            {showAddVideo && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] backdrop-blur-md">
                    <div className="p-8 rounded-[2rem] w-[450px] bg-bg-surface border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black mb-6 text-text-primary tracking-tight">Add Quick Video</h3>
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary mb-2 block">Video Title</label>
                                <input className="w-full px-5 py-4 rounded-2xl bg-bg-base border border-white/5 focus:border-accent outline-none text-text-primary transition-all font-medium" placeholder="Understanding Quantum Physics..." value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} autoFocus />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary mb-2 block">YouTube URL</label>
                                <input className="w-full px-5 py-4 rounded-2xl bg-bg-base border border-white/5 focus:border-accent outline-none text-text-primary transition-all font-medium" placeholder="https://youtube.com/watch?v=..." value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowAddVideo(false)} className="flex-1 px-6 py-4 rounded-2xl border border-white/10 text-text-secondary font-bold hover:bg-white/5 transition-all">Discard</button>
                            <button onClick={addVideo} className="flex-1 px-6 py-4 rounded-2xl bg-accent text-white font-bold shadow-lg shadow-accent/20 hover:opacity-90 transition-all">Add to List</button>
                        </div>
                    </div>
                </div>
            )}

            {showImportPlaylist && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] backdrop-blur-md">
                    <div className="p-8 rounded-[2.5rem] w-[500px] bg-bg-surface border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-8 bg-red-500/10 p-6 rounded-3xl border border-red-500/20">
                            <Youtube size={32} className="text-red-500" />
                            <div>
                                <h3 className="text-xl font-black text-text-primary tracking-tight">Bulk Import Course</h3>
                                <p className="text-xs text-text-secondary font-medium">Sync an entire YouTube playlist as a structured course.</p>
                            </div>
                        </div>
                        <div className="space-y-5 mb-8">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary mb-2 block">Playlist Link</label>
                                <input className="w-full px-5 py-4 rounded-2xl bg-bg-base border border-white/5 focus:border-red-500 outline-none text-text-primary transition-all font-medium" placeholder="Paste playlist URL here..." value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary mb-2 block">Folder Name (Optional)</label>
                                <input className="w-full px-5 py-4 rounded-2xl bg-bg-base border border-white/5 focus:border-red-500 outline-none text-text-primary transition-all font-medium" placeholder="Default: YouTube Title" value={folderName} onChange={e => setFolderName(e.target.value)} />
                            </div>
                        </div>
                        {isImporting && (
                            <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-2xl mb-6 animate-pulse">
                                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs font-black text-accent uppercase tracking-widest">Processing Playlist Data...</span>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setShowImportPlaylist(false)} disabled={isImporting} className="flex-1 px-6 py-4 rounded-2xl border border-white/10 text-text-secondary font-bold hover:bg-white/5 transition-all">Cancel</button>
                            <button onClick={importPlaylist} disabled={isImporting || !playlistUrl} className="flex-1 px-6 py-4 rounded-2xl bg-red-600 text-white font-bold shadow-xl shadow-red-600/30 hover:bg-red-500 transition-all">Start Sync</button>
                        </div>
                    </div>
                </div>
            )}

            {coursePlayer && (
                <div className="absolute inset-0 z-[500]">
                    <CourseLecturesPlayer
                        groupName={coursePlayer.group}
                        videos={coursePlayer.videos}
                        startIndex={coursePlayer.startIndex}
                        onToggle={(id, done) => toggleLectureComplete(id, done)}
                        onClose={() => { setCoursePlayer(null); void loadLectures(); }}
                    />
                </div>
            )}

            {playingVideo && (
                <VideoPlayerModal url={playingVideo.url} title={playingVideo.title} onClose={() => setPlayingVideo(null)} />
            )}
        </div>
    );
}

function FolderCard({ name, lectures, onClick, onPlay }: { name: string, lectures: Lecture[], onClick: () => void, onPlay: (e: React.MouseEvent) => void }) {
    const completed = lectures.filter(l => l.is_completed).length;
    const progress = Math.round((completed / lectures.length) * 100);

    return (
        <div
            onClick={onClick}
            className="group relative h-64 cursor-pointer"
        >
            {/* Folder Stack Effect */}
            <div className="absolute inset-x-4 -top-2 h-8 rounded-t-3xl bg-bg-surface border border-white/5 opacity-40 group-hover:translate-y-[-4px] transition-transform" />
            <div className="absolute inset-x-2 -top-1 h-8 rounded-t-3xl bg-bg-surface border border-white/5 opacity-60 group-hover:translate-y-[-2px] transition-transform" />

            <div className="absolute inset-0 bg-bg-surface border border-white/10 rounded-[2.5rem] p-6 flex flex-col justify-between shadow-xl group-hover:border-accent/40 group-hover:shadow-accent/5 transition-all">
                <div className="flex items-start justify-between">
                    <div className="p-4 rounded-2xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white transition-all duration-300">
                        <Folder size={28} />
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onPlay(e); }}
                        className="w-12 h-12 rounded-full border border-white/5 bg-white/5 flex items-center justify-center hover:bg-accent hover:text-white transition-all"
                    >
                        <Play size={20} className="fill-current ml-1" />
                    </button>
                </div>

                <div>
                    <h3 className="text-xl font-black text-text-primary tracking-tight mb-2 group-hover:text-accent transition-colors line-clamp-2">{name}</h3>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-accent transition-all duration-700" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{progress}%</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-text-tertiary">
                        <span className="text-[10px] font-black uppercase tracking-widest">{lectures.length} Lessons</span>
                        <div className="flex -space-x-2">
                            {lectures.slice(0, 3).map((v, i) => (
                                <div key={i} className="w-5 h-5 rounded-full border-2 border-bg-surface bg-bg-base overflow-hidden">
                                    {v.thumbnail ? <img src={v.thumbnail} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-accent/20" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VideoCard({ lecture, showThumbnails, viewMode, onClick, onDelete }: {
    lecture: Lecture, showThumbnails: boolean, viewMode: 'grid' | 'list', onClick: () => void, onDelete: (e: React.MouseEvent) => void
}) {
    if (viewMode === 'list') {
        return (
            <div className="group rounded-2xl border border-white/5 bg-bg-surface/30 hover:bg-bg-surface hover:border-accent/40 transition-all cursor-pointer p-3 flex items-center gap-4 group/item" onClick={onClick}>
                {showThumbnails && lecture.thumbnail ? (
                    <div className="w-28 h-16 rounded-xl overflow-hidden bg-black flex-shrink-0 relative">
                        <img src={lecture.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={14} className="text-white fill-white" />
                        </div>
                    </div>
                ) : (
                    <div className="w-28 h-16 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <Video size={18} className="text-purple-400" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-sm truncate ${lecture.is_completed ? 'text-text-secondary line-through' : 'text-text-primary'}`}>{lecture.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        {lecture.is_completed && <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Completed</span>}
                        <span className="text-[10px] text-text-tertiary">Lesson</span>
                    </div>
                </div>
                <button onClick={onDelete} className="p-2 text-text-tertiary hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-red-400/10 rounded-xl"><Trash2 size={16} /></button>
            </div>
        );
    }
    return (
        <div className="group flex flex-col bg-bg-surface/30 border border-white/5 rounded-3xl overflow-hidden hover:border-accent/40 transition-all hover:shadow-2xl hover:shadow-accent/5" onClick={onClick}>
            <div className="aspect-video relative overflow-hidden bg-black">
                {lecture.thumbnail && <img src={lecture.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />}
                <div className="absolute inset-0 flex items-center justify-center cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all">
                        <Play size={20} className="text-white fill-white ml-0.5" />
                    </div>
                </div>
                {lecture.is_completed && (
                    <div className="absolute top-3 left-3 px-3 py-1 bg-green-500 text-white text-[10px] font-black rounded-xl shadow-lg flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-white animate-pulse" /> COMPLETED
                    </div>
                )}
                <button onClick={onDelete} className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-xl text-white/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
                <h3 className="font-bold text-sm leading-snug line-clamp-2 text-text-primary group-hover:text-accent transition-colors">{lecture.title}</h3>
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 opacity-60">
                        <Youtube size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">YouTube</span>
                    </div>
                    <ChevronRight size={14} className="text-text-tertiary opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all" />
                </div>
            </div>
        </div>
    );
}

function CourseLecturesPlayer({ groupName, videos, startIndex, onToggle, onClose }: {
    groupName: string,
    videos: Lecture[],
    startIndex: number,
    onToggle: (id: number, done: boolean) => Promise<void>,
    onClose: () => void
}) {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const currentVideo = videos[currentIndex];

    const handleToggleComplete = async () => {
        const nextState = !currentVideo.is_completed;
        await onToggle(currentVideo.id, nextState);
        if (nextState && currentIndex < videos.length - 1) {
            setTimeout(() => setCurrentIndex(currentIndex + 1), 1000);
        }
    };

    const yid = currentVideo.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];

    return (
        <div className="absolute inset-0 bg-bg-base z-[500] flex flex-col h-full w-full overflow-hidden">
            <div className="h-20 border-b border-white/5 bg-bg-surface px-8 flex items-center justify-between z-50">
                <div className="flex items-center gap-6">
                    <button onClick={onClose} className="p-3 rounded-2xl hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-all"><ArrowLeft size={24} /></button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Folder size={16} className="text-accent" />
                            <h2 className="font-black text-sm tracking-tight text-text-primary">{groupName}</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-accent transition-all duration-500" style={{ width: `${(videos.filter(v => v.is_completed).length / videos.length) * 100}%` }} />
                            </div>
                            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{videos.filter(v => v.is_completed).length}/{videos.length} DONE</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleToggleComplete} className={`px-6 py-3 rounded-2xl text-xs font-black tracking-widest transition-all ${currentVideo.is_completed ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-white/5 hover:bg-white/10 text-text-primary border border-white/5'}`}>
                        {currentVideo.is_completed ? 'LESSON COMPLETED' : 'MARK AS DONE'}
                    </button>
                    <button onClick={onClose} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-text-tertiary hover:text-text-primary"><X size={20} /></button>
                </div>
            </div>
            <div className="flex-1 flex min-h-0 bg-bg-base">
                <div className="flex-1 bg-black flex flex-col shadow-2xl relative z-10">
                    <div className="flex-1">
                        {yid ? (
                            <iframe
                                src={`https://www.youtube.com/embed/${yid}?autoplay=1&modestbranding=1&rel=0`}
                                className="w-full h-full border-0"
                                allow="autoplay; fullscreen; picture-in-picture"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center flex-col gap-4 text-text-tertiary bg-bg-surface/10">
                                <AlertCircle size={48} strokeWidth={1} />
                                <span className="font-bold">Streaming Unavailable</span>
                            </div>
                        )}
                    </div>
                    <div className="p-8 bg-bg-surface border-t border-white/5 flex items-center justify-between">
                        <div className="max-w-2xl">
                            <h1 className="text-2xl font-black text-white tracking-tight leading-tight line-clamp-1">{currentVideo.title}</h1>
                            <p className="text-sm text-text-tertiary font-medium mt-1">Lesson {currentIndex + 1} of {videos.length}</p>
                        </div>
                        <div className="flex gap-3">
                            <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(currentIndex - 1)} className="px-6 py-4 border border-white/10 rounded-2xl font-bold hover:bg-white/10 disabled:opacity-20 transition-all text-text-primary">PREVIOUS</button>
                            <button disabled={currentIndex === videos.length - 1} onClick={() => setCurrentIndex(currentIndex + 1)} className="px-8 py-4 bg-accent text-white rounded-2xl font-black shadow-lg shadow-accent/20 hover:scale-105 disabled:opacity-20 transition-all">NEXT LESSON</button>
                        </div>
                    </div>
                </div>
                <div className="w-96 border-l border-white/5 bg-bg-surface flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-black text-xs text-text-tertiary uppercase tracking-[0.2em]">Course Syllabus</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {videos.map((v, idx) => (
                            <button
                                key={v.id}
                                onClick={() => setCurrentIndex(idx)}
                                className={`w-full text-left p-4 rounded-[1.5rem] transition-all flex gap-4 group ${currentIndex === idx ? 'bg-accent/10 border border-accent/20' : 'hover:bg-white/5 border border-transparent'}`}
                            >
                                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black border transition-all ${v.is_completed ? 'bg-green-500 border-green-500 text-white' : currentIndex === idx ? 'border-accent text-accent' : 'border-white/10 text-text-tertiary'}`}>
                                    {v.is_completed ? '✓' : idx + 1}
                                </div>
                                <span className={`text-sm font-bold leading-snug line-clamp-2 transition-colors ${currentIndex === idx ? 'text-accent' : 'text-text-primary'}`}>{v.title}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
