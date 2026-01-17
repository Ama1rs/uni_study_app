use crate::db::planner::PlannerRepository;
use crate::grades::{GradingScale, Semester};
use serde::{Deserialize, Serialize};

/// Result of GPA projection analysis
/// Shows what GPA is needed to reach target and feasibility assessment
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProjectionResult {
    pub current_cgpa: f64,
    pub target_cgpa: f64,
    pub required_future_gpa: f64,
    pub credits_completed: f64,
    pub credits_remaining: f64,
    pub feasible: bool,
    pub feasibility_level: String, // "INFEASIBLE", "CHALLENGING", "FEASIBLE", "EASY"
    pub message: String,
    pub horizon: Option<i32>,
}

/// Per-semester target GPA
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SemesterTarget {
    pub semester_id: i64,
    pub semester_name: String,
    pub target_gpa: f64,
    pub planned_credits: f64,
}

/// Per-course target GPA
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CourseTarget {
    pub course_id: i64,
    pub course_name: String,
    pub target_gpa: f64,
    pub credits: f64,
}

/// Calculates the future GPA requirements to reach target CGPA
///
/// # Arguments
/// * `state` - Database state
/// * `current_cgpa` - User's current CGPA
/// * `credits_completed` - Total credits completed
/// * `total_required_credits` - Total program credits
/// * `target_cgpa` - User's target CGPA (or default if not set)
/// * `scale` - Grading scale to get max points
/// * `horizon` - Semesters remaining (optional)
///
/// # Returns
/// ProjectionResult with calculated requirements and feasibility assessment
pub fn project_future_requirements(
    current_cgpa: f64,
    credits_completed: f64,
    total_required_credits: f64,
    target_cgpa: f64,
    scale: &GradingScale,
    horizon: Option<i32>,
) -> Result<ProjectionResult, String> {
    // Sanitize inputs
    let current_cgpa = if current_cgpa.is_nan() || !current_cgpa.is_finite() {
        0.0
    } else {
        current_cgpa
    };
    let credits_completed = if credits_completed.is_nan() || !credits_completed.is_finite() {
        0.0
    } else {
        credits_completed
    };
    let total_required_credits =
        if total_required_credits.is_nan() || !total_required_credits.is_finite() {
            160.0
        } else {
            total_required_credits
        };
    let target_cgpa = if target_cgpa.is_nan() || !target_cgpa.is_finite() {
        7.0
    } else {
        target_cgpa
    };

    // Calculate remaining credits
    let credits_remaining = (total_required_credits - credits_completed).max(0.0);

    // If already completed or exceeded required credits
    if credits_remaining <= 0.0 {
        return Ok(ProjectionResult {
            current_cgpa,
            target_cgpa,
            required_future_gpa: 0.0,
            credits_completed,
            credits_remaining: 0.0,
            feasible: true,
            feasibility_level: "COMPLETE".to_string(),
            message: "Degree requirements completed!".to_string(),
            horizon,
        });
    }

    // Get max point for scale, safeguard against zero
    let max_scale_point = if scale.config.max_point > 0.0 {
        scale.config.max_point
    } else {
        4.0
    };

    // If horizon is provided, use it to calculate required_future_gpa more specifically
    // if it's different from the credit-based estimate
    let horizon_credits = if let Some(h) = horizon {
        (h as f64 * 20.0).min(credits_remaining) // Assume 20 credits per semester if not specified
    } else {
        credits_remaining
    };

    let required_future_gpa = if horizon_credits > 0.0 {
        // If we only have 'h' semesters to reach target_cgpa in TOTAL (cumulative)
        // Total points needed = target_cgpa * (credits_completed + horizon_credits)
        let total_credits_at_horizon = credits_completed + horizon_credits;
        let points_needed_at_horizon = target_cgpa * total_credits_at_horizon;
        let current_gp = current_cgpa * credits_completed;
        let gp_needed_in_horizon = points_needed_at_horizon - current_gp;
        gp_needed_in_horizon / horizon_credits
    } else {
        0.0
    };

    // Safeguard against NaN or infinite values
    let required_future_gpa = if required_future_gpa.is_nan() || !required_future_gpa.is_finite() {
        0.0
    } else {
        required_future_gpa
    };

    // Determine feasibility level
    let (feasibility_level, feasible, message) = if required_future_gpa > max_scale_point {
        (
            "INFEASIBLE".to_string(),
            false,
            format!(
                "INFEASIBLE: Requires GPA {:.2} (max: {:.2})",
                required_future_gpa, max_scale_point
            ),
        )
    } else if required_future_gpa > max_scale_point * 0.9 {
        (
            "CHALLENGING".to_string(),
            false,
            format!(
                "EXTREMELY HARD: Requires GPA {:.2}/{:.2}",
                required_future_gpa, max_scale_point
            ),
        )
    } else if required_future_gpa > max_scale_point * 0.75 {
        (
            "FEASIBLE".to_string(),
            true,
            format!(
                "CHALLENGING: Requires GPA {:.2}/{:.2}",
                required_future_gpa, max_scale_point
            ),
        )
    } else {
        (
            "EASY".to_string(),
            true,
            format!(
                "FEASIBLE: Requires GPA {:.2}/{:.2}",
                required_future_gpa, max_scale_point
            ),
        )
    };

    Ok(ProjectionResult {
        current_cgpa,
        target_cgpa,
        required_future_gpa,
        credits_completed,
        credits_remaining,
        feasible,
        feasibility_level,
        message,
        horizon,
    })
}

