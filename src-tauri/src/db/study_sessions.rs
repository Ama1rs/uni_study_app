use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct StudySession {
    pub id: i64,
    pub repository_id: Option<i64>,
    pub start_at: String,
    pub end_at: Option<String>,
    pub duration: Option<i32>,
    pub is_break: bool,
    pub created_at: Option<String>,
}

pub trait StudySessionRepository {
    fn create_study_session(
        &self,
        conn: &Connection,
        repository_id: Option<i64>,
        start_at: String,
        is_break: bool,
    ) -> Result<i64, String>;

    fn stop_study_session(
        &self,
        conn: &Connection,
        id: i64,
        end_at: String,
        duration: i32,
    ) -> Result<(), String>;

    fn get_study_sessions(
        &self,
        conn: &Connection,
        from: Option<String>,
    ) -> Result<Vec<StudySession>, String>;
}

pub struct SqliteStudySessionRepository;

impl StudySessionRepository for SqliteStudySessionRepository {
    fn create_study_session(
        &self,
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

    fn stop_study_session(
        &self,
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

    fn get_study_sessions(
        &self,
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
}
