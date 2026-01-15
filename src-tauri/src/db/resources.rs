use crate::{AppError, AppResult};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use validator::Validate;

#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Resource {
    pub id: i64,
    pub repository_id: Option<i64>,
    pub title: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub path: Option<String>,
    pub content: Option<String>,
    pub tags: Option<String>,
    pub created_at: Option<String>,
}

pub trait ResourceRepository {
    fn create_resource(
        &self,
        conn: &Connection,
        repository_id: Option<i64>,
        title: String,
        type_: String,
        path: Option<String>,
        content: Option<String>,
        tags: Option<String>,
    ) -> AppResult<i64>;

    fn get_resources(
        &self,
        conn: &Connection,
        repository_id: Option<i64>,
    ) -> AppResult<Vec<Resource>>;

    fn update_resource(
        &self,
        conn: &Connection,
        id: i64,
        title: Option<String>,
        content: Option<String>,
        tags: Option<String>,
    ) -> Result<(), String>;

    fn delete_resource(&self, conn: &Connection, id: i64) -> Result<(), String>;
}

pub struct SqliteResourceRepository;

impl ResourceRepository for SqliteResourceRepository {
    fn create_resource(
        &self,
        conn: &Connection,
        repository_id: Option<i64>,
        title: String,
        type_: String,
        path: Option<String>,
        content: Option<String>,
        tags: Option<String>,
    ) -> AppResult<i64> {
        #[derive(Validate)]
        struct ResourceValidator {
            #[validate(length(min = 1, message = "Title cannot be empty"))]
            title: String,
            #[validate(length(min = 1, message = "Type cannot be empty"))]
            type_: String,
        }

        let validator = ResourceValidator {
            title: title.clone(),
            type_: type_.clone(),
        };

        validator
            .validate()
            .map_err(|e| AppError::Validation(e.to_string()))?;
        conn.execute(
            "INSERT INTO resources (repository_id, title, type, path, content, tags) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            (repository_id, title, type_, path, content, tags),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(conn.last_insert_rowid())
    }

    fn get_resources(
        &self,
        conn: &Connection,
        repository_id: Option<i64>,
    ) -> AppResult<Vec<Resource>> {
        let mut query =
            "SELECT id, COALESCE(repository_id, course_id) as repository_id, title, type, path, content, tags, created_at FROM resources"
                .to_string();

        if repository_id.is_some() {
            query.push_str(" WHERE COALESCE(repository_id, course_id) = ?1");
        }
        query.push_str(" ORDER BY created_at DESC");

        let mut stmt = conn
            .prepare(&query)
            .map_err(|e| AppError::Database(e.to_string()))?;

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
                .map_err(|e| AppError::Database(e.to_string()))?;

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
                .map_err(|e| AppError::Database(e.to_string()))?;

            let mut res = Vec::new();
            for r in rows {
                res.push(r.map_err(|e| AppError::Database(e.to_string()))?);
            }
            res
        };

        Ok(result)
    }

    fn update_resource(
        &self,
        conn: &Connection,
        id: i64,
        title: Option<String>,
        content: Option<String>,
        tags: Option<String>,
    ) -> Result<(), String> {
        let mut updates = Vec::<String>::new();

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

    fn delete_resource(&self, conn: &Connection, id: i64) -> Result<(), String> {
        conn.execute(
            "DELETE FROM resource_links WHERE source_id = ?1 OR target_id = ?1",
            [&id],
        )
        .map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM resources WHERE id = ?1", [&id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
