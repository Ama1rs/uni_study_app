import { useState, useEffect } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
import { motion } from 'framer-motion';
import { X, ArrowLeft, ExternalLink, FileText, FileIcon } from 'lucide-react';
import { Resource } from '../types/node-system';

interface ResourcePreviewProps {
    resource: Resource;
    onClose: () => void;
}

export function ResourcePreview({ resource, onClose }: ResourcePreviewProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function loadPreview() {
            if (!resource.path) {
                setIsLoading(false);
                return;
            }

            const raw = resource.path.replace(/\\/g, '/');
            const isHttp = raw.startsWith('http://') || raw.startsWith('https://');

            if (isHttp) {
                if (isMounted) {
                    setPreviewUrl(raw);
                    setIsLoading(false);
                }
                return;
            }

            try {
                if (resource.type === 'pdf') {
                    const base64 = await invoke<string>('read_file_base64', { path: resource.path });
                    if (isMounted) setPreviewUrl(`data:application/pdf;base64,${base64}`);
                } else {
                    const localUrl = convertFileSrc(raw);
                    if (isMounted) setPreviewUrl(localUrl);
                }
            } catch (e) {
                console.error('Failed to load preview:', e);
                if (isMounted) setPreviewUrl(raw);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        loadPreview();

        return () => {
            isMounted = false;
        };
    }, [resource]);

    async function handleOpenExternally() {
        if (resource.path) {
            try {
                await openPath(resource.path);
            } catch (e) {
                console.error('Failed to open externally:', e);
            }
        }
    }

    const renderPreview = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center gap-4 text-text-tertiary">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-mono tracking-wider italic">CALIBRATING PREVIEW...</p>
                </div>
            );
        }

        if (!previewUrl && ['pdf', 'image', 'video'].includes(resource.type)) {
            return <div className="text-text-secondary font-mono">UNABLE TO RENDER PREVIEW</div>;
        }

        switch (resource.type) {
            case 'pdf':
                return previewUrl ? (
                    <embed
                        src={`${previewUrl}#toolbar=1`}
                        className="w-full h-full rounded-lg"
                        type="application/pdf"
                    />
                ) : null;
            case 'image':
                return previewUrl ? (
                    <motion.img
                        src={previewUrl}
                        alt={resource.title}
                        className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    />
                ) : null;
            case 'video':
                return (
                    <iframe
                        src={previewUrl || ''}
                        className="w-full h-full rounded-lg border border-border/50"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                );
            default:
                return (
                    <div className="flex flex-col items-center justify-center gap-6 p-12 text-center max-w-md">
                        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-border/50 flex items-center justify-center mb-2">
                            {resource.type === 'document' ?
                                <FileText size={40} className="text-purple-400" /> :
                                <FileIcon size={40} className="text-blue-400" />
                            }
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-text-primary">Preview Unavailable</h3>
                            <p className="text-sm text-text-secondary leading-relaxed">
                                System cannot render <span className="text-accent uppercase font-mono">{resource.type}</span> files in-app at this time.
                            </p>
                        </div>
                        <button
                            onClick={handleOpenExternally}
                            className="px-6 py-2.5 rounded-xl bg-accent text-black font-bold text-sm tracking-wide hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-accent/20"
                        >
                            <ExternalLink size={16} />
                            OPEN IN DEFAULT APP
                        </button>
                    </div>
                );
        }
    };

    return (
        <motion.div
            className="flex-1 h-full flex flex-col m-4 overflow-hidden relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
        >
            {/* Header HUD */}
            <div className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-bg-surface/40 backdrop-blur-xl border border-border/50 rounded-t-2xl z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/5 text-text-secondary hover:text-text-primary transition-all group"
                        title="Back to Home"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="h-8 w-px bg-border/50 mx-2" />
                    <div className="flex flex-col">
                        <h2 className="text-base font-bold text-text-primary truncate max-w-[400px]">
                            {resource.title}
                        </h2>
                        <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-accent/80">
                            {resource.type} · DATA_VIEW
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleOpenExternally}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
                    >
                        <ExternalLink size={14} />
                        EXTERNAL
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-black/30 backdrop-blur-md border-x border-b border-border/50 rounded-b-2xl overflow-hidden flex items-center justify-center p-8 relative">
                {/* Visual Decoration */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

                {renderPreview()}

                {/* Footer Metadata */}
                <div className="absolute bottom-4 left-6 right-6 flex justify-between items-center pointer-events-none opacity-50">
                    <div className="text-[9px] font-mono text-text-tertiary">
                        LOC: {resource.path?.split(/[\\/]/).pop()}
                    </div>
                    <div className="text-[9px] font-mono text-text-tertiary">
                        STATUS: RENDERING_STABLE
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
