use rusqlite::Connection;
use crate::{AppError, AppResult};

pub trait GraphRepository {
    fn generate_large_graph(
        &self,
        conn: &Connection,
        repository_id: i64,
        node_count: i64,
        edges_per_node: i64,
    ) -> AppResult<()>;
}

pub struct SqliteGraphRepository;

impl GraphRepository for SqliteGraphRepository {
    fn generate_large_graph(
        &self,
        conn: &Connection,
        repository_id: i64,
        node_count: i64,
        edges_per_node: i64,
    ) -> AppResult<()> {
        conn.execute("BEGIN TRANSACTION", [])
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut node_ids = Vec::with_capacity(node_count as usize);

        // Create Nodes
        {
            let mut stmt = conn
                .prepare("INSERT INTO resources (repository_id, title, type, content) VALUES (?1, ?2, ?3, ?4)")
                .map_err(|e| AppError::Database(e.to_string()))?;

            for i in 0..node_count {
                stmt.execute((
                    &repository_id,
                    &format!("Stress Node {}", i),
                    "note",
                    "Auto-generated for stress test",
                ))
                .map_err(|e| AppError::Database(e.to_string()))?;
                node_ids.push(conn.last_insert_rowid());
            }
        }

        // Create Edges
        {
            let mut stmt = conn
                .prepare("INSERT INTO resource_links_v2 (source_id, target_id, strength, bidirectional) VALUES (?1, ?2, ?3, ?4)")
                .map_err(|e| AppError::Database(e.to_string()))?;

            // Simple pseudo-random strategy (LCG)
            let mut seed: u64 = 123456789;
            let a: u64 = 1103515245;
            let c: u64 = 12345;
            let m: u64 = 2147483648;

            for source_id in &node_ids {
                for _ in 0..edges_per_node {
                    seed = (a.wrapping_mul(seed).wrapping_add(c)) % m;
                    let target_index = (seed as usize) % node_ids.len();
                    let target_id = node_ids[target_index];

                    if *source_id != target_id {
                        stmt.execute((source_id, &target_id, 1.0, false))
                            .map_err(|e| AppError::Database(e.to_string()))?;
                    }
                }
            }
        }

        conn.execute("COMMIT", []).map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }
}