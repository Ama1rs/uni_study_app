use crate::{Lecture, Repository, Resource};
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LinkType {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub stroke_style: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResourceMetadata {
    pub resource_id: i64,
    pub importance: i32,
    pub status: String,
    pub difficulty: String,
    pub time_estimate: i32,
    pub last_reviewed_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LinkV2 {
    pub id: i64,
    pub source_id: i64,
    pub target_id: i64,
    pub type_id: Option<i64>,
    pub strength: f64,
    pub bidirectional: bool,
    pub created_at: Option<String>,
}

// Removed DbState struct as it is now defined in lib.rs or replaced by DatabaseManager usage
// The DbState struct in lib.rs will now hold the DatabaseManager

pub fn run_global_migrations(conn: &Connection) -> Result<()> {
    // Migration logic for Global DB
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    let migrations: &[(&str, &str)] = &[(
        "global_0001_init",
        include_str!("../migrations/global_0001_init.sql"),
    )];

    apply_migrations(conn, migrations)
}

pub fn run_profile_migrations(conn: &Connection) -> Result<()> {
    // Migration logic for Profile DB
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    let migrations: &[(&str, &str)] = &[
        ("0001_init", include_str!("../migrations/0001_init.sql")),
        (
            "0002_add_planner_events",
            include_str!("../migrations/0002_add_planner_events.sql"),
        ),
        (
            "0003_add_metrics_and_onboarding",
            include_str!("../migrations/0003_add_metrics_and_onboarding.sql"),
        ),
        (
            "0004_fix_onboarding_schema",
            include_str!("../migrations/0004_fix_onboarding_schema.sql"),
        ),
        (
            "0005_fix_missing_repository_columns",
            include_str!("../migrations/0005_fix_missing_repository_columns.sql"),
        ),
        (
            "0006_profile_auth",
            include_str!("../migrations/0006_profile_auth.sql"),
        ),
        (
            "0007_node_system_enhancements",
            include_str!("../migrations/0007_node_system_enhancements.sql"),
        ),
        (
            "0008_grades_projection",
            include_str!("../migrations/0008_grades_projection.sql"),
        ),
        (
            "0009_add_tasks",
            include_str!("../migrations/0009_add_tasks.sql"),
        ),
        (
            "0010_flexible_grading_schema",
            include_str!("../migrations/0010_flexible_grading_schema.sql"),
        ),
        (
            "0011_add_flashcards",
            include_str!("../migrations/0011_add_flashcards.sql"),
        ),
        (
            "0013_fix_llm_settings_columns",
            include_str!("../migrations/0013_fix_llm_settings_columns.sql"),
        ),
        (
            "0014_add_finance_tracking",
            include_str!("../migrations/0014_add_finance_tracking.sql"),
        ),
        (
            "0015_add_study_stats",
            include_str!("../migrations/0015_add_study_stats.sql"),
        ),
        (
            "0016_enhance_lectures",
            include_str!("../migrations/0016_enhance_lectures.sql"),
        ),
        (
            "0017_add_book_library",
            include_str!("../migrations/0017_add_book_library.sql"),
        ),
        (
            "0018_add_graph_settings",
            include_str!("../migrations/0018_add_graph_settings.sql"),
        ),
        (
            "0019_add_missing_graph_settings",
            include_str!("../migrations/0019_add_missing_graph_settings.sql"),
        ),
    ];

    apply_migrations(conn, migrations)
}

fn apply_migrations(conn: &Connection, migrations: &[(&str, &str)]) -> Result<()> {
    for (version, sql) in migrations {
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = ?1",
            [version],
            |row| row.get(0),
        )?;

        if count == 0 {
            println!("Applying migration: {}", version);
            match conn.execute_batch(sql) {
                Ok(_) => println!("Migration {} batch executed successfully.", version),
                Err(e) => {
                    println!("Error executing batch for {}: {}", version, e);
                    return Err(e);
                }
            }

            println!("Updating schema_migrations for {}", version);
            conn.execute(
                "INSERT INTO schema_migrations (version) VALUES (?1)",
                [version],
            )?;
            println!("Migration {} applied successfully.", version);
        } else {
            // println!("Skipping migration {} (already applied)", version);
        }
    }

    // println!("Database migrations check completed successfully.");
    Ok(())
}

// ---------- Link CRUD ----------
#[derive(Debug, Serialize, Deserialize)]
pub struct Link {
    pub id: i64,
    pub source_id: i64,
    pub target_id: i64,
}

pub fn create_link(conn: &Connection, source_id: i64, target_id: i64) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO resource_links (source_id, target_id) VALUES (?1, ?2)",
        (&source_id, &target_id),
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn get_links(conn: &Connection) -> Result<Vec<Link>, String> {
    let mut stmt = conn
        .prepare("SELECT id, source_id, target_id FROM resource_links")
        .map_err(|e| e.to_string())?;
    let links_iter = stmt
        .query_map([], |row| {
            Ok(Link {
                id: row.get(0)?,
                source_id: row.get(1)?,
                target_id: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for l in links_iter {
        result.push(l.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

// ---------- Planner CRUD ----------
#[derive(Debug, Serialize, Deserialize)]
pub struct PlannerEvent {
    pub id: i64,
    pub repository_id: Option<i64>,
    pub title: String,
    pub description: Option<String>,
    pub start_at: String,
    pub end_at: String,
    pub recurrence: Option<String>,
}

pub fn create_planner_event(
    conn: &Connection,
    repository_id: Option<i64>,
    title: String,
    description: Option<String>,
    start_at: String,
    end_at: String,
    recurrence: Option<String>,
) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO planner_events (repository_id, title, description, start_at, end_at, recurrence) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (&repository_id, &title, &description, &start_at, &end_at, &recurrence),
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn get_planner_events(
    conn: &Connection,
    from: Option<String>,
    to: Option<String>,
) -> Result<Vec<PlannerEvent>, String> {
    let mut query = "SELECT id, repository_id, title, description, start_at, end_at, recurrence FROM planner_events".to_string();
    let mut params: Vec<&dyn rusqlite::ToSql> = Vec::new();

    // Simple filtering if provided (assumes ISO8601 string comparison works for SQLite DATETIME)
    if let (Some(f), Some(t)) = (&from, &to) {
        query.push_str(" WHERE start_at >= ?1 AND start_at <= ?2");
        params.push(f);
        params.push(t);
    }

    query.push_str(" ORDER BY start_at ASC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let events_iter = stmt
        .query_map(rusqlite::params_from_iter(params), |row| {
            Ok(PlannerEvent {
                id: row.get(0)?,
                repository_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                start_at: row.get(4)?,
                end_at: row.get(5)?,
                recurrence: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for e in events_iter {
        result.push(e.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn delete_planner_event(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM planner_events WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------- Tasks CRUD ----------
#[derive(Debug, Serialize, Deserialize)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub completed: bool,
    pub created_at: String,
}

#[allow(dead_code)]
pub fn create_task(conn: &Connection, title: String) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO tasks (title, completed) VALUES (?1, 0)",
        [&title],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[allow(dead_code)]
pub fn get_tasks(conn: &Connection) -> Result<Vec<Task>, String> {
    let mut stmt = conn
        .prepare("SELECT id, title, completed, created_at FROM tasks ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                completed: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[allow(dead_code)]
pub fn update_task_status(conn: &Connection, id: i64, completed: bool) -> Result<(), String> {
    conn.execute(
        "UPDATE tasks SET completed = ?1 WHERE id = ?2",
        rusqlite::params![completed, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[allow(dead_code)]
pub fn delete_task(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM tasks WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------- Enhanced Node System CRUD ----------

pub fn get_link_types(conn: &Connection) -> Result<Vec<LinkType>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, color, stroke_style FROM link_types")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(LinkType {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                stroke_style: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn get_resource_metadata(
    conn: &Connection,
    resource_id: i64,
) -> Result<Option<ResourceMetadata>, String> {
    let mut stmt = conn.prepare("SELECT resource_id, importance, status, difficulty, time_estimate, last_reviewed_at FROM resource_metadata WHERE resource_id = ?1").map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query_map([resource_id], |row| {
            Ok(ResourceMetadata {
                resource_id: row.get(0)?,
                importance: row.get(1)?,
                status: row.get(2)?,
                difficulty: row.get(3)?,
                time_estimate: row.get(4)?,
                last_reviewed_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    if let Some(row) = rows.next() {
        Ok(Some(row.map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

pub fn update_resource_metadata(conn: &Connection, meta: ResourceMetadata) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO resource_metadata (resource_id, importance, status, difficulty, time_estimate, last_reviewed_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (
            &meta.resource_id,
            &meta.importance,
            &meta.status,
            &meta.difficulty,
            &meta.time_estimate,
            &meta.last_reviewed_at,
        ),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn create_link_v2(
    conn: &Connection,
    source_id: i64,
    target_id: i64,
    type_id: Option<i64>,
    strength: Option<f64>,
    bidirectional: bool,
) -> Result<i64, String> {
    let strength_val = strength.unwrap_or(1.0);
    conn.execute(
        "INSERT INTO resource_links_v2 (source_id, target_id, type_id, strength, bidirectional) VALUES (?1, ?2, ?3, ?4, ?5)",
        (
            &source_id,
            &target_id,
            &type_id,
            &strength_val,
            &bidirectional,
        ),
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn get_links_v2(conn: &Connection) -> Result<Vec<LinkV2>, String> {
    let mut stmt = conn
        .prepare("SELECT id, source_id, target_id, type_id, strength, bidirectional, created_at FROM resource_links_v2")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(LinkV2 {
                id: row.get(0)?,
                source_id: row.get(1)?,
                target_id: row.get(2)?,
                type_id: row.get(3)?,
                strength: row.get(4)?,
                bidirectional: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn generate_large_graph(
    conn: &Connection,
    repository_id: i64,
    node_count: i64,
    edges_per_node: i64,
) -> Result<(), String> {
    // Note: Transaction handling will be done by caller or we can do it here on the conn
    // But since we have &Connection, we can't easily create a transaction if it was MutexGuard
    // Actually sqlite transaction on reference to connection is fine?
    // rusqlite Transaction takes &mut Connection.
    // We only have &Connection (shared reference).
    // Rusqlite `execute` works on &Connection because of internal mutability (Check rusqlite docs).
    // But `transaction()` requires `&mut Connection`.
    // So we need `&mut Connection` to use transaction.
    // We should change the signature to `conn: &mut Connection` ?
    // Or just use `conn.execute("BEGIN", [])` etc manually?
    // Rusqlite's Connection is RefCell internally? No.
    // Wait, rusqlite methods take &self.
    // `conn.transaction()` takes `&mut self`.
    // So if I pass `&Connection`, I cannot start a transaction object.
    // I can do `conn.execute("BEGIN TRANSACTION", [])`

    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| e.to_string())?;

    let mut node_ids = Vec::with_capacity(node_count as usize);

    // Create Nodes
    {
        let mut stmt = conn
            .prepare("INSERT INTO resources (repository_id, title, type, content) VALUES (?1, ?2, ?3, ?4)")
            .map_err(|e| e.to_string())?;

        for i in 0..node_count {
            stmt.execute((
                &repository_id,
                &format!("Stress Node {}", i),
                "note",
                "Auto-generated for stress test",
            ))
            .map_err(|e| e.to_string())?;
            node_ids.push(conn.last_insert_rowid());
        }
    }

    // Create Edges
    {
        let mut stmt = conn
            .prepare("INSERT INTO resource_links_v2 (source_id, target_id, strength, bidirectional) VALUES (?1, ?2, ?3, ?4)")
            .map_err(|e| e.to_string())?;

        // Simple pseudo-random strategy (LCG)
        let mut seed: u64 = 123456789;
        let a: u64 = 1103515245;
        let c: u64 = 12345;
        let m: u64 = 2147483648;

        for source_id in &node_ids {
            for _ in 0..edges_per_node {
                seed = (a.wrapping_mul(seed).wrapping_add(c)) % m;
                let target_index = (seed as usize) % node_ids.len();
                let target_id = node_ids[target_index];

                if *source_id != target_id {
                    stmt.execute((source_id, &target_id, 1.0, false))
                        .map_err(|e| e.to_string())?;
                }
            }
        }
    }

    conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
    Ok(())
}

// ---------- Flashcards CRUD ----------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Flashcard {
    pub id: i64,
    pub note_id: i64,
    pub front: String,
    pub back: String,
    pub heading_path: Option<String>,
    pub created_at: String,
}

pub fn create_flashcard(
    conn: &Connection,
    note_id: i64,
    front: String,
    back: String,
    heading_path: Option<String>,
) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO flashcards (note_id, front, back, heading_path) VALUES (?1, ?2, ?3, ?4)",
        (&note_id, &front, &back, &heading_path),
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn get_flashcards_by_note(conn: &Connection, note_id: i64) -> Result<Vec<Flashcard>, String> {
    let mut stmt = conn
        .prepare("SELECT id, note_id, front, back, heading_path, created_at FROM flashcards WHERE note_id = ?1 ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([note_id], |row| {
            Ok(Flashcard {
                id: row.get(0)?,
                note_id: row.get(1)?,
                front: row.get(2)?,
                back: row.get(3)?,
                heading_path: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn get_all_flashcards(conn: &Connection) -> Result<Vec<Flashcard>, String> {
    let mut stmt = conn
        .prepare("SELECT id, note_id, front, back, heading_path, created_at FROM flashcards ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Flashcard {
                id: row.get(0)?,
                note_id: row.get(1)?,
                front: row.get(2)?,
                back: row.get(3)?,
                heading_path: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn delete_flashcard(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM flashcards WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn create_resource(
    conn: &Connection,
    repository_id: Option<i64>,
    title: String,
    type_: String,
    path: Option<String>,
    content: Option<String>,
    tags: Option<String>,
) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO resources (repository_id, title, type, path, content, tags) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (repository_id, title, type_, path, content, tags),
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn get_resources(
    conn: &Connection,
    repository_id: Option<i64>,
) -> Result<Vec<Resource>, String> {
    let mut query =
        "SELECT id, COALESCE(repository_id, course_id) as repository_id, title, type, path, content, tags, created_at FROM resources"
            .to_string();

    if repository_id.is_some() {
        query.push_str(" WHERE COALESCE(repository_id, course_id) = ?1");
    }
    query.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let result = if let Some(rid) = repository_id {
        let rows = stmt
            .query_map([rid], |row| {
                Ok(Resource {
                    id: row.get(0)?,
                    repository_id: row.get(1)?,
                    title: row.get(2)?,
                    type_: row.get(3)?,
                    path: row.get(4)?,
                    content: row.get(5)?,
                    tags: row.get(6)?,
                    created_at: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut res = Vec::new();
        for r in rows {
            res.push(r.map_err(|e| e.to_string())?);
        }
        res
    } else {
        let rows = stmt
            .query_map([], |row| {
                Ok(Resource {
                    id: row.get(0)?,
                    repository_id: row.get(1)?,
                    title: row.get(2)?,
                    type_: row.get(3)?,
                    path: row.get(4)?,
                    content: row.get(5)?,
                    tags: row.get(6)?,
                    created_at: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut res = Vec::new();
        for r in rows {
            res.push(r.map_err(|e| e.to_string())?);
        }
        res
    };

    Ok(result)
}

pub fn update_resource(
    conn: &Connection,
    id: i64,
    title: Option<String>,
    content: Option<String>,
    tags: Option<String>,
) -> Result<(), String> {
    let mut updates = Vec::<String>::new();
    // Removed unused params vec

    if title.is_some() {
        updates.push("title = ?".to_string());
    }
    if content.is_some() {
        updates.push("content = ?".to_string());
    }
    if tags.is_some() {
        updates.push("tags = ?".to_string());
    }

    if updates.is_empty() {
        return Ok(());
    }

    let query = format!("UPDATE resources SET {} WHERE id = ?", updates.join(", "));

    match (title, content, tags) {
        (Some(t), Some(c), Some(g)) => conn.execute(&query, (&t, &c, &g, &id)),
        (Some(t), Some(c), None) => conn.execute(&query, (&t, &c, &id)),
        (Some(t), None, Some(g)) => conn.execute(&query, (&t, &g, &id)),
        (Some(t), None, None) => conn.execute(&query, (&t, &id)),
        (None, Some(c), Some(g)) => conn.execute(&query, (&c, &g, &id)),
        (None, Some(c), None) => conn.execute(&query, (&c, &id)),
        (None, None, Some(g)) => conn.execute(&query, (&g, &id)),
        (None, None, None) => return Ok(()),
    }
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn delete_resource(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute(
        "DELETE FROM resource_links WHERE source_id = ?1 OR target_id = ?1",
        [&id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM resources WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn create_repository(
    conn: &Connection,
    name: String,
    code: Option<String>,
    semester: Option<String>,
    description: Option<String>,
) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO repositories (name, code, semester, description, credits, status) VALUES (?1, ?2, ?3, ?4, 3.0, 'in_progress')",
        (&name, &code, &semester, &description),
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn get_repositories(conn: &Connection) -> Result<Vec<Repository>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, code, semester, description, credits, semester_id, manual_grade, status, component_config, component_scores, grading_scale_id FROM repositories")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Repository {
                id: row.get(0)?,
                name: row.get(1)?,
                code: row.get(2)?,
                semester: row.get(3)?,
                description: row.get(4)?,
                credits: row.get(5)?,
                semester_id: row.get(6)?,
                manual_grade: row.get(7)?,
                status: row.get(8)?,
                component_config: row.get(9)?,
                component_scores: row.get(10)?,
                grading_scale_id: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn delete_repository(conn: &Connection, id: i64) -> Result<(), String> {
    let resource_ids: Vec<i64> = conn
        .prepare("SELECT id FROM resources WHERE repository_id = ?1")
        .and_then(|mut stmt| {
            stmt.query_map([&id], |row| Ok(row.get(0)?))
                .and_then(|iter| iter.collect::<Result<Vec<_>, _>>())
        })
        .map_err(|e| e.to_string())?;

    for resource_id in &resource_ids {
        conn.execute(
            "DELETE FROM resource_links WHERE source_id = ?1 OR target_id = ?1",
            [resource_id],
        )
        .map_err(|e| e.to_string())?;
    }

    conn.execute("DELETE FROM resources WHERE repository_id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM lectures WHERE repository_id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM repositories WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------- Study Sessions CRUD ----------
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StudySession {
    pub id: i64,
    pub repository_id: Option<i64>,
    pub start_at: String,
    pub end_at: Option<String>,
    pub duration: Option<i32>,
    pub is_break: bool,
    pub created_at: Option<String>,
}

pub fn create_study_session(
    conn: &Connection,
    repository_id: Option<i64>,
    start_at: String,
    is_break: bool,
) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO study_sessions (repository_id, start_at, is_break) VALUES (?1, ?2, ?3)",
        params![repository_id, start_at, is_break],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn stop_study_session(
    conn: &Connection,
    id: i64,
    end_at: String,
    duration: i32,
) -> Result<(), String> {
    conn.execute(
        "UPDATE study_sessions SET end_at = ?1, duration = ?2 WHERE id = ?3",
        params![end_at, duration, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_study_sessions(
    conn: &Connection,
    from: Option<String>,
) -> Result<Vec<StudySession>, String> {
    let mut query = "SELECT id, repository_id, start_at, end_at, duration, is_break, created_at FROM study_sessions".to_string();
    let mut params_vec: Vec<String> = Vec::new();

    if let Some(f) = from {
        query.push_str(" WHERE start_at >= ?1");
        params_vec.push(f);
    }
    query.push_str(" ORDER BY start_at DESC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params_vec), |row| {
            Ok(StudySession {
                id: row.get(0)?,
                repository_id: row.get(1)?,
                start_at: row.get(2)?,
                end_at: row.get(3)?,
                duration: row.get(4)?,
                is_break: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

// ---------- D-Days CRUD ----------
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DDay {
    pub id: i64,
    pub title: String,
    pub target_date: String,
    pub color: Option<String>,
    pub created_at: Option<String>,
}

pub fn create_d_day(
    conn: &Connection,
    title: String,
    target_date: String,
    color: Option<String>,
) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO d_days (title, target_date, color) VALUES (?1, ?2, ?3)",
        params![title, target_date, color],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn get_d_days(conn: &Connection) -> Result<Vec<DDay>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, target_date, color, created_at FROM d_days ORDER BY target_date ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(DDay {
                id: row.get(0)?,
                title: row.get(1)?,
                target_date: row.get(2)?,
                color: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn delete_d_day(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM d_days WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn create_lecture(
    conn: &Connection,
    repository_id: i64,
    title: String,
    url: String,
    thumbnail: Option<String>,
    group_name: Option<String>,
    order_index: Option<i32>,
) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO lectures (repository_id, course_id, title, url, thumbnail, group_name, order_index) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        (&repository_id, &repository_id, &title, &url, &thumbnail, &group_name, &order_index),
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn get_lectures(conn: &Connection, repository_id: i64) -> Result<Vec<Lecture>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, COALESCE(repository_id, course_id) as repo_id, title, url, thumbnail, group_name, is_completed, order_index 
             FROM lectures 
             WHERE repository_id = ?1 OR course_id = ?1
             ORDER BY group_name, order_index ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([repository_id], |row| {
            Ok(Lecture {
                id: row.get(0)?,
                repository_id: row.get(1)?,
                title: row.get(2)?,
                url: row.get(3)?,
                thumbnail: row.get(4)?,
                group_name: row.get(5)?,
                is_completed: row.get::<_, i32>(6)? != 0,
                order_index: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn delete_lecture(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM lectures WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
