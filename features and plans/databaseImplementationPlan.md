# Repository-informed Database Implementation Plan

## Summary
- Current repo already includes an embedded SQLite-based DB implementation in `src-tauri/src/db.rs` (uses `rusqlite` bundled via `Cargo.toml`) and exposes multiple Tauri commands. The frontend calls several of these commands via `invoke()` (for example `get_repositories`, `create_repository`, `get_resources`, `process_text_to_nodes`, `get_app_settings`, etc.).
- There are naming and coverage mismatches between frontend and backend (frontend uses `courses` in places while Rust exposes `repositories`; some frontend-invoked commands such as `get_courses`/`create_course` are not implemented in Rust). The app uses `localStorage` for onboarding state currently.

## Goals
- Normalize and complete the DB API so the frontend has a consistent, complete persistence layer.
- Keep SQLite (already in use), add migration tooling, and expose a minimal, well-documented set of Tauri commands (CRUD + query helpers) to satisfy all frontend features.

## Findings (from quick repo scan)
- Rust (src-tauri):
  - `src-tauri/src/db.rs` — defines `init_db` that creates tables: `repositories`, `resources`, `resource_links`, `grades`, `lectures`, `user_profile`, `app_settings`. It exposes helper functions and Tauri commands for resources, links, repositories, lectures, user profile, and app settings. It already uses `rusqlite` and `uuid`.
  - `src-tauri/src/lib.rs` — re-exports models and Tauri command wrappers that call into `db` functions, e.g. `create_resource`, `get_resources`, `create_link`, `get_links`, `import_resource`, `process_text_to_nodes`, `get_user_profile`, `set_user_profile`, `get_app_settings`, `set_app_settings`, `get_repositories`, `create_repository`, `get_lectures`, `create_lecture`.
  - `src-tauri/src/main.rs` — runs the library's `run()` entry point.
  - `src-tauri/Cargo.toml` — contains dependencies: `tauri`, `tauri-plugin-opener`, `serde`, `serde_json`, `rusqlite` (bundled), `uuid`.

- Frontend (src/components and contexts):
  - `StudyRepository.tsx` — calls `get_repositories`, `create_repository`. Expects repository shape {id,name,code?,semester?,description?}.
  - `Courses.tsx` — calls `get_courses`, `create_course` (these commands are not implemented in Rust). Expects a Course type similar to Repository.
  - `CourseDetail.tsx` — calls `get_lectures` and `get_resources` and `get_links`, `create_lecture`, `import_resource`, `process_text_to_nodes`. Expects Lecture and Resource shapes matching Rust `lectures` and `resources` tables.
  - `RepositoryView.tsx` and `RepositoryDetail.tsx` — some components use mock data; others call the same resource/lecture/link commands but with `repositoryId` naming (frontend alternates between `courseId` and `repositoryId`).
  - `Planner` currently renders a `Calendar` component; there is no backend table for planner events yet.
  - `ChatLocalLLM.tsx` — mock local LLM UI; no DB dependency present.
  - `AppSettingsContext.tsx` — loads and saves settings via `get_app_settings` / `set_app_settings` (implemented in Rust).
  - `Onboarding` — currently stores onboarding completion and preferences in `localStorage`.

## Key mismatches & TODOs discovered
- Frontend `Courses.tsx` uses `get_courses`/`create_course` but backend exposes `get_repositories`/`create_repository`. Decide whether to treat `repositories` and `courses` as the same entity (recommended) or implement both command sets (less ideal).
- Parameter naming is inconsistent: frontend sometimes sends `courseId` or `repositoryId`; backend expects snake_case parameters (e.g., `course_id`/`repository_id`) in Rust function signatures. We should standardize to camelCase on the frontend and map them in the Tauri command handler, or accept both in the Rust layer.
- No planner events, metrics or onboarding tables exist yet in Rust — frontend expects planner/calendar features and onboarding persistence. Add these tables.

## Minimum required schema (tables, key fields and relations)
1) `repositories` (aka courses)
   - id INTEGER PRIMARY KEY
   - name TEXT NOT NULL
   - code TEXT
   - semester TEXT
   - updated_at DATETIME

3) `resource_links`
   - id INTEGER PRIMARY KEY
   - source_id INTEGER REFERENCES resources(id)
   - target_id INTEGER REFERENCES resources(id)

