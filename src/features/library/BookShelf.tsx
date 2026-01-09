import { Resource } from '@/types/node-system';
import { BookCard } from '@/features/library/BookCard';

interface BookShelfProps {
    books: Resource[];
    progressData?: Record<number, { progress: number; lastReadAt?: string }>; // Map resourceId -> progress info
    viewMode: 'grid' | 'list';
    onRefresh: () => void;
    onOpenBook?: (book: Resource) => void;
}

export function BookShelf({ books, progressData = {}, viewMode, onRefresh, onOpenBook }: BookShelfProps) {
    if (viewMode === 'grid') {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {books.map(book => {
                    const data = progressData[book.id];
                    return (
                        <BookCard
                            key={book.id}
                            book={book}
                            progress={data?.progress}
                            lastReadAt={data?.lastReadAt}
                            onRefresh={onRefresh}
                            onOpen={onOpenBook}
                        />
                    );
                })}
            </div>
        );
    }

    // List view
    return (
        <div className="space-y-2">
            {books.map(book => {
                const data = progressData[book.id];
                return (
                    <BookCard
                        key={book.id}
                        book={book}
                        progress={data?.progress}
                        lastReadAt={data?.lastReadAt}
                        viewMode="list"
                        onRefresh={onRefresh}
                        onOpen={onOpenBook}
                    />
                );
            })}
        </div>
    );
}
