pub mod d_days;
pub mod flashcards;
pub mod graph;
pub mod lectures;
pub mod links;
pub mod planner;
pub mod repositories;
pub mod resources;
pub mod study_sessions;
pub mod tasks;

// Re-export the repositories for easier access
pub use d_days::{SqliteDDayRepository, DDay};
pub use flashcards::{SqliteFlashcardRepository, Flashcard};
pub use graph::{SqliteGraphRepository};
pub use lectures::{SqliteLectureRepository, Lecture};
pub use links::{SqliteLinkRepository, Link, LinkType, LinkV2, ResourceMetadata};
pub use planner::{SqlitePlannerRepository, PlannerEvent};
pub use repositories::{SqliteRepositoryRepository, Repository};
pub use resources::{SqliteResourceRepository, Resource};
pub use study_sessions::{SqliteStudySessionRepository, StudySession};
pub use tasks::{SqliteTaskRepository, Task};