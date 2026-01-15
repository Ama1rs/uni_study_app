use crate::{AppError, AppResult};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub completed: bool,
    pub created_at: String,
}

pub trait TaskRepository {
    fn create_task(&self, conn: &Connection, title: String) -> AppResult<i64>;

    fn get_tasks(&self, conn: &Connection) -> AppResult<Vec<Task>>;

    fn update_task_status(&self, conn: &Connection, id: i64, completed: bool) -> AppResult<()>;

    fn delete_task(&self, conn: &Connection, id: i64) -> AppResult<()>;
}

pub struct SqliteTaskRepository;

impl TaskRepository for SqliteTaskRepository {
    fn create_task(&self, conn: &Connection, title: String) -> AppResult<i64> {
        #[derive(Validate)]
        struct TaskValidator {
            #[validate(length(min = 1, message = "Title cannot be empty"))]
            title: String,
        }

        let validator = TaskValidator {
            title: title.clone(),
        };

        validator
            .validate()
            .map_err(|e| AppError::Validation(e.to_string()))?;

        conn.execute(
            "INSERT INTO tasks (title, completed) VALUES (?1, 0)",
            [&title],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(conn.last_insert_rowid())
    }

    fn get_tasks(&self, conn: &Connection) -> AppResult<Vec<Task>> {
        let mut stmt = conn
            .prepare("SELECT id, title, completed, created_at FROM tasks ORDER BY created_at DESC")
            .map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt
            .query_map([], |row| {
                Ok(Task {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    completed: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut result = Vec::new();
        for r in rows {
            result.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(result)
    }

    fn update_task_status(&self, conn: &Connection, id: i64, completed: bool) -> AppResult<()> {
        conn.execute(
            "UPDATE tasks SET completed = ?1 WHERE id = ?2",
            rusqlite::params![completed, id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    fn delete_task(&self, conn: &Connection, id: i64) -> AppResult<()> {
        conn.execute("DELETE FROM tasks WHERE id = ?1", [&id])
            .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }
}
