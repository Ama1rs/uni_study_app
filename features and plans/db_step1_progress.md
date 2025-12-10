# Database Implementation Step 1 Progress

- [x] **Planner Events**
    - [x] Add `planner_events` table to `init_db` in `db.rs`
    - [x] Implement `PlannerEvent` struct and CRUD functions in `db.rs`
    - [x] Expose `get_events`, `create_event`, `delete_event` commands in `lib.rs`
- [x] **Aliases & Normalization**
    - [x] Add `get_courses` alias for `get_repositories` in `lib.rs`
    - [x] Add `create_course` alias for `create_repository` in `lib.rs`
    - [x] Ensure parameter naming consistency (accept `courseId` / `repositoryId`)
