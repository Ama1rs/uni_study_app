use crate::db::DbState;

use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Deserialize, Clone)]
pub struct Semester {
    pub id: i64,
    pub name: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub planned_credits: f64,
}

#[derive(Serialize, Deserialize)]
pub struct SemesterGpa {
    pub semester_id: i64, // 0 for "Other/Unassigned" if needed, but usually we just list actual semesters
    pub semester_name: String,
    pub gpa: f64,
    pub credits: f64,
}

#[derive(Serialize, Deserialize)]
pub struct GradeSummary {
    pub cgpa: f64,
    pub total_credits: f64,
    pub semester_gpas: Vec<SemesterGpa>,
}

#[tauri::command]
pub fn get_semesters(state: State<DbState>) -> Result<Vec<Semester>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, name, start_date, end_date, planned_credits FROM semesters ORDER BY start_date DESC, created_at DESC")
        .map_err(|e| e.to_string())?;

    let semesters = stmt
        .query_map([], |row| {
            Ok(Semester {
                id: row.get(0)?,
                name: row.get(1)?,
                start_date: row.get(2)?,
                end_date: row.get(3)?,
                planned_credits: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for s in semesters {
        result.push(s.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
pub fn create_semester(
    state: State<DbState>,
    name: String,
    start_date: Option<String>,
    end_date: Option<String>,
    planned_credits: Option<f64>,
) -> Result<i64, String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO semesters (name, start_date, end_date, planned_credits) VALUES (?1, ?2, ?3, ?4)",
        (name, start_date, end_date, planned_credits.unwrap_or(0.0)),
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn delete_semester(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM semesters WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_course_grade_details(
    state: State<DbState>,
    repository_id: i64,
    credits: f64,
    semester_id: Option<i64>,
    manual_grade: Option<f64>,
    status: String,
) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "UPDATE repositories SET credits = ?1, semester_id = ?2, manual_grade = ?3, status = ?4 WHERE id = ?5",
        (credits, semester_id, manual_grade, status, repository_id),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_gpa_summary(state: State<DbState>) -> Result<GradeSummary, String> {
    let conn = state.conn.lock().unwrap();

    // Calculate Semester GPAs
    // We group by semester_id.
    // We need to fetch repositories joined with semester name.

    struct CourseGrade {
        semester_id: Option<i64>,
        semester_name: Option<String>,
        credits: f64,
        grade: Option<f64>, // manual_grade
    }

    let mut stmt = conn
        .prepare(
            "SELECT r.semester_id, s.name, r.credits, r.manual_grade 
         FROM repositories r 
         LEFT JOIN semesters s ON r.semester_id = s.id
         WHERE r.manual_grade IS NOT NULL",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(CourseGrade {
                semester_id: row.get(0)?,
                semester_name: row.get(1)?,
                credits: row.get(2)?,
                grade: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut total_points = 0.0;
    let mut total_credits = 0.0;

    // Map semester_id -> (points, credits, name)
    use std::collections::HashMap;
    let mut sem_map: HashMap<i64, (f64, f64, String)> = HashMap::new();

    for r_res in rows {
        let r = r_res.map_err(|e| e.to_string())?;
        if let Some(grade) = r.grade {
            let points = grade * r.credits;

            total_points += points;
            total_credits += r.credits;

            if let Some(sid) = r.semester_id {
                let entry =
                    sem_map
                        .entry(sid)
                        .or_insert((0.0, 0.0, r.semester_name.unwrap_or_default()));
                entry.0 += points;
                entry.1 += r.credits;
            }
        }
    }

    let cgpa = if total_credits > 0.0 {
        total_points / total_credits
    } else {
        0.0
    };

    let mut semester_gpas = Vec::new();
    for (sid, (pts, creds, name)) in sem_map {
        semester_gpas.push(SemesterGpa {
            semester_id: sid,
            semester_name: name,
            gpa: if creds > 0.0 { pts / creds } else { 0.0 },
            credits: creds,
        });
    }

    // Sort by name for now, or we could join start_date if we wanted to sort chronologically
    semester_gpas.sort_by(|a, b| b.semester_name.cmp(&a.semester_name));

    Ok(GradeSummary {
        cgpa,
        total_credits,
        semester_gpas,
    })
}
