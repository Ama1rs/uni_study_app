
export interface BookMetadata {
    title: string;
    author: string | null;
    series: string | null; // e.g., "Diary of a Wimpy Kid Book 12"
}

/**
 * Parses a raw filename/title into structured metadata.
 * Handles formats like:
 * - "The Getaway (Diary of a Wimpy Kid Book 12) -- Jeff Kinney..."
 * - "Title - Author"
 * - "Title"
 */
export function parseBookMetadata(rawTitle: string): BookMetadata {
    // Remove file extension if present (e.g. .epub)
    let cleanTitle = rawTitle.replace(/\.(epub|pdf|azw3|fb2|ibooks)$/i, '');



    // Pattern 1: Title (Series) -- Author
    // Example: "The Getaway (Diary of a Wimpy Kid Book 12) -- Jeff Kinney"
    const pattern1 = /^(.*?)\s*\((.*?)\)\s*--\s*(.*)$/;
    const match1 = cleanTitle.match(pattern1);

    if (match1) {
        return {
            title: match1[1].trim(),
            series: match1[2].trim(),
            author: match1[3].trim().split(',').reverse().join(' ').trim() // "Kinney, Jeff" -> "Jeff Kinney"
        };
    }

    // Pattern 2: Title - Author
    const pattern2 = /^(.*?)\s*-\s*(.*)$/;
    const match2 = cleanTitle.match(pattern2);

    if (match2) {
        return {
            title: match2[1].trim(),
            author: match2[2].trim(),
            series: null
        };
    }

    return {
        title: cleanTitle.trim(),
        author: null,
        series: null
    };
}

export function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";

    return "Just now";
}
