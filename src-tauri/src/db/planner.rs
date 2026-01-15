use crate::{AppError, AppResult};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PlannerEvent {
    pub id: i64,
    pub repository_id: Option<i64>,
    pub title: String,
    pub description: Option<String>,
    pub start_at: String,
    pub end_at: String,
    pub recurrence: Option<String>,
}

pub trait PlannerRepository {
    fn create_planner_event(
        &self,
        conn: &Connection,
        repository_id: Option<i64>,
        title: String,
        description: Option<String>,
        start_at: String,
        end_at: String,
        recurrence: Option<String>,
    ) -> AppResult<i64>;

    fn get_planner_events(
        &self,
        conn: &Connection,
        from: Option<String>,
        to: Option<String>,
    ) -> AppResult<Vec<PlannerEvent>>;

    fn delete_planner_event(&self, conn: &Connection, id: i64) -> AppResult<()>;
}

pub struct SqlitePlannerRepository;

impl PlannerRepository for SqlitePlannerRepository {
    fn create_planner_event(
        &self,
        conn: &Connection,
        repository_id: Option<i64>,
        title: String,
        description: Option<String>,
        start_at: String,
        end_at: String,
        recurrence: Option<String>,
    ) -> AppResult<i64> {
        conn.execute(
            "INSERT INTO planner_events (repository_id, title, description, start_at, end_at, recurrence) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            (&repository_id, &title, &description, &start_at, &end_at, &recurrence),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(conn.last_insert_rowid())
    }

    fn get_planner_events(
        &self,
        conn: &Connection,
        from: Option<String>,
        to: Option<String>,
    ) -> AppResult<Vec<PlannerEvent>> {
        let mut query = "SELECT id, repository_id, title, description, start_at, end_at, recurrence FROM planner_events".to_string();
        let mut params: Vec<&dyn rusqlite::ToSql> = Vec::new();

        // Simple filtering if provided (assumes ISO8601 string comparison works for SQLite DATETIME)
        if let (Some(f), Some(t)) = (&from, &to) {
            query.push_str(" WHERE start_at >= ?1 AND start_at <= ?2");
            params.push(f);
            params.push(t);
        }

        query.push_str(" ORDER BY start_at ASC");

        let mut stmt = conn
            .prepare(&query)
            .map_err(|e| AppError::Database(e.to_string()))?;
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
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut result = Vec::new();
        for e in events_iter {
            result.push(e.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(result)
    }

    fn delete_planner_event(&self, conn: &Connection, id: i64) -> AppResult<()> {
        conn.execute("DELETE FROM planner_events WHERE id = ?1", [&id])
            .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }
}