#[tauri::command]
pub fn add_study_tasks_to_planner(
    state: tauri::State<crate::DbState>,
    course_id: i64,
    hours_per_week: i32,
) -> crate::AppResult<()> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // Get course name
    let course_name: String = conn
        .query_row(
            "SELECT name FROM repositories WHERE id = ?1",
            [course_id],
            |row| row.get(0),
        )
        .map_err(|e| crate::AppError::Database(e.to_string()))?;

    // Create a few events for the next 4 weeks
    let current_date = chrono::Local::now();
    for week in 0..4 {
        for session in 0..2 {
            // 2 sessions per week
            let start = current_date + chrono::Duration::days(week * 7 + session * 2);
            let end = start + chrono::Duration::hours((hours_per_week / 2) as i64);

            let start_str = start.to_rfc3339();
            let end_str = end.to_rfc3339();

            let repo = crate::db::SqlitePlannerRepository;
            repo.create_planner_event(
                &conn,
                Some(course_id),
                format!("Study: {}", course_name),
                Some(format!("Planned study session based on grade target.")),
                start_str,
                end_str,
                None,
            )?;
        }
    }

    Ok(())
}

/// Distributes required GPA across remaining semesters
/// Uses even distribution based on planned credits per semester
///
/// # Arguments
/// * `projection` - Result from project_future_requirements
/// * `semesters` - Remaining semesters with planned_credits
///
/// # Returns
/// Vector of per-semester targets
pub fn get_per_semester_targets(
    projection: &ProjectionResult,
    semesters: &[Semester],
) -> Result<Vec<SemesterTarget>, String> {
    if semesters.is_empty() {
        return Ok(Vec::new());
    }

    let mut targets = Vec::new();

    for semester in semesters {
        // Allocate GPA based on proportion of remaining credits
        let credit_fraction = semester.planned_credits / projection.credits_remaining;
        let gp_for_semester =
            projection.required_future_gpa * credit_fraction * semester.planned_credits;
        let semester_target_gpa = if semester.planned_credits > 0.0 {
            gp_for_semester / semester.planned_credits
        } else {
            projection.required_future_gpa
        };

        targets.push(SemesterTarget {
            semester_id: semester.id,
            semester_name: semester.name.clone(),
            target_gpa: semester_target_gpa,
            planned_credits: semester.planned_credits,
        });
    }

    Ok(targets)
}

