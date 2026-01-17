use crate::{AppError, AppResult};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct LinkType {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub stroke_style: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct ResourceMetadata {
    pub resource_id: i64,
    pub importance: i32,
    pub status: String,
    pub difficulty: String,
    pub time_estimate: i32,
    pub last_reviewed_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct LinkV2 {
    pub id: i64,
    pub source_id: i64,
    pub target_id: i64,
    pub type_id: Option<i64>,
    pub strength: f64,
    pub bidirectional: bool,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Link {
    pub id: i64,
    pub source_id: i64,
    pub target_id: i64,
}

pub trait LinkRepository {
    fn create_link(&self, conn: &Connection, source_id: i64, target_id: i64) -> AppResult<i64>;

    fn get_links(&self, conn: &Connection) -> AppResult<Vec<Link>>;

    fn get_link_types(&self, conn: &Connection) -> AppResult<Vec<LinkType>>;

    fn get_resource_metadata(
        &self,
        conn: &Connection,
        resource_id: i64,
    ) -> AppResult<Option<ResourceMetadata>>;

    fn update_resource_metadata(&self, conn: &Connection, meta: ResourceMetadata) -> AppResult<()>;

    fn create_link_v2(
        &self,
        conn: &Connection,
        source_id: i64,
        target_id: i64,
        type_id: Option<i64>,
        strength: Option<f64>,
        bidirectional: bool,
    ) -> AppResult<i64>;

    fn get_links_v2(&self, conn: &Connection) -> AppResult<Vec<LinkV2>>;
}

pub struct SqliteLinkRepository;

impl LinkRepository for SqliteLinkRepository {
    fn create_link(&self, conn: &Connection, source_id: i64, target_id: i64) -> AppResult<i64> {
        conn.execute(
            "INSERT INTO resource_links (source_id, target_id) VALUES (?1, ?2)",
            (&source_id, &target_id),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(conn.last_insert_rowid())
    }

    fn get_links(&self, conn: &Connection) -> AppResult<Vec<Link>> {
        let mut stmt = conn
            .prepare("SELECT id, source_id, target_id FROM resource_links")
            .map_err(|e| AppError::Database(e.to_string()))?;
        let links_iter = stmt
            .query_map([], |row| {
                Ok(Link {
                    id: row.get(0)?,
                    source_id: row.get(1)?,
                    target_id: row.get(2)?,
                })
            })
            .map_err(|e| AppError::Database(e.to_string()))?;
        let mut result = Vec::new();
        for l in links_iter {
            result.push(l.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(result)
    }

    fn get_link_types(&self, conn: &Connection) -> AppResult<Vec<LinkType>> {
        let mut stmt = conn
            .prepare("SELECT id, name, color, stroke_style FROM link_types")
            .map_err(|e| AppError::Database(e.to_string()))?;
        let rows = stmt
            .query_map([], |row| {
                Ok(LinkType {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    stroke_style: row.get(3)?,
                })
            })
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut result = Vec::new();
        for r in rows {
            result.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(result)
    }

    fn get_resource_metadata(
        &self,
        conn: &Connection,
        resource_id: i64,
    ) -> AppResult<Option<ResourceMetadata>> {
        let mut stmt = conn.prepare("SELECT resource_id, importance, status, difficulty, time_estimate, last_reviewed_at FROM resource_metadata WHERE resource_id = ?1").map_err(|e| AppError::Database(e.to_string()))?;

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
            .map_err(|e| AppError::Database(e.to_string()))?;

        if let Some(row) = rows.next() {
            Ok(Some(row.map_err(|e| AppError::Database(e.to_string()))?))
        } else {
            Ok(None)
        }
    }

    fn update_resource_metadata(&self, conn: &Connection, meta: ResourceMetadata) -> AppResult<()> {
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
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    fn create_link_v2(
        &self,
        conn: &Connection,
        source_id: i64,
        target_id: i64,
        type_id: Option<i64>,
        strength: Option<f64>,
        bidirectional: bool,
    ) -> AppResult<i64> {
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
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(conn.last_insert_rowid())
    }

    fn get_links_v2(&self, conn: &Connection) -> AppResult<Vec<LinkV2>> {
        let mut stmt = conn
            .prepare("SELECT id, source_id, target_id, type_id, strength, bidirectional, created_at FROM resource_links_v2")
            .map_err(|e| AppError::Database(e.to_string()))?;
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
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut result = Vec::new();
        for r in rows {
            result.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(result)
    }
}
