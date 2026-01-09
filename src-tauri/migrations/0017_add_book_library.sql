-- Migration: Add book library tables for collections and reading stats

-- Collections table for organizing books
CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Junction table for books in collections
CREATE TABLE IF NOT EXISTS book_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_resource_id INTEGER NOT NULL,
    collection_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    UNIQUE(book_resource_id, collection_id)
);

-- Reading statistics for books
CREATE TABLE IF NOT EXISTS reading_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    total_time_seconds INTEGER DEFAULT 0,
    pages_read INTEGER DEFAULT 0,
    sessions_count INTEGER DEFAULT 0,
    last_session_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Book progress tracking (CFI for EPUB, page numbers for others)
CREATE TABLE IF NOT EXISTS book_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    current_location TEXT,
    progress_percentage REAL DEFAULT 0,
    last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    UNIQUE(resource_id, user_id)
);

-- Book bookmarks
CREATE TABLE IF NOT EXISTS book_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    location TEXT NOT NULL,
    chapter_title TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Book highlights
CREATE TABLE IF NOT EXISTS book_highlights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    cfi_range TEXT NOT NULL,
    highlighted_text TEXT,
    color TEXT DEFAULT '#ffeb3b',
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_book_collections_book ON book_collections(book_resource_id);
CREATE INDEX IF NOT EXISTS idx_book_collections_collection ON book_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_reading_stats_resource ON reading_stats(resource_id);
CREATE INDEX IF NOT EXISTS idx_book_progress_resource ON book_progress(resource_id);
CREATE INDEX IF NOT EXISTS idx_book_bookmarks_resource ON book_bookmarks(resource_id);
CREATE INDEX IF NOT EXISTS idx_book_highlights_resource ON book_highlights(resource_id);
