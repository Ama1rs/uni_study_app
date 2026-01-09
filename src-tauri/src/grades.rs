use crate::DbState;

use serde::{Deserialize, Serialize};
use tauri::State;

// Re-export component types from conversion module
pub use crate::conversion::{ComponentConfig, ComponentScore};

#[derive(Serialize, Deserialize, Clone)]
pub struct Semester {
    pub id: i64,
    pub name: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub planned_credits: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GradingScaleMapping {
    pub min_percent: Option<i32>,
    pub letter: Option<String>,
    pub point: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GradingScaleConfig {
    pub max_point: f64,
    pub mappings: Vec<GradingScaleMapping>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GradingScale {
    pub id: i64,
    pub name: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub config: GradingScaleConfig,
    pub is_default: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Program {
    pub id: i64,
    pub name: String,
    pub total_required_credits: f64,
    pub grading_scale_id: Option<i64>,
    pub duration_months: Option<i32>,
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
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
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
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    conn.execute(
        "INSERT INTO semesters (name, start_date, end_date, planned_credits) VALUES (?1, ?2, ?3, ?4)",
        (name, start_date, end_date, planned_credits.unwrap_or(0.0)),
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn delete_semester(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
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
    component_config: Option<String>,
    component_scores: Option<String>,
    grading_scale_id: Option<i64>,
) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    conn.execute(
        "UPDATE repositories SET credits = ?1, semester_id = ?2, manual_grade = ?3, status = ?4, component_config = ?5, component_scores = ?6, grading_scale_id = ?7 WHERE id = ?8",
        (credits, semester_id, manual_grade, status, component_config, component_scores, grading_scale_id, repository_id),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_gpa_summary(state: State<DbState>) -> Result<GradeSummary, String> {
    // Get user's program FIRST, before locking the connection
    // This prevents deadlock since get_user_program also needs to lock the connection
    let user_program = get_user_program(state.clone())?;

    // Now lock the connection for our queries
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // If no program assigned, use default scale (4.0)
    let scale = if let Some(program) = user_program {
        if let Some(scale_id) = program.grading_scale_id {
            // We need to release the lock to call get_grading_scale
            drop(conn);
            get_grading_scale(state.clone(), scale_id)?.ok_or("Scale not found".to_string())?
        } else {
            // Get default scale - need to reacquire lock
            // Drop the outer conn first
            drop(conn);

            let conn = conn_arc.lock().unwrap();
            let scale = {
                let mut stmt = conn
                    .prepare("SELECT id, name, type, config, is_default FROM grading_scales WHERE is_default = 1 ORDER BY name ASC LIMIT 1")
                    .map_err(|e| e.to_string())?;

                stmt.query_row([], |row| {
                    let config_str: String = row.get(3)?;
                    Ok(GradingScale {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        type_: row.get(2)?,
                        config: serde_json::from_str(&config_str).unwrap_or(GradingScaleConfig {
                            max_point: 4.0,
                            mappings: vec![],
                        }),
                        is_default: row.get(4)?,
                    })
                })
                .map_err(|_| "No default scale found".to_string())?
            };
            drop(conn);
            scale
        }
    } else {
        // Get default scale
        // Drop the outer conn first
        drop(conn);

        let conn = conn_arc.lock().unwrap();
        let scale = {
            let mut stmt = conn
                .prepare("SELECT id, name, type, config, is_default FROM grading_scales WHERE is_default = 1 ORDER BY name ASC LIMIT 1")
                .map_err(|e| e.to_string())?;

            stmt.query_row([], |row| {
                let config_str: String = row.get(3)?;
                Ok(GradingScale {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    type_: row.get(2)?,
                    config: serde_json::from_str(&config_str).unwrap_or(GradingScaleConfig {
                        max_point: 4.0,
                        mappings: vec![],
                    }),
                    is_default: row.get(4)?,
                })
            })
            .map_err(|_| "No default scale found".to_string())?
        };
        drop(conn);
        scale
    };

    // Safeguard against division by zero
    let max_point = if scale.config.max_point > 0.0 {
        scale.config.max_point
    } else {
        4.0
    };

    // Now reacquire the lock for our main queries
    let conn = conn_arc.lock().unwrap();

    // Calculate Semester GPAs
    // We group by semester_id.
    // We need to fetch repositories joined with semester name.

    struct CourseGrade {
        semester_id: Option<i64>,
        semester_name: Option<String>,
        credits: f64,
        grade: Option<f64>, // manual_grade (in scale's point system)
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
            // Grade is already in the scale's point system
            // Calculate scaled GPA value based on max_point of the scale
            let gpa_value = (grade / max_point) * 4.0;
            let points = gpa_value * r.credits;

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

/// Retrieves all grading scales from the database
/// Parses JSON config field for each scale
/// Returns scales ordered by is_default DESC (default scales first)
#[tauri::command]
pub fn get_grading_scales(state: State<DbState>) -> Result<Vec<GradingScale>, String> {
    let conn_arc = match state.db_manager.get_active_profile_db() {
        Ok(conn) => conn,
        Err(e) => {
            println!("No active profile db: {}", e);
            // Return default scales if no profile db
            return Ok(vec![
                GradingScale {
                    id: 1,
                    name: "Standard 10-point".to_string(),
                    type_: "numeric".to_string(),
                    config: GradingScaleConfig {
                        max_point: 10.0,
                        mappings: vec![
                            GradingScaleMapping {
                                min_percent: Some(90),
                                letter: None,
                                point: 10.0,
                            },
                            GradingScaleMapping {
                                min_percent: Some(80),
                                letter: None,
                                point: 9.0,
                            },
                            GradingScaleMapping {
                                min_percent: Some(70),
                                letter: None,
                                point: 8.0,
                            },
                            GradingScaleMapping {
                                min_percent: Some(60),
                                letter: None,
                                point: 7.0,
                            },
                            GradingScaleMapping {
                                min_percent: Some(50),
                                letter: None,
                                point: 6.0,
                            },
                            GradingScaleMapping {
                                min_percent: Some(40),
                                letter: None,
                                point: 5.0,
                            },
                        ],
                    },
                    is_default: true,
                },
                GradingScale {
                    id: 2,
                    name: "US 4.0 Scale".to_string(),
                    type_: "letter".to_string(),
                    config: GradingScaleConfig {
                        max_point: 4.0,
                        mappings: vec![
                            GradingScaleMapping {
                                min_percent: None,
                                letter: Some("A".to_string()),
                                point: 4.0,
                            },
                            GradingScaleMapping {
                                min_percent: None,
                                letter: Some("A-".to_string()),
                                point: 3.7,
                            },
                            GradingScaleMapping {
                                min_percent: None,
                                letter: Some("B+".to_string()),
                                point: 3.3,
                            },
                            GradingScaleMapping {
                                min_percent: None,
                                letter: Some("B".to_string()),
                                point: 3.0,
                            },
                            GradingScaleMapping {
                                min_percent: None,
                                letter: Some("B-".to_string()),
                                point: 2.7,
                            },
                            GradingScaleMapping {
                                min_percent: None,
                                letter: Some("C+".to_string()),
                                point: 2.3,
                            },
                            GradingScaleMapping {
                                min_percent: None,
                                letter: Some("C".to_string()),
                                point: 2.0,
                            },
                            GradingScaleMapping {
                                min_percent: None,
                                letter: Some("F".to_string()),
                                point: 0.0,
                            },
                        ],
                    },
                    is_default: false,
                },
            ]);
        }
    };
    let conn = conn_arc.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, name, type, config, is_default FROM grading_scales ORDER BY is_default DESC, name ASC")
        .map_err(|e| e.to_string())?;

    let scales = stmt
        .query_map([], |row| {
            let id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let type_: String = row.get(2)?;
            let config_str: String = row.get(3)?;
            let is_default: bool = row.get(4)?;

            // Parse JSON config
            let config: GradingScaleConfig =
                serde_json::from_str(&config_str).unwrap_or_else(|_| GradingScaleConfig {
                    max_point: 10.0,
                    mappings: Vec::new(),
                });

            Ok(GradingScale {
                id,
                name,
                type_,
                config,
                is_default,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for scale_res in scales {
        result.push(scale_res.map_err(|e| e.to_string())?);
    }

    if result.is_empty() {
        return Err("No grading scales found. Please run database migrations.".to_string());
    }

    Ok(result)
}

/// Retrieves a single grading scale by ID
/// Returns None if scale doesn't exist
#[tauri::command]
pub fn get_grading_scale(state: State<DbState>, id: i64) -> Result<Option<GradingScale>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, name, type, config, is_default FROM grading_scales WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query_map([id], |row| {
            let id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let type_: String = row.get(2)?;
            let config_str: String = row.get(3)?;
            let is_default: bool = row.get(4)?;

            // Parse JSON config
            let config: GradingScaleConfig =
                serde_json::from_str(&config_str).unwrap_or_else(|_| GradingScaleConfig {
                    max_point: 10.0,
                    mappings: Vec::new(),
                });

            Ok(GradingScale {
                id,
                name,
                type_,
                config,
                is_default,
            })
        })
        .map_err(|e| e.to_string())?;

    match rows.next() {
        Some(row) => row.map(Some).map_err(|e| e.to_string()),
        None => Ok(None),
    }
}

/// Creates a new grading scale
/// Takes name, type (numeric/letter/percentage), and JSON config string
/// Returns the ID of the newly created scale
#[tauri::command]
pub fn create_grading_scale(
    state: State<DbState>,
    name: String,
    type_: String,
    config: String,
) -> Result<i64, String> {
    // Validate type
    if !["numeric", "letter", "percentage"].contains(&type_.as_str()) {
        return Err(format!(
            "Invalid grading scale type: {}. Must be one of: numeric, letter, percentage",
            type_
        ));
    }

    // Validate JSON config can be parsed
    let _: GradingScaleConfig =
        serde_json::from_str(&config).map_err(|e| format!("Invalid JSON config: {}", e))?;

    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    conn.execute(
        "INSERT INTO grading_scales (name, type, config, is_default) VALUES (?1, ?2, ?3, 0)",
        (name, type_, config),
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

// ============================================================================
// PROGRAMS MANAGEMENT
// ============================================================================

/// Retrieves all programs from the database with their grading scales
#[tauri::command]
pub fn get_programs(state: State<DbState>) -> Result<Vec<Program>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, name, total_required_credits, grading_scale_id, duration_months FROM programs ORDER BY name ASC")
        .map_err(|e| e.to_string())?;

    let programs = stmt
        .query_map([], |row| {
            Ok(Program {
                id: row.get(0)?,
                name: row.get(1)?,
                total_required_credits: row.get(2)?,
                grading_scale_id: row.get(3)?,
                duration_months: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for program_res in programs {
        result.push(program_res.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

/// Retrieves a single program by ID with its grading scale details
#[tauri::command]
pub fn get_program(state: State<DbState>, id: i64) -> Result<Option<Program>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, name, total_required_credits, grading_scale_id, duration_months FROM programs WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query_map([id], |row| {
            Ok(Program {
                id: row.get(0)?,
                name: row.get(1)?,
                total_required_credits: row.get(2)?,
                grading_scale_id: row.get(3)?,
                duration_months: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    match rows.next() {
        Some(row) => row.map(Some).map_err(|e| e.to_string()),
        None => Ok(None),
    }
}

/// Creates a new program
/// If grading_scale_id is None, defaults to the first scale marked as default
#[tauri::command]
pub fn create_program(
    state: State<DbState>,
    name: String,
    total_required_credits: f64,
    grading_scale_id: Option<i64>,
) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // If no scale provided, get the default one
    let scale_id = if let Some(id) = grading_scale_id {
        // Validate scale exists
        let mut stmt = conn
            .prepare("SELECT id FROM grading_scales WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let exists = stmt.exists([id]).map_err(|e| e.to_string())?;
        if !exists {
            return Err(format!("Grading scale with id {} not found", id));
        }
        Some(id)
    } else {
        // Find default scale
        let mut stmt = conn
            .prepare("SELECT id FROM grading_scales WHERE is_default = 1 LIMIT 1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
        rows.next()
            .map_err(|e| e.to_string())?
            .map(|row| row.get(0))
            .transpose()
            .map_err(|e| e.to_string())?
    };

    conn.execute(
        "INSERT INTO programs (name, total_required_credits, grading_scale_id) VALUES (?1, ?2, ?3)",
        (name, total_required_credits, scale_id),
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

/// Deletes a program and unassigns any users who were using it
#[tauri::command]
pub fn delete_program(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // Optional: Check if it's the default program? Maybe not needed.
    // Check if user is using it. If so, setting their program_id to NULL is handled by SQLite if foreign key cascading is on?
    // If not, we should manually null it out or we might get FK error.
    // Let's assume we want to just delete it.

    // First, check if specific user is using it (just to be safe)
    conn.execute(
        "UPDATE user_profiles SET program_id = NULL WHERE program_id = ?1",
        [id],
    )
    .map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM programs WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// USER PROGRAM MANAGEMENT
// ============================================================================

/// Sets the current user's program
/// Updates user_profiles.program_id for the current session user
#[tauri::command]
pub fn set_user_program(state: State<DbState>, program_id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // Validate program exists
    let mut stmt = conn
        .prepare("SELECT id FROM programs WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let exists = stmt.exists([program_id]).map_err(|e| e.to_string())?;

    if !exists {
        return Err(format!("Program with id {} not found", program_id));
    }

    // Update user profile (using user_id column, assuming single user session)
    // First check if there's a user profile
    let user_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM user_profiles", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if user_count == 0 {
        return Err("No user profile found. Please complete onboarding first.".to_string());
    }

    conn.execute(
        "UPDATE user_profiles SET program_id = ?1 WHERE user_id = (SELECT user_id FROM user_profiles LIMIT 1)",
        [program_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Gets the current user's assigned program with all details
#[tauri::command]
pub fn get_user_program(state: State<DbState>) -> Result<Option<Program>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.name, p.total_required_credits, p.grading_scale_id, p.duration_months 
             FROM programs p 
             JOIN user_profiles u ON p.id = u.program_id 
             LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query_map([], |row| {
            Ok(Program {
                id: row.get(0)?,
                name: row.get(1)?,
                total_required_credits: row.get(2)?,
                grading_scale_id: row.get(3)?,
                duration_months: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    match rows.next() {
        Some(row) => row.map(Some).map_err(|e| e.to_string()),
        None => Ok(None),
    }
}

// ============================================================================
// PROJECTION SETTINGS MANAGEMENT
// ============================================================================

/// Saves the user's projection settings (target CGPA and horizon)
#[tauri::command]
pub fn save_projection_settings(
    state: State<DbState>,
    target_cgpa: Option<f64>,
    horizon: Option<i32>,
) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    conn.execute(
        "UPDATE user_profiles SET target_cgpa = ?1, horizon = ?2 WHERE user_id = (SELECT user_id FROM user_profiles LIMIT 1)",
        (target_cgpa, horizon),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Retrieves the user's projection settings (target CGPA and horizon)
#[tauri::command]
pub fn get_projection_settings(
    state: State<DbState>,
) -> Result<(Option<f64>, Option<i32>), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT target_cgpa, horizon FROM user_profiles LIMIT 1")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    match rows.next() {
        Ok(Some(row)) => Ok((
            row.get(0).map_err(|e| e.to_string())?,
            row.get(1).map_err(|e| e.to_string())?,
        )),
        Ok(None) => Ok((None, None)),
        Err(e) => Err(e.to_string()),
    }
}

// ============================================================================
// CONVERSION & GPA CALCULATION
// ============================================================================

/// Converts a numeric percentage score to grade points using a specific scale
#[tauri::command]
pub fn convert_score_to_points(
    state: State<DbState>,
    score: f64,
    scale_id: i64,
) -> Result<f64, String> {
    use crate::conversion::convert_numeric_score;

    // Get the scale from database
    let scale = get_grading_scale(state, scale_id)?
        .ok_or_else(|| format!("Scale with id {} not found", scale_id))?;

    convert_numeric_score(score, &scale)
}

/// Converts a letter grade to grade points using a specific scale
#[tauri::command]
pub fn convert_letter_to_points(
    state: State<DbState>,
    letter: String,
    scale_id: i64,
) -> Result<f64, String> {
    use crate::conversion::convert_letter_grade;

    // Get the scale from database
    let scale = get_grading_scale(state, scale_id)?
        .ok_or_else(|| format!("Scale with id {} not found", scale_id))?;

    convert_letter_grade(&letter, &scale)
}

/// Calculates weighted component score
#[tauri::command]
pub fn calculate_weighted_component_score(
    components: Vec<ComponentScore>,
    config: Vec<ComponentConfig>,
) -> Result<f64, String> {
    use crate::conversion::calculate_weighted_score;

    calculate_weighted_score(&components, &config)
}

/// Converts a course score using the specified scale
/// Priority: manual_grade > component calculation
#[tauri::command]
pub fn convert_course_grade_to_points(
    state: State<DbState>,
    manual_grade: Option<f64>,
    components: Option<Vec<ComponentScore>>,
    component_config: Option<Vec<ComponentConfig>>,
    scale_id: i64,
) -> Result<f64, String> {
    use crate::conversion::convert_course_score;

    // Get the scale from database
    let scale = get_grading_scale(state, scale_id)?
        .ok_or_else(|| format!("Scale with id {} not found", scale_id))?;

    let comps_ref = components.as_ref().map(|v| v.as_slice());
    let config_ref = component_config.as_ref().map(|v| v.as_slice());

    convert_course_score(manual_grade, comps_ref, config_ref, &scale)
}

// ============================================================================
// PROJECTION & FORECASTING
// ============================================================================

/// Projects future GPA requirements to reach target CGPA
/// Fetches user's current data and calculates what's needed
#[tauri::command]
pub fn project_grades(
    state: State<DbState>,
) -> Result<crate::projection::ProjectionResult, String> {
    use crate::projection::project_future_requirements;

    // Get user's program with scale
    let user_program = get_user_program(state.clone())?.ok_or_else(|| {
        "No program assigned. Please set up your academic program in Settings.".to_string()
    })?;

    // Get program's scale
    let scale = get_grading_scale(state.clone(), user_program.grading_scale_id.ok_or_else(|| "Your program doesn't have a grading scale assigned. Please update your program in Settings.".to_string())?)?
        .ok_or_else(|| "Grading scale not found. Please check your program settings.".to_string())?;

    // Get user's projection settings (target CGPA and horizon)
    let (target_cgpa, horizon) = get_projection_settings(state.clone())?;
    let target_cgpa = target_cgpa.unwrap_or(7.0); // Default to 7.0 if not set

    // Get current GPA summary
    let summary = get_gpa_summary(state)?;

    // Calculate projection
    project_future_requirements(
        summary.cgpa,
        summary.total_credits,
        user_program.total_required_credits,
        target_cgpa,
        &scale,
        horizon,
    )
}

// ============================================================================
// ADVANCED GPA CALCULATIONS
// ============================================================================

/// Calculates GPA for a specific semester
/// Returns (gpa, total_credits) for that semester
#[allow(dead_code)]
pub fn calculate_semester_gpa(
    state: State<DbState>,
    semester_id: i64,
) -> Result<(f64, f64), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // Query all courses in this semester
    let mut stmt = conn
        .prepare(
            "SELECT credits, manual_grade FROM repositories 
             WHERE semester_id = ?1 AND manual_grade IS NOT NULL",
        )
        .map_err(|e| e.to_string())?;

    let courses = stmt
        .query_map([semester_id], |row| {
            Ok((row.get::<_, f64>(0)?, row.get::<_, f64>(1)?))
        })
        .map_err(|e| e.to_string())?;

    let mut total_points = 0.0;
    let mut total_credits = 0.0;

    for course_res in courses {
        let (credits, grade) = course_res.map_err(|e| e.to_string())?;
        total_points += grade * credits;
        total_credits += credits;
    }

    let gpa = if total_credits > 0.0 {
        total_points / total_credits
    } else {
        0.0
    };

    Ok((gpa, total_credits))
}

/// Calculates cumulative GPA across all completed courses
/// Returns (cgpa, total_credits)
#[allow(dead_code)]
pub fn calculate_cgpa(state: State<DbState>) -> Result<(f64, f64), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // Query all completed courses
    let mut stmt = conn
        .prepare(
            "SELECT credits, manual_grade FROM repositories 
             WHERE status = 'completed' AND manual_grade IS NOT NULL",
        )
        .map_err(|e| e.to_string())?;

    let courses = stmt
        .query_map([], |row| Ok((row.get::<_, f64>(0)?, row.get::<_, f64>(1)?)))
        .map_err(|e| e.to_string())?;

    let mut total_points = 0.0;
    let mut total_credits = 0.0;

    for course_res in courses {
        let (credits, grade) = course_res.map_err(|e| e.to_string())?;
        total_points += grade * credits;
        total_credits += credits;
    }

    let cgpa = if total_credits > 0.0 {
        total_points / total_credits
    } else {
        0.0
    };

    Ok((cgpa, total_credits))
}

/// Gets per-semester targets by calling projection function
#[tauri::command]
pub fn get_semester_targets(
    state: State<DbState>,
) -> Result<Vec<crate::projection::SemesterTarget>, String> {
    // Get current projection
    let projection = project_grades(state.clone())?;

    // Get remaining semesters
    let semesters = get_semesters(state)?;

    // Filter to future semesters if needed (or all if user wants to see)
    // For now, return targets for all provided semesters
    crate::projection::get_per_semester_targets(&projection, &semesters)
}

/// Gets per-course targets for a specific semester
#[tauri::command]
pub fn get_course_targets(
    state: State<DbState>,
    semester_id: i64,
    semester_target_gpa: f64,
) -> Result<Vec<crate::projection::CourseTarget>, String> {
    crate::projection::get_per_course_targets(state, semester_target_gpa, semester_id)
}