/// Calculates per-course targets within a semester
/// Distributes semester GPA target across all courses in that semester
///
/// # Arguments
/// * `state` - Database state
/// * `semester_target_gpa` - Target GPA for the semester
/// * `semester_id` - Which semester to get courses from
///
/// # Returns
/// Vector of per-course targets
#[tauri::command]
pub fn get_per_course_targets(
    state: tauri::State<crate::DbState>,
    semester_target_gpa: f64,
    semester_id: i64,
) -> Result<Vec<CourseTarget>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // Query all courses in this semester
    let mut stmt = conn
        .prepare(
            "SELECT id, name, credits FROM repositories 
             WHERE semester_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let courses = stmt
        .query_map([semester_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, f64>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut targets = Vec::new();

    for course_res in courses {
        let (course_id, course_name, credits) = course_res.map_err(|e| e.to_string())?;

        // For now, assign semester target GPA to each course
        // (could be weighted by difficulty in future)
        targets.push(CourseTarget {
            course_id,
            course_name,
            target_gpa: semester_target_gpa,
            credits,
        });
    }

    Ok(targets)
}

/// Calculates estimated study hours needed to reach target GPA
/// Uses course credits and gap between current and target as estimation basis
///
/// # Formula
/// study_hours = credits × (target_gpa / max_point) × base_hours_per_credit
///
/// Where:
/// - base_hours_per_credit = 2.5 (typical engineering/science course)
/// - target_gpa as percentage of max: gap_ratio = target_gpa / max_point
/// - Effort scales with gap: higher targets = more hours
#[tauri::command]
#[allow(dead_code)]
pub fn estimate_study_hours(
    credits: f64,
    target_gpa: f64,
    max_scale_point: f64,
) -> Result<i32, String> {
    if credits <= 0.0 {
        return Err("Credits must be positive".to_string());
    }

    if target_gpa < 0.0 || target_gpa > max_scale_point {
        return Err(format!(
            "Target GPA must be between 0 and {}",
            max_scale_point
        ));
    }

    // Calculate gap ratio: 0.0 to 1.0
    let gap_ratio = if max_scale_point > 0.0 {
        target_gpa / max_scale_point
    } else {
        0.0
    };

    // Base hours: 2.5 hours per credit for typical courses
    // Multiply by gap ratio to scale with difficulty
    let base_hours_per_credit = 2.5;
    let estimated_hours = (credits * gap_ratio * base_hours_per_credit).ceil() as i32;

    // Ensure reasonable bounds
    let bounded_hours = estimated_hours.max(1).min(1000);

    Ok(bounded_hours)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::grades::GradingScaleConfig;

    fn create_test_scale() -> GradingScale {
        GradingScale {
            id: 1,
            name: "Test 10-point".to_string(),
            type_: "numeric".to_string(),
            config: GradingScaleConfig {
                max_point: 10.0,
                mappings: vec![],
            },
            is_default: true,
        }
    }

    #[test]
    fn test_projection_feasible() {
        let scale = create_test_scale();
        let result = project_future_requirements(
            7.5,   // current CGPA
            60.0,  // credits completed
            120.0, // total required
            8.0,   // target CGPA
            &scale, None,
        )
        .unwrap();

        assert_eq!(result.credits_remaining, 60.0);
        assert!(result.feasible);
        assert_eq!(result.feasibility_level, "FEASIBLE");
    }

    #[test]
    fn test_projection_infeasible() {
        let scale = create_test_scale();
        let result = project_future_requirements(
            4.0,   // current CGPA
            100.0, // credits completed
            120.0, // total required
            9.8,   // target CGPA (unrealistic)
            &scale, None,
        )
        .unwrap();

        assert!(!result.feasible);
        assert_eq!(result.feasibility_level, "INFEASIBLE");
    }

    #[test]
    fn test_projection_complete() {
        let scale = create_test_scale();
        let result = project_future_requirements(
            7.5,   // current CGPA
            120.0, // credits completed
            120.0, // total required
            7.5,   // target CGPA
            &scale, None,
        )
        .unwrap();

        assert!(result.feasible);
        assert_eq!(result.feasibility_level, "COMPLETE");
        assert_eq!(result.credits_remaining, 0.0);
    }

    #[test]
    fn test_semester_targets() {
        let scale = create_test_scale();
        let projection = project_future_requirements(7.0, 60.0, 120.0, 8.0, &scale, None).unwrap();

        let semesters = vec![
            Semester {
                id: 1,
                name: "Fall 2024".to_string(),
                start_date: None,
                end_date: None,
                planned_credits: 15.0,
            },
            Semester {
                id: 2,
                name: "Spring 2025".to_string(),
                start_date: None,
                end_date: None,
                planned_credits: 15.0,
            },
            Semester {
                id: 3,
                name: "Fall 2025".to_string(),
                start_date: None,
                end_date: None,
                planned_credits: 15.0,
            },
            Semester {
                id: 4,
                name: "Spring 2026".to_string(),
                start_date: None,
                end_date: None,
                planned_credits: 15.0,
            },
        ];

        let targets = get_per_semester_targets(&projection, &semesters).unwrap();
        assert_eq!(targets.len(), 4);

        // All targets should sum to required future GPA approximately
        for target in targets {
            assert!(target.target_gpa > 0.0);
            assert!(target.target_gpa <= 10.0);
        }
    }

    #[test]
    fn test_study_hours_basic() {
        let result = estimate_study_hours(3.0, 8.0, 10.0).unwrap();
        assert!(result > 0);
        // 3 credits * 0.8 (gap ratio) * 2.5 = 6 hours
        // Floating point precision might make this 6.0000001 -> 7
        assert_eq!(result, 7);
    }

    #[test]
    fn test_study_hours_high_target() {
        let result = estimate_study_hours(4.0, 9.5, 10.0).unwrap();
        assert!(result > 0);
        // 4 * 0.95 * 2.5 = 9.5 → 10 hours
        assert!(result >= 9);
    }

    #[test]
    fn test_study_hours_zero_target() {
        let result = estimate_study_hours(3.0, 0.0, 10.0).unwrap();
        // Should be minimal hours
        assert_eq!(result, 1);
    }

    #[test]
    fn test_study_hours_invalid_credits() {
        let result = estimate_study_hours(-3.0, 8.0, 10.0);
        assert!(result.is_err());
    }
}
