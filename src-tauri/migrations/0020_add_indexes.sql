-- Add indexes on foreign key columns to improve query performance
CREATE INDEX IF NOT EXISTS idx_resources_repository_id ON resources(repository_id);
CREATE INDEX IF NOT EXISTS idx_planner_events_repository_id ON planner_events(repository_id);
CREATE INDEX IF NOT EXISTS idx_repositories_semester_id ON repositories(semester_id);
CREATE INDEX IF NOT EXISTS idx_grades_course_id ON grades(course_id);
CREATE INDEX IF NOT EXISTS idx_lectures_repository_id ON lectures(repository_id);
CREATE INDEX IF NOT EXISTS idx_resource_links_source_id ON resource_links(source_id);
CREATE INDEX IF NOT EXISTS idx_resource_links_target_id ON resource_links(target_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_note_id ON flashcards(note_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_repository_id ON study_sessions(repository_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_book_collections_book_resource_id ON book_collections(book_resource_id);
CREATE INDEX IF NOT EXISTS idx_book_collections_collection_id ON book_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_book_highlights_resource_id ON book_highlights(resource_id);
CREATE INDEX IF NOT EXISTS idx_book_highlights_user_id ON book_highlights(user_id);