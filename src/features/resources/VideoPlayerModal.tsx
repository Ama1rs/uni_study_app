import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface VideoPlayerModalProps {
    url: string;
    title: string;
    onClose: () => void;
}

export function VideoPlayerModal({ url, title, onClose }: VideoPlayerModalProps) {
    const [embedUrl, setEmbedUrl] = useState('');

    useEffect(() => {
        // Simple YouTube Parser
        const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (ytMatch && ytMatch[1]) {
            setEmbedUrl(`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`);
        } else {
            // Fallback for direct files or other valid iframes
            setEmbedUrl(url);
        }
    }, [url]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8" onClick={onClose}>
            <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start pointer-events-none z-10">
                    <h2 className="text-white font-medium text-lg drop-shadow-md">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-black/50 text-white/80 hover:bg-white/20 hover:text-white transition-colors pointer-events-auto backdrop-blur-md"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Player */}
                {embedUrl && (
                    <iframe
                        className="w-full h-full"
                        src={embedUrl}
                        title={title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                )}
            </div>
        </div>
    );
}
