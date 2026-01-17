use crate::{AppError, AppResult};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Flashcard {
    pub id: i64,
    pub note_id: i64,
    pub front: String,
    pub back: String,
    pub heading_path: Option<String>,
    pub created_at: String,
}

pub trait FlashcardRepository {
    fn create_flashcard(
        &self,
        conn: &Connection,
        note_id: i64,
        front: String,
        back: String,
        heading_path: Option<String>,
    ) -> AppResult<i64>;

    fn get_flashcards_by_note(&self, conn: &Connection, note_id: i64) -> AppResult<Vec<Flashcard>>;

    fn get_all_flashcards(&self, conn: &Connection) -> AppResult<Vec<Flashcard>>;

    fn delete_flashcard(&self, conn: &Connection, id: i64) -> AppResult<()>;
}

pub struct SqliteFlashcardRepository;

impl FlashcardRepository for SqliteFlashcardRepository {
    fn create_flashcard(
        &self,
        conn: &Connection,
        note_id: i64,
        front: String,
        back: String,
        heading_path: Option<String>,
    ) -> AppResult<i64> {
        #[derive(Validate)]
        struct FlashcardValidator {
            #[validate(length(min = 1, message = "Front content cannot be empty"))]
            front: String,
            #[validate(length(min = 1, message = "Back content cannot be empty"))]
            back: String,
        }

        let validator = FlashcardValidator {
            front: front.clone(),
            back: back.clone(),
        };

        validator
            .validate()
            .map_err(|e| AppError::Validation(e.to_string()))?;

        conn.execute(
            "INSERT INTO flashcards (note_id, front, back, heading_path) VALUES (?1, ?2, ?3, ?4)",
            (&note_id, &front, &back, &heading_path),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(conn.last_insert_rowid())
    }

    fn get_flashcards_by_note(&self, conn: &Connection, note_id: i64) -> AppResult<Vec<Flashcard>> {
        let mut stmt = conn
            .prepare("SELECT id, note_id, front, back, heading_path, created_at FROM flashcards WHERE note_id = ?1 ORDER BY created_at DESC")
            .map_err(|e| AppError::Database(e.to_string()))?;

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
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut result = Vec::new();
        for r in rows {
            result.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(result)
    }

    fn get_all_flashcards(&self, conn: &Connection) -> AppResult<Vec<Flashcard>> {
        let mut stmt = conn
            .prepare("SELECT id, note_id, front, back, heading_path, created_at FROM flashcards ORDER BY created_at DESC")
            .map_err(|e| AppError::Database(e.to_string()))?;

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
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut result = Vec::new();
        for r in rows {
            result.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(result)
    }

    fn delete_flashcard(&self, conn: &Connection, id: i64) -> AppResult<()> {
        conn.execute("DELETE FROM flashcards WHERE id = ?1", [&id])
            .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }
}