4) `lectures`
   - id INTEGER PRIMARY KEY
   - repository_id INTEGER REFERENCES repositories(id)
   - title TEXT
   - url TEXT
   - thumbnail TEXT

5) `grades` (optional, already present)
   - id INTEGER PRIMARY KEY
   - repository_id INTEGER REFERENCES repositories(id)
   - name TEXT
   - score REAL
   - max_score REAL
   - weight REAL

6) `user_profile`
   - id INTEGER PRIMARY KEY
   - name TEXT
   - university TEXT
   - avatar_path TEXT

7) `app_settings`
   - id INTEGER PRIMARY KEY CHECK (id = 1)
   - theme_style TEXT
   - theme_mode TEXT
   - accent TEXT
   - sidebar_hidden INTEGER

8) `planner_events` (add)
   - id INTEGER PRIMARY KEY
   - repository_id INTEGER NULL (or course scoped)
   - title TEXT
   - description TEXT
   - start_at DATETIME
   - end_at DATETIME
   - recurrence TEXT NULL
   - created_at DATETIME
   - updated_at DATETIME

9) `metrics` (add, simplified)
   - id INTEGER PRIMARY KEY
   - metric_key TEXT
   - value REAL
   - recorded_at DATETIME

10) `onboarding_state` (migrate from localStorage)
   - id INTEGER PRIMARY KEY CHECK (id = 1)
   - completed INTEGER
   - data JSON

Indexes: add indexes on `resources(repository_id)`, `lectures(repository_id)`, `resource_links(source_id)`, and timestamp columns as needed for queries.

## DB Engine Recommendation
- Keep SQLite using `rusqlite` (already in Cargo.toml). Pros: small, fast, zero-config for desktop, already present. Use the `bundled` feature as in `Cargo.toml`. Add WAL mode and connection mutex/pooled usage to avoid write contention. If you later prefer compile-time SQL checks and async DB usage, consider `sqlx` with `sqlite`.

## Migration Strategy & API boundary
- Add a `src-tauri/migrations/` folder with numbered SQL files (e.g., `0001_init.sql`, `0002_add_planner_events.sql`).
- **Critical**: Ensure these migration files are embedded into the binary (e.g., using `include_str!` or `rust-embed`) so they are available in the release build. Do not rely on runtime file system access for migrations.
- Implement a simple migration runner in `init_db` that checks a `schema_migrations` table and applies missing migrations in order.
- Keep `init_db` idempotent and fail-safe. On first-run create the DB and run migrations; for existing DBs run migrations.
- API (Tauri commands) to expose (suggested list; name and params):
  - Repositories/Courses: `get_repositories()`, `get_repository(id)`, `create_repository({name,code,semester,description})`, `update_repository({id, ...})`, `delete_repository(id)`
  - Resources: `get_resources({repositoryId?})`, `get_resource(id)`, `create_resource({repositoryId,title,type,path?,content?,tags?})`, `update_resource(...)`, `delete_resource(id)`, `import_resource({repositoryId,filePath})`
  - Links: `get_links({repositoryId?})`, `create_link({sourceId,targetId})`, `delete_link(id)`
  - Lectures: `get_lectures({repositoryId})`, `create_lecture({repositoryId,title,url,thumbnail})`, `delete_lecture(id)`
  - Grades: CRUD commands if used by frontend
  - Planner: `get_events({from,to})`, `create_event(...)`, `update_event(...)`, `delete_event(id)`
  - Metrics: `record_metric(key,value)`, `get_metrics({range?})`
  - Settings & User: `get_app_settings()`, `set_app_settings(settings)`, `get_user_profile()`, `set_user_profile(profile)`
  - Onboarding: `get_onboarding_state()`, `set_onboarding_state(state)`

Transactions/Streams: expose transactions in the Rust layer for multi-step ops (e.g., create_resource + create_link). For real-time updates consider adding an optional publish/subscribe mechanism using Tauri events (emit events from Rust to the frontend after database changes).

