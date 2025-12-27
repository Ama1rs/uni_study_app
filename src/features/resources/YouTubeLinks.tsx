import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Video, Trash2, Play, Grid3x3, List as ListIcon, Plus, ExternalLink, AlertCircle, RefreshCcw } from 'lucide-react';
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
    const [showThumbnails, setShowThumbnails] = useState(true);
    const [showAddVideo, setShowAddVideo] = useState(false);
    const [newVideoTitle, setNewVideoTitle] = useState('');
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [playingVideo, setPlayingVideo] = useState<{ url: string, title: string } | null>(null);

    useEffect(() => {
        void loadLectures();
    }, [repository.id]);

    async function loadLectures() {
        setLoading(true);
        setError(null);
        try {
            const lectureRes = await invoke<Lecture[]>('get_lectures', { repositoryId: repository.id });
            const resources = await invoke<any[]>('get_resources', { repositoryId: repository.id });
            const videoResources = resources
                .filter(r => {
                    const type = r.type || r.type_;
                    return type === 'video';
                })
                .map(r => ({
                    id: r.id,
                    repository_id: r.repository_id,
                    title: r.title,
                    url: r.path || '',
                    thumbnail: r.content || null
                }));
            const allVideos = [...lectureRes, ...videoResources];
            const uniqueVideos = allVideos.filter((video, index, self) => index === self.findIndex(v => v.id === video.id));
            setLectures(uniqueVideos as Lecture[]);
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
        if (!Number.isFinite(repositoryId)) {
            alert('Missing repository id. Please reopen this repository and try again.');
            return;
        }

        let thumbnail = '';
        const ytMatch = newVideoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (ytMatch && ytMatch[1]) {
            thumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
        }

        try {
            await invoke('create_lecture', {
                repository_id: repositoryId,
                title: newVideoTitle,
                url: newVideoUrl,
                thumbnail: thumbnail || undefined
            });
            setNewVideoTitle('');
            setNewVideoUrl('');
            setShowAddVideo(false);
            void loadLectures();
        } catch (e: any) {
            console.error(e);
            alert(`Failed to add video: ${e.toString()}`);
        }
    }

    async function deleteVideo(e: React.MouseEvent, id: number) {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this video?')) return;
        try {
            try {
                await invoke('delete_lecture', { id });
            } catch {
                await invoke('delete_resource', { id });
            }
            void loadLectures();
        } catch (e: any) {
            console.error(e);
            alert(`Failed to delete: ${e.toString()}`);
        }
    }

    function handleVideoClick(lecture: Lecture) {
        setPlayingVideo({ url: lecture.url, title: lecture.title });
    }

    const HEADER_HEIGHT = 80;

    return (
        <div className="h-full w-full bg-bg-base flex flex-col overflow-hidden relative">
            <div className="flex-shrink-0 z-30 bg-bg-base border-b border-white/5" style={{ height: HEADER_HEIGHT }}>
                <div className="flex items-center justify-between h-full px-6">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5 transition-colors text-text-secondary hover:text-text-primary">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary">{repository.name} - Videos</h1>
                            <p className="text-sm text-text-secondary">{lectures.length} video{lectures.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={loadLectures}
                            className="px-3 py-2 rounded-lg text-sm border border-border hover:bg-white/5 transition-colors flex items-center gap-2"
                            title="Refresh"
                        >
                            <RefreshCcw size={14} /> Refresh
                        </button>
                        <div className="flex bg-bg-surface p-1 rounded-xl border border-border">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                <Grid3x3 size={16} /> Grid
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                <ListIcon size={16} /> List
                            </button>
                        </div>
                        <div className="h-6 w-px bg-border" />
                        <button
                            onClick={() => setShowThumbnails(!showThumbnails)}
                            className={`px-4 py-2 rounded-xl border border-border hover:bg-white/5 transition-colors text-text-primary flex items-center gap-2 ${showThumbnails ? 'bg-accent/10 border-accent/50' : ''}`}
                            title={showThumbnails ? 'Hide Thumbnails' : 'Show Thumbnails'}
                        >
                            <Video size={18} />
                            <span className="text-sm">{showThumbnails ? 'Thumbnails' : 'No Thumbnails'}</span>
                        </button>
                        <button
                            onClick={() => setShowAddVideo(true)}
                            className="px-4 py-2.5 rounded-xl flex items-center gap-2 text-white transition-colors hover:opacity-90 bg-accent font-medium shadow-lg shadow-accent/20"
                        >
                            <Plus size={20} /> Add Video
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto relative">
                {error && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 gap-3">
                        <AlertCircle className="text-red-400" size={32} />
                        <p className="text-text-secondary">{error}</p>
                        <button
                            onClick={loadLectures}
                            className="px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity flex items-center gap-2"
                        >
                            <RefreshCcw size={16} /> Retry
                        </button>
                    </div>
                )}
                {!error && loading && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary">
                        Loading videos…
                    </div>
                )}
                {!error && !loading && lectures.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-20 h-20 rounded-full bg-bg-surface flex items-center justify-center mb-6 border border-border">
                            <Video size={40} className="text-text-tertiary" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-text-primary">No Videos Yet</h3>
                        <p className="text-text-secondary max-w-sm mb-4">Start by adding YouTube videos to this repository.</p>
                        <button onClick={() => setShowAddVideo(true)} className="px-4 py-2 rounded-xl bg-accent text-white hover:opacity-90 transition-opacity">
                            Add Your First Video
                        </button>
                    </div>
                ) : !error && !loading && (
                    <>
                        <div className={`w-full h-full overflow-y-auto ${viewMode === 'grid' ? 'block' : 'hidden'}`}>
                            <div className={`grid gap-6 p-6 ${showThumbnails ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'}`}>
                                {lectures.map(lecture => (
                                    <div
                                        key={lecture.id}
                                        className="group rounded-2xl overflow-hidden cursor-pointer flex flex-col relative border border-border/50 bg-bg-surface/30 hover:bg-bg-surface hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300 transform hover:-translate-y-1"
                                        onClick={() => handleVideoClick(lecture)}
                                    >
                                        {showThumbnails && lecture.thumbnail ? (
                                            <div className="aspect-video bg-black/40 relative flex items-center justify-center overflow-hidden">
                                                <img
                                                    src={lecture.thumbnail}
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                                    alt={lecture.title}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                                        <Play size={20} className="text-white fill-white ml-1" />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => deleteVideo(e, lecture.id)}
                                                    className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 text-white/70 hover:text-red-400 hover:bg-black/80 transition-all backdrop-blur-sm z-10 opacity-0 group-hover:opacity-100"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="aspect-video bg-black/40 relative flex items-center justify-center overflow-hidden">
                                                <div className="flex flex-col items-center gap-2 text-purple-400">
                                                    <Video size={32} strokeWidth={1.5} />
                                                </div>
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                                        <Play size={20} className="text-white fill-white ml-1" />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => deleteVideo(e, lecture.id)}
                                                    className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 text-white/70 hover:text-red-400 hover:bg-black/80 transition-all backdrop-blur-sm z-10 opacity-0 group-hover:opacity-100"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                        <div className="p-4 relative">
                                            <h3 className="font-semibold text-text-primary line-clamp-2 leading-relaxed mb-2 group-hover:text-accent transition-colors">{lecture.title}</h3>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">video</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(lecture.url, '_blank');
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-accent transition-all"
                                                    title="Open in YouTube"
                                                >
                                                    <ExternalLink size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={`w-full h-full overflow-y-auto ${viewMode === 'list' ? 'block' : 'hidden'}`}>
                            <div className="p-6 space-y-3">
                                {lectures.map(lecture => (
                                    <div
                                        key={lecture.id}
                                        className="group rounded-xl border border-border/50 bg-bg-surface/30 hover:bg-bg-surface hover:border-accent/40 transition-all cursor-pointer relative"
                                        onClick={() => handleVideoClick(lecture)}
                                    >
                                        <div className="flex items-center gap-4 p-4">
                                            {showThumbnails && lecture.thumbnail ? (
                                                <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-black/40 relative">
                                                    <img
                                                        src={lecture.thumbnail}
                                                        className="w-full h-full object-cover"
                                                        alt={lecture.title}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                                        <Play size={16} className="text-white fill-white" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex-shrink-0 w-32 h-20 rounded-lg bg-black/40 flex items-center justify-center">
                                                    <Video size={24} className="text-purple-400" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-text-primary mb-1 group-hover:text-accent transition-colors line-clamp-2">{lecture.title}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium">YouTube</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(lecture.url, '_blank');
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-text-secondary hover:text-accent transition-all flex items-center gap-1"
                                                        title="Open in YouTube"
                                                    >
                                                        <ExternalLink size={12} />
                                                        <span className="text-xs">Open</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => deleteVideo(e, lecture.id)}
                                                className="flex-shrink-0 p-2 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {showAddVideo && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="p-6 rounded-2xl w-96 shadow-xl bg-bg-surface border border-border">
                        <h3 className="text-lg font-bold mb-4 text-text-primary">Add YouTube Video</h3>
                        <input
                            className="w-full px-4 py-2 rounded-lg mb-3 outline-none border border-border bg-transparent text-text-primary focus:border-accent transition-colors"
                            placeholder="Video Title"
                            value={newVideoTitle}
                            onChange={e => setNewVideoTitle(e.target.value)}
                            autoFocus
                        />
                        <input
                            className="w-full px-4 py-2 rounded-lg mb-4 outline-none border border-border bg-transparent text-text-primary focus:border-accent transition-colors"
                            placeholder="YouTube URL"
                            value={newVideoUrl}
                            onChange={e => setNewVideoUrl(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAddVideo(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                            <button onClick={addVideo} className="px-4 py-2 rounded-lg text-sm text-white bg-accent hover:opacity-90 transition-opacity">Add</button>
                        </div>
                    </div>
                </div>
            )}

            {playingVideo && (
                <VideoPlayerModal
                    url={playingVideo.url}
                    title={playingVideo.title}
                    onClose={() => setPlayingVideo(null)}
                />
            )}
        </div>
    );
}
