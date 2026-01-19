import { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { Book, Rendition } from 'epubjs';
import { motion, AnimatePresence } from 'framer-motion';
import { BookReaderControls } from '@/features/books/BookReaderControls';
import { X, List, ArrowLeft, Book as BookIcon } from 'lucide-react';
import { Resource } from '@/types/node-system';
import { invoke } from '@tauri-apps/api/core';
import logger from '@/lib/logger';

interface BookReaderProps {
    resource: Resource;
    onClose?: () => void;
}

export function BookReader({ resource, onClose }: BookReaderProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const saveProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [toc, setToc] = useState<any[]>([]);
    const [showToc, setShowToc] = useState(false);
    const [currentHref, setCurrentHref] = useState<string | null>(null);

    // Reader settings
    const [fontSize, setFontSize] = useState(100);
    const [fontFamily, setFontFamily] = useState('serif');
    const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');

    useEffect(() => {
        let isCancelled = false;

        if (!resource.path || !viewerRef.current) return;

        const loadBook = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Ensure viewerRef.current is empty
                if (viewerRef.current) {
                    viewerRef.current.innerHTML = '';
                }

                // Ensure resource.path exists
                if (!resource.path) {
                    throw new Error('Book path is missing');
                }

// Create book instance
                logger.debug('BookReader: Loading binary data via invoke...');
                const base64 = await invoke<string>('read_file_base64', { path: resource.path });
                if (isCancelled) return;
                logger.debug('BookReader: Data received, length:', base64.length);

                const binaryString = atob(base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                // Cleanup any existing instances before creating new ones
                if (renditionRef.current) {
                    try { renditionRef.current.destroy(); } catch (e) { }
                    renditionRef.current = null;
                }
                if (bookRef.current) {
                    try { bookRef.current.destroy(); } catch (e) { }
                    bookRef.current = null;
                }

const book = ePub(bytes.buffer);
                logger.debug('BookReader: Initialized book object, waiting for opened...');
                await book.opened;
                if (isCancelled) {
                    book.destroy();
                    return;
                }
                logger.debug('BookReader: Book opened and parsed.');
                bookRef.current = book;

                // Ensure viewerRef.current exists
                if (!viewerRef.current) {
                    throw new Error('Viewer element not ready');
                }

                // Render the book
                const rendition = book.renderTo(viewerRef.current, {
                    width: '100%',
                    height: '100%',
                    spread: 'none',
                    flow: 'paginated',
                    allowScriptedContent: true
                });
                renditionRef.current = rendition;

                // Apply initial theme
                applyTheme(theme, rendition);

// Display the book
                logger.debug('BookReader: Attempting rendition.display()...');
                await rendition.display();
                if (isCancelled) return;
                logger.debug('BookReader: rendition.display() completed.');
                setIsLoading(false);

                // Load table of contents
                try {
                    const navigation = await book.loaded.navigation;
                    if (!isCancelled) setToc(navigation.toc);
                    logger.debug('BookReader: TOC loaded.');
                } catch (tocErr) {
                    logger.error('BookReader: Failed to load TOC:', tocErr);
                }

                // Generate locations for progress tracking in background
                book.locations.generate(1024)
                    .then(() => {
                        if (!isCancelled) logger.debug('BookReader: Locations generated.');
                    })
                    .catch(locErr => logger.error('BookReader: Failed to generate locations:', locErr));

                // Load saved progress
                try {
                    const savedProgress: any = await invoke('get_book_progress', { resourceId: resource.id });
                    if (isCancelled) return;
if (savedProgress && savedProgress.current_location) {
                        logger.debug('BookReader: Restoring position:', savedProgress.current_location);
                        await rendition.display(savedProgress.current_location);
                        if (book.locations.length() > 0) {
                            setProgress(Math.round(book.locations.percentageFromCfi(savedProgress.current_location) * 100));
                        }
                    }
                } catch (err) {
                    logger.debug('BookReader: No saved progress found.');
                }

                // Track location changes and save progress
                rendition.on('relocated', (location: any) => {
                    if (isCancelled) return;
                    const cfi = location.start.cfi;
                    const href = location.start.href;
                    setCurrentHref(href);

                    logger.debug('BookReader: Relocated to', cfi, href);

                    if (book.locations.length() > 0) {
                        const percentage = book.locations.percentageFromCfi(cfi);
                        const progressPct = Math.round(percentage * 100);
                        setProgress(progressPct);

                        // Save progress (debounced)
                        if (saveProgressTimeoutRef.current) clearTimeout(saveProgressTimeoutRef.current);
                        saveProgressTimeoutRef.current = setTimeout(() => {
                            if (!isCancelled) {
                                invoke('save_book_progress', {
                                    resourceId: resource.id,
                                    currentLocation: cfi,
                                    progressPercentage: percentage
                                }).catch(err => console.error('BookReader: Failed to save progress:', err));
                            }
                        }, 2000);
                    }
                });
            } catch (err) {
                if (isCancelled) return;
                console.error('BookReader: Failed to load book:', err);
                setError(`Failed to load book: ${err instanceof Error ? err.message : String(err)}`);
                setIsLoading(false);
            }
        };

        loadBook();

        return () => {
            isCancelled = true;
            if (saveProgressTimeoutRef.current) clearTimeout(saveProgressTimeoutRef.current);
            if (renditionRef.current) {
                try { renditionRef.current.destroy(); } catch (e) { }
                renditionRef.current = null;
            }
            if (bookRef.current) {
                try { bookRef.current.destroy(); } catch (e) { }
                bookRef.current = null;
            }
            if (viewerRef.current) {
                viewerRef.current.innerHTML = '';
            }
        };
    }, [resource.path, resource.id]);

    // Apply theme
const applyTheme = (themeName: 'light' | 'dark' | 'sepia', rendition?: Rendition) => {
        logger.debug('BookReader: Applying theme:', themeName);
        const r = rendition || renditionRef.current;
        if (!r) return;

        const themes = {
            light: {
                body: { background: '#ffffff', color: '#000000' }
            },
            dark: {
                body: { background: '#1a1a1a', color: '#e5e5e5' }
            },
            sepia: {
                body: { background: '#f4ecd8', color: '#5c4b37' }
            }
        };

        r.themes.default(themes[themeName]);
    };

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    useEffect(() => {
        if (renditionRef.current) {
            renditionRef.current.themes.fontSize(`${fontSize}%`);
        }
    }, [fontSize]);

    useEffect(() => {
        if (renditionRef.current) {
            renditionRef.current.themes.font(fontFamily);
        }
    }, [fontFamily]);

const handlePrevPage = useCallback(() => {
        logger.debug('BookReader: Previous page requested');
        if (renditionRef.current) {
            renditionRef.current.prev();
        }
    }, []);

    const handleNextPage = useCallback(() => {
        logger.debug('BookReader: Next page requested');
        if (renditionRef.current) {
            renditionRef.current.next();
        }
    }, []);

const handleGoToChapter = useCallback((href: string) => {
        if (renditionRef.current) {
            logger.debug('BookReader: Navigating to chapter:', href);
            renditionRef.current.display(href);
            setShowToc(false);
        }
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handlePrevPage();
            if (e.key === 'ArrowRight') handleNextPage();
            if (e.key === 'Escape') onClose?.();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePrevPage, handleNextPage, onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col bg-bg-base overflow-hidden"
        >
            {/* Loading Overlay */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[70] bg-bg-base flex items-center justify-center backdrop-blur-sm"
                    >
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                            <p className="text-text-secondary font-mono text-sm tracking-widest uppercase animate-pulse">Synchronizing Grimoire...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error Overlay */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-[80] bg-bg-base/95 flex items-center justify-center p-6 text-center backdrop-blur-md"
                    >
                        <div className="max-w-md p-8 rounded-2xl border border-red-500/20 bg-red-500/5">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                                <X size={32} className="text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-text-primary mb-2">Transmission Terminated</h3>
                            <p className="text-text-secondary mb-6 font-mono text-sm">{error}</p>
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-red-500/20"
                                >
                                    ABORT MISSION
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Header */}
            <div className="h-14 flex-shrink-0 bg-bg-surface/80 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-6 z-50">
                <div className="flex items-center gap-4 truncate">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-all group border border-transparent hover:border-border/50"
                            title="Back to library"
                        >
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="font-medium text-sm hidden sm:inline-block">Library</span>
                        </button>
                    )}

                    <div className="w-px h-6 bg-border/50 hidden sm:block" />

                    <div className="flex flex-col truncate">
                        <span className="text-[10px] font-bold text-accent uppercase tracking-widest leading-none mb-0.5">Reading</span>
                        <h2 className="text-sm font-bold text-text-primary truncate" title={resource.title}>
                            {resource.title.replace(/\.(epub|pdf|azw3|fb2|ibooks)$/i, '')}
                        </h2>
                    </div>
                </div>

                {/* Right side controls - Indicator */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <BookIcon size={16} className="text-accent" />
                    </div>
                </div>
            </div>

            {/* Book Viewer */}
            <div
                ref={viewerRef}
                className="flex-1 relative overflow-hidden transition-all duration-700 ease-in-out"
                style={{
                    backgroundColor: theme === 'dark' ? '#0f0f0f' : theme === 'sepia' ? '#f4ecd8' : '#ffffff',
                    boxShadow: 'inset 0 0 100px rgba(0,0,0,0.05)'
                }}
            />

            {/* Controls */}
            <BookReaderControls
                progress={progress}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                fontFamily={fontFamily}
                onFontFamilyChange={setFontFamily}
                theme={theme}
                onThemeChange={setTheme}
                onToggleToc={() => setShowToc(!showToc)}
                onClose={onClose}
            />

            {/* Table of Contents Sidebar */}
            <AnimatePresence>
                {showToc && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-[40]"
                            onClick={() => setShowToc(false)}
                        />
                        <motion.div
                            initial={{ x: -320, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -320, opacity: 0 }}
                            className="absolute left-0 top-0 bottom-0 w-80 bg-bg-surface border-r border-border/50 shadow-[20px_0_50px_rgba(0,0,0,0.3)] overflow-hidden z-50 flex flex-col"
                        >
                            <div className="p-6 border-b border-border/50 bg-bg-surface/50 backdrop-blur-md">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                                            <List size={18} className="text-accent" />
                                        </div>
                                        <h3 className="text-lg font-bold text-text-primary">Contents</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowToc(false)}
                                        className="p-2 hover:bg-bg-hover rounded-xl text-text-secondary transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-bg-base/30">
                                <div className="space-y-1">
                                    {toc.map((item, index) => {
                                        const isActive = currentHref?.includes(item.href) || item.href.includes(currentHref || '');
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => handleGoToChapter(item.href)}
                                                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all group flex items-center justify-between ${isActive
                                                    ? 'bg-accent/10 text-accent font-bold'
                                                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                                                    }`}
                                            >
                                                <span className={`truncate flex-1 ${isActive ? '' : 'font-medium group-hover:translate-x-1'} transition-transform`}>
                                                    {item.label}
                                                </span>
                                                <div className={`w-1.5 h-1.5 rounded-full bg-accent transition-all ${isActive ? 'opacity-100 scale-125' : 'opacity-0 group-hover:opacity-100'}`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="p-4 border-t border-border/50 bg-bg-surface/50 text-[10px] uppercase tracking-widest font-bold text-text-tertiary">
                                {toc.length} Chapters Indexed
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