## Frontend updates required (high level)
- Normalize naming: choose `repository` or `course` and update files accordingly. Recommended: use `repository` everywhere or alias `get_courses` to call repository handlers.
- Update these frontend files to call the finalized Tauri commands and map results to interfaces:
  - `src/components/StudyRepository.tsx` — already calls `get_repositories`/`create_repository` (verify param names)
  - `src/components/Courses.tsx` — change to `get_repositories`/`create_repository` or add wrapper
  - `src/components/CourseDetail.tsx` — use `get_lectures`, `get_resources`, `get_links`, `process_text_to_nodes`, `import_resource`
  - `src/components/RepositoryDetail.tsx` and `RepositoryView.tsx` — align param names (`repositoryId`) and remove mock data
  - `src/components/Planner.tsx` / `src/components/Calendar.tsx` — implement `planner_events` CRUD commands
  - `src/contexts/AppSettingsContext.tsx` — keep but add fallback when `get_app_settings` fails
  - `src/components/onboarding/*` — move persistence from `localStorage` to `get_onboarding_state` / `set_onboarding_state` commands

## Files to change (concrete list)
- Rust:
  - `src-tauri/src/db.rs` — add missing tables (`planner_events`, `metrics`, `onboarding_state`), add migration runner, normalize column names (`repository_id` vs `course_id`), and export new CRUD helpers.
  - `src-tauri/src/lib.rs` — export and annotate new Tauri commands for the API list above and add parameter parsing that's tolerant to camelCase/snake_case.
  - `src-tauri/Cargo.toml` — keep `rusqlite` (already present); if adding migration helper crates consider `refinery` or simple homegrown runner.

- Frontend (TypeScript):
  - `src/components/StudyRepository.tsx` — confirm args and handle errors
  - `src/components/Courses.tsx` — replace `get_courses` with `get_repositories` or add wrapper
  - `src/components/CourseDetail.tsx` — ensure it passes `repositoryId` (or consistent key) and handles links filtering client-side until server-side filtering added
  - `src/components/RepositoryDetail.tsx` — make parameter names consistent with Rust
  - `src/components/RepositoryView.tsx` — remove mock data and use live `get_resources`/`get_links`
  - `src/components/Planner.tsx` and `src/components/Calendar.tsx` — hook CRUD operations to backend
  - `src/contexts/AppSettingsContext.tsx` — keep but add fallback when `get_app_settings` fails
  - `src/components/onboarding/*` — replace localStorage writes with Tauri command calls

## Implementation plan (concrete next steps)
1. Small immediate fixes (1-2 days):
   - Add missing Rust commands or aliases for `get_courses`/`create_course` to prevent frontend errors, or update frontend to call `get_repositories`.
   - Normalize parameter names or accept both camelCase and snake_case in Rust command handlers.
   - Add `planner_events` table and a minimal set of Tauri commands for events (get/create/delete).

2. Medium work (2–5 days):
   - Add migration directory and runner; port current `init_db` SQL into `0001_init.sql` and create subsequent migrations for planner/metrics/onboarding.
   - Implement full CRUD commands in Rust per the API boundary above and ensure commands are exported in `invoke_handler`.
   - Add small unit/integration tests under `src-tauri/tests/` that exercise DB initialization and core CRUD flows.

3. Frontend integration (1–3 days):
   - Update components to call the agreed commands and normalize types.
   - Replace onboarding/localStorage with Tauri onboarding API.
   - Remove or replace mocked data in `RepositoryView` with live API calls.

4. Polish & docs (1 day):
   - Add `docs/database/README.md` describing the schema and Tauri command list.
   - Add example `seed/` data for local dev.

## Open questions / decisions required
- Do we treat `course` and `repository` as the same domain entity? I recommend unifying to `repository` (or renaming Rust entities to `courses`) and updating the frontend to match.
- Do you want to use a migration crate (e.g., `refinery`) or a simple SQL runner? I recommend a simple migration runner to start; migrate to a crate later if needed.

## Next steps I will take if you confirm:
1. Update the plan file in-place (done).
2. Create migration SQL files and a migration runner in `src-tauri/`.
3. Add the missing Tauri wrappers for `get_courses`/`create_course` (or change frontend) and add `planner_events` commands.

If you want, I can now implement the small immediate fixes (aliases for `get_courses` and parameter normalization) and add `planner_events` table + commands. Which would you prefer: patch the frontend to call `repositories` OR add `get_courses`/`create_course` aliases in Rust?
