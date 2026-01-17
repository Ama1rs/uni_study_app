import { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BookShelf } from '@/features/library/BookShelf';
import { motion } from 'framer-motion';
import { Book, Search, Grid, List as ListIcon, Upload, Clock } from 'lucide-react';
import { Resource } from '@/types/node-system';
import { Button } from '@/components/ui/Button';
import { parseBookMetadata } from '@/utils/bookUtils';

interface LibraryProps {
    onOpenBook?: (book: Resource) => void;
}

interface ProgressData {
    progress: number;
    lastReadAt?: string;
}

type SortMode = 'recent' | 'title' | 'progress';

export function Library({ onOpenBook }: LibraryProps) {
    const [books, setBooks] = useState<Resource[]>([]);
    const [progressData, setProgressData] = useState<Record<number, ProgressData>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('library_view_mode') as 'grid' | 'list') || 'grid';
    });
    const [sortMode, setSortMode] = useState<SortMode>('recent');

    useEffect(() => {
        localStorage.setItem('library_view_mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        loadBooks();

        // Keyboard shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                e.preventDefault();
                document.getElementById('library-search')?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const loadBooks = async () => {
        try {
            setIsLoading(true);
            const allResources: Resource[] = await invoke('get_resources', { repositoryId: null });

            const bookFormats = ['epub', 'azw3', 'fb2', 'ibooks', 'pdf'];
            const bookResources = allResources.filter(r =>
                bookFormats.includes(r.type.toLowerCase())
            );

            setBooks(bookResources);

            // Fetch progress for all books
            // Note: In a real app with many books, this should be a single bulk query
            const progressMap: Record<number, ProgressData> = {};

            await Promise.all(bookResources.map(async (book) => {
                try {
                    const progress: any = await invoke('get_book_progress', { resourceId: book.id });
                    if (progress) {
                        progressMap[book.id] = {
                            progress: progress.progress_percentage || 0,
                            lastReadAt: progress.last_read_at
                        };
                    }
                } catch (err) {
                    console.warn(`Failed to load progress for book ${book.id}`, err);
                }
            }));

            setProgressData(progressMap);

        } catch (error) {
            console.error('Failed to load books:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Derived state
    const { processedBooks, continueReading } = useMemo(() => {
        let filtered = books.filter(book => {
            const { title, author } = parseBookMetadata(book.title);
            const searchLower = searchQuery.toLowerCase();
            return title.toLowerCase().includes(searchLower) ||
                (author && author.toLowerCase().includes(searchLower)) ||
                book.tags?.toLowerCase().includes(searchLower);
        });

        // Sort
        filtered.sort((a, b) => {
            const dataA = progressData[a.id];
            const dataB = progressData[b.id];

            if (sortMode === 'recent') {
                const dateA = dataA?.lastReadAt ? new Date(dataA.lastReadAt).getTime() : 0;
                const dateB = dataB?.lastReadAt ? new Date(dataB.lastReadAt).getTime() : 0;
                return dateB - dateA; // Descending
            }
            if (sortMode === 'progress') {
                return (dataB?.progress || 0) - (dataA?.progress || 0);
            }
            // Title
            const metaA = parseBookMetadata(a.title);
            const metaB = parseBookMetadata(b.title);
            return metaA.title.localeCompare(metaB.title);
        });

        // Continue Reading = recently read books (last 3 with specific date)
        const withHistory = books
            .filter(b => progressData[b.id]?.lastReadAt)
            .sort((a, b) => {
                const dateA = new Date(progressData[a.id]?.lastReadAt!).getTime();
                const dateB = new Date(progressData[b.id]?.lastReadAt!).getTime();
                return dateB - dateA;
            })
            .slice(0, 3);

        return { processedBooks: filtered, continueReading: withHistory };
    }, [books, progressData, searchQuery, sortMode]);


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                    <p className="text-text-secondary font-mono text-sm">Loading library...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-bg-primary">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-3 border-b border-border/30 bg-bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-xl font-bold text-text-primary whitespace-nowrap">My Library</h1>

                    <div className="flex items-center gap-3 flex-1 justify-end">
                        {/* Search Bar - Compact */}
                        <div className="relative max-w-md w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                            <input
                                id="library-search"
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search library..."
                                className="w-full h-9 pl-9 pr-4 rounded-lg bg-bg-surface border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40 transition-all"
                            />
                        </div>

                        <div className="h-6 w-px bg-border/60 mx-1" />

                        <div className="flex items-center gap-2">
                            <select
                                value={sortMode}
                                onChange={(e) => setSortMode(e.target.value as SortMode)}
                                className="bg-bg-hover border border-border rounded-lg px-2 h-9 text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent/50"
                            >
                                <option value="recent">Recent</option>
                                <option value="title">Title</option>
                                <option value="progress">Progress</option>
                            </select>

                            <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-hover border border-border/50 h-9">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid'
                                        ? 'bg-bg-surface text-accent shadow-sm'
                                        : 'text-text-secondary hover:text-text-primary'
                                        }`}
                                    title="Grid View"
                                >
                                    <Grid size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list'
                                        ? 'bg-bg-surface text-accent shadow-sm'
                                        : 'text-text-secondary hover:text-text-primary'
                                        }`}
                                    title="List View"
                                >
                                    <ListIcon size={16} />
                                </button>
                            </div>

                            <Button variant="primary" size="compact" className="h-9 px-4" aria-label="Import books to library">
                                <Upload size={16} className="mr-2" />
                                Import
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 space-y-8 max-w-[1920px] mx-auto">

                    {/* Continue Reading Section - Only show if we have history */}
                    {continueReading.length > 0 && !searchQuery && (
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Clock size={18} className="text-accent" />
                                <h2 className="text-lg font-bold text-text-primary">Continue Reading</h2>
                            </div>
                            <BookShelf
                                books={continueReading}
                                progressData={progressData}
                                viewMode={viewMode}
                                onRefresh={loadBooks}
                                onOpenBook={onOpenBook}
                            />
                        </motion.section>
                    )}

                    {/* All Books Section */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-text-primary">
                                {searchQuery ? `Search Results (${processedBooks.length})` : 'All Books'}
                            </h2>
                            {!searchQuery && (
                                <span className="text-xs text-text-tertiary bg-bg-surface px-2 py-1 rounded-full border border-border">
                                    {processedBooks.length} items
                                </span>
                            )}
                        </div>

                        {processedBooks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl bg-bg-surface/30">
                                <Book className="text-text-tertiary mb-4 opacity-50" size={64} strokeWidth={1} />
                                <p className="text-lg text-text-primary font-medium mb-2">
                                    {searchQuery ? 'No books found' : 'Your library is empty'}
                                </p>
                                <p className="text-text-secondary max-w-sm mx-auto mb-6">
                                    {searchQuery
                                        ? `We couldn't find any books matching "${searchQuery}"`
                                        : 'Import EPUB, PDF, or other ebook formats to start building your personal knowledge library.'
                                    }
                                </p>
                                {!searchQuery && (
                                    <Button variant="primary">
                                        <Upload size={18} />
                                        Import First Book
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <BookShelf
                                books={processedBooks}
                                progressData={progressData}
                                viewMode={viewMode}
                                onRefresh={loadBooks}
                                onOpenBook={onOpenBook}
                            />
                        )}
                    </motion.section>
                </div>
            </div>
        </div>
    );
}
