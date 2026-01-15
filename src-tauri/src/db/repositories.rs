use crate::{AppError, AppResult};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use validator::Validate;

#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct Repository {
    pub id: i64,
    pub name: String,
    pub code: Option<String>,
    pub semester: Option<String>,
    pub description: Option<String>,
    pub credits: f64,
    pub semester_id: Option<i64>,
    pub manual_grade: Option<f64>,
    pub status: String,
    pub component_config: Option<String>,
    pub component_scores: Option<String>,
    pub grading_scale_id: Option<i64>,
}

pub trait RepositoryRepository {
    fn create_repository(
        &self,
        conn: &Connection,
        name: String,
        code: Option<String>,
        semester: Option<String>,
        description: Option<String>,
    ) -> AppResult<i64>;

    fn get_repositories(&self, conn: &Connection) -> AppResult<Vec<Repository>>;

    fn delete_repository(&self, conn: &Connection, id: i64) -> AppResult<()>;
}

pub struct SqliteRepositoryRepository;

impl RepositoryRepository for SqliteRepositoryRepository {
    fn create_repository(
        &self,
        conn: &Connection,
        name: String,
        code: Option<String>,
        semester: Option<String>,
        description: Option<String>,
    ) -> AppResult<i64> {
        #[derive(Validate)]
        struct RepositoryValidator {
            #[validate(length(min = 1, message = "Name cannot be empty"))]
            name: String,
        }

        let validator = RepositoryValidator { name: name.clone() };

        validator
            .validate()
            .map_err(|e| AppError::Validation(e.to_string()))?;

        conn.execute(
            "INSERT INTO repositories (name, code, semester, description, credits, status) VALUES (?1, ?2, ?3, ?4, 3.0, 'in_progress')",
            (&name, &code, &semester, &description),
        ).map_err(|e| AppError::Database(e.to_string()))?;
        Ok(conn.last_insert_rowid())
    }

    fn get_repositories(&self, conn: &Connection) -> AppResult<Vec<Repository>> {
        let mut stmt = conn
            .prepare("SELECT id, name, code, semester, description, credits, semester_id, manual_grade, status, component_config, component_scores, grading_scale_id FROM repositories")
            .map_err(|e| AppError::Database(e.to_string()))?;
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
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut result = Vec::new();
        for r in rows {
            result.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(result)
    }

    fn delete_repository(&self, conn: &Connection, id: i64) -> AppResult<()> {
        let resource_ids: Vec<i64> = conn
            .prepare("SELECT id FROM resources WHERE repository_id = ?1")
            .map_err(|e| AppError::Database(e.to_string()))?
            .query_map([&id], |row| Ok(row.get(0)?))
            .map_err(|e| AppError::Database(e.to_string()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| AppError::Database(e.to_string()))?;

        for resource_id in &resource_ids {
            conn.execute(
                "DELETE FROM resource_links WHERE source_id = ?1 OR target_id = ?1",
                [resource_id],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
        }

        conn.execute("DELETE FROM resources WHERE repository_id = ?1", [&id])
            .map_err(|e| AppError::Database(e.to_string()))?;
        conn.execute("DELETE FROM lectures WHERE repository_id = ?1", [&id])
            .map_err(|e| AppError::Database(e.to_string()))?;
        conn.execute("DELETE FROM repositories WHERE id = ?1", [&id])
            .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }
}
