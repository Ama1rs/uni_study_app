use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct DDay {
    pub id: i64,
    pub title: String,
    pub target_date: String,
    pub color: Option<String>,
    pub created_at: Option<String>,
}

pub trait DDayRepository {
    fn create_d_day(
        &self,
        conn: &Connection,
        title: String,
        target_date: String,
        color: Option<String>,
    ) -> Result<i64, String>;

    fn get_d_days(&self, conn: &Connection) -> Result<Vec<DDay>, String>;

    fn delete_d_day(&self, conn: &Connection, id: i64) -> Result<(), String>;
}

pub struct SqliteDDayRepository;

impl DDayRepository for SqliteDDayRepository {
    fn create_d_day(
        &self,
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

    fn get_d_days(&self, conn: &Connection) -> Result<Vec<DDay>, String> {
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

    fn delete_d_day(&self, conn: &Connection, id: i64) -> Result<(), String> {
        conn.execute("DELETE FROM d_days WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
