import { Resource } from '@/types/node-system';
import { motion } from 'framer-motion';
import { Book, MoreHorizontal, Trash2, BookOpen, RotateCcw, Info } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useState, useRef } from 'react';
import { parseBookMetadata, formatTimeAgo } from '@/utils/bookUtils';
import { ContextMenu, ContextMenuAction } from '@/components/ui/ContextMenu';

interface BookCardProps {
    book: Resource;
    progress?: number;
    lastReadAt?: string;
    viewMode?: 'grid' | 'list';
    onRefresh: () => void;
    onOpen?: (book: Resource) => void;
}

export function BookCard({ book, progress = 0, lastReadAt, viewMode = 'grid', onRefresh, onOpen }: BookCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const menuBtnRef = useRef<HTMLButtonElement>(null);

    const { title, author, series } = parseBookMetadata(book.title);

    const getBookColor = (type?: string) => {
        const colors: Record<string, string> = {
            epub: '#f59e0b',
            azw3: '#06b6d4',
            fb2: '#84cc16',
            ibooks: '#f97316',
            pdf: '#ef4444',
        };
        return colors[(type || '').toLowerCase()] || '#3b82f6';
    };

    const handleOpen = () => {
        if (onOpen) {
            onOpen(book);
        } else {
            window.location.hash = `#/book/${book.id}`;
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${title}"?`)) return;

        try {
            await invoke('delete_resource', { id: book.id });
            onRefresh();
        } catch (error) {
            console.error('Failed to delete book:', error);
        }
    };

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPos({ x: rect.left, y: rect.bottom + 5 });
        setShowMenu(true);
    };

    const menuActions: ContextMenuAction[] = [
        {
            label: 'View Info',
            icon: <Info size={16} />,
            onClick: () => console.log('View info'), // TODO: Implement info modal
        },
        {
            label: 'Mark as Unread',
            icon: <RotateCcw size={16} />,
            onClick: async () => {
                // Reset progress
                await invoke('save_book_progress', {
                    resourceId: book.id,
                    currentLocation: '',
                    progressPercentage: 0.0
                });
                onRefresh();
            }
        },
        {
            label: 'Remove from Library',
            icon: <Trash2 size={16} />,
            danger: true,
            onClick: handleDelete
        }
    ];

    if (viewMode === 'list') {
        return (
            <>
                <motion.div
                    className="group relative flex items-center gap-4 p-4 rounded-xl bg-bg-surface border border-border/50 hover:border-accent/50 hover:bg-bg-surface/80 transition-all cursor-pointer overflow-hidden"
                    onClick={handleOpen}
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
                >
                    {/* Book Icon/Cover */}
                    <div
                        className="flex-shrink-0 w-12 h-16 rounded-md shadow-sm flex items-center justify-center relative overflow-hidden"
                        style={{ backgroundColor: getBookColor(book.type) + '15' }}
                    >
                        <Book size={24} style={{ color: getBookColor(book.type) }} />
                        {progress > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
                                <div
                                    className="h-full bg-accent"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <h3 className="font-medium text-text-primary truncate">{title}</h3>
                            {series && (
                                <span className="hidden sm:inline-block text-xs text-text-tertiary px-1.5 py-0.5 rounded-full bg-bg-base border border-border">
                                    {series}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            {author && <span className="text-sm text-text-secondary truncate">{author}</span>}
                            {!author && <span className="text-xs text-text-tertiary uppercase">{book.type}</span>}

                            {lastReadAt && (
                                <>
                                    <span className="text-text-tertiary">•</span>
                                    <span className="text-xs text-text-tertiary">Opened {formatTimeAgo(lastReadAt)}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Progress Badge (if significant) */}
                    {progress > 0 && (
                        <div className="hidden sm:flex flex-col items-end mr-2">
                            <span className="text-sm font-medium text-accent">{Math.round(progress)}%</span>
                            <span className="text-xs text-text-tertiary">complete</span>
                        </div>
                    )}

                    {/* Menu Trigger */}
                    <button
                        ref={menuBtnRef}
                        onClick={handleMenuClick}
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-all"
                    >
                        <MoreHorizontal size={18} />
                    </button>
                </motion.div>

                {showMenu && (
                    <ContextMenu
                        x={menuPos.x}
                        y={menuPos.y}
                        actions={menuActions}
                        onClose={() => setShowMenu(false)}
                    />
                )}
            </>
        );
    }

    // Grid View
    return (
        <>
            <motion.div
                className="group relative flex flex-col rounded-xl bg-bg-surface border border-border/50 hover:border-accent/30 overflow-hidden cursor-pointer transition-all h-full"
                onClick={handleOpen}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
            >
                {/* Book Cover / Placeholder */}
                <div
                    className="aspect-[2/3] w-full relative flex items-center justify-center bg-gradient-to-br from-bg-surface to-bg-base border-b border-border/50"
                >
                    {/* Fallback Icon */}
                    <div className="flex flex-col items-center gap-2 opacity-50">
                        <Book size={48} style={{ color: getBookColor(book.type) }} strokeWidth={1.5} />
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-black font-medium transform scale-95 group-hover:scale-100 transition-transform">
                            <BookOpen size={16} />
                            <span>{progress > 0 ? 'Resume' : 'Read'}</span>
                        </button>
                    </div>

                    {/* Menu Button (Top Right) */}
                    <button
                        ref={menuBtnRef}
                        onClick={handleMenuClick}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-black/40 text-white/90 opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all backdrop-blur-sm"
                    >
                        <MoreHorizontal size={16} />
                    </button>

                    {/* Last Opened Badge (Top Left) */}
                    {lastReadAt && (
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/40 text-xs text-white/90 backdrop-blur-sm">
                            {formatTimeAgo(lastReadAt)}
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="flex-1 p-3 flex flex-col">
                    <h3 className="font-semibold text-sm text-text-primary line-clamp-2 leading-tight mb-1" title={title}>
                        {title}
                    </h3>

                    {author && (
                        <p className="text-xs text-text-secondary line-clamp-1 mb-2">{author}</p>
                    )}

                    <div className="mt-auto">
                        {/* Progress Bar */}
                        {progress > 0 && (
                            <div className="w-full">
                                <div className="flex justify-between text-[10px] text-text-tertiary mb-1">
                                    <span>Progress</span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                                <div className="h-1 w-full bg-bg-hover rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* File Type Badge (if no progress or extra info needed) */}
                        {progress === 0 && (
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-border/50 text-text-tertiary"
                                >
                                    {book.type}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {showMenu && (
                <ContextMenu
                    x={menuPos.x}
                    y={menuPos.y}
                    actions={menuActions}
                    onClose={() => setShowMenu(false)}
                />
            )}
        </>
    );
}
