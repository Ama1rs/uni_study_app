use rusqlite::{Connection, Result};

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
        (
            "0020_add_indexes",
            include_str!("../migrations/0020_add_indexes.sql"),
        ),
        (
            "0021_supabase_sync_init",
            include_str!("../migrations/0021_supabase_sync_init.sql"),
        ),
        (
            "0023_fix_device_identity_columns",
            include_str!("../migrations/0023_fix_device_identity_columns.sql"),
        ),
        (
            "0024_migration_system",
            include_str!("../migrations/0024_migration_system.sql"),
        ),
        (
            "0027_clean_onboarding_fix",
            include_str!("../migrations/0027_clean_onboarding_fix.sql"),
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
