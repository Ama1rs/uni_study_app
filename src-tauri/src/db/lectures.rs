use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use ts_rs::TS;

#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct Lecture {
    pub id: i64,
    pub repository_id: i64,
    pub title: String,
    pub url: String,
    pub thumbnail: Option<String>,
    pub group_name: Option<String>,
    pub is_completed: bool,
    pub order_index: Option<i32>,
}

pub trait LectureRepository {
    fn create_lecture(
        &self,
        conn: &Connection,
        repository_id: i64,
        title: String,
        url: String,
        thumbnail: Option<String>,
        group_name: Option<String>,
        order_index: Option<i32>,
    ) -> Result<i64, String>;

    fn get_lectures(&self, conn: &Connection, repository_id: i64) -> Result<Vec<Lecture>, String>;

    fn delete_lecture(&self, conn: &Connection, id: i64) -> Result<(), String>;
}

pub struct SqliteLectureRepository;

impl LectureRepository for SqliteLectureRepository {
    fn create_lecture(
        &self,
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

    fn get_lectures(&self, conn: &Connection, repository_id: i64) -> Result<Vec<Lecture>, String> {
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

    fn delete_lecture(&self, conn: &Connection, id: i64) -> Result<(), String> {
        conn.execute("DELETE FROM lectures WHERE id = ?1", [&id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
