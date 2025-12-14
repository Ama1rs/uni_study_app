# Flexible Global Grading System - Implementation Plan

**Status**: Architecture & Database Schema Partially Implemented  
**Last Updated**: December 13, 2025  
**Project**: Uni Study App

---

## Executive Summary

The application is implementing a **flexible, schema-driven grading system** to accommodate different institutional grading standards worldwide (10-point, 4.0 GPA, letter grades, percentage-based, etc.). The foundation has been laid with database schema and TypeScript types, but the core business logic and backend API commands are **not yet implemented**.

### Current Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Database Schema** | ✅ 80% Complete | Migrations 0008-0010 added; flexible schema defined |
| **TypeScript Types** | ✅ Complete | All grading interfaces defined in `src/types/grading.ts` |
| **Frontend Components** | ⚠️ Partial | UI shells created; logic partially incomplete |
| **Backend Commands** | ❌ Not Started | No Tauri commands exposed for core grading operations |
| **Business Logic** | ❌ Not Started | No conversion, projection, or calculation functions |
| **Database Functions** | ⚠️ Partial | Basic semester/GPA queries exist; advanced operations missing |

---

## Current Codebase Architecture

### Database Layer
- **Location**: `src-tauri/migrations/0008_grades_projection.sql`, `0010_flexible_grading_schema.sql`
- **Key Tables**:
  - `semesters`: Term/semester metadata (name, start_date, end_date, planned_credits)
  - `grading_scales`: Flexible scale definitions (numeric, letter, percentage mapping)
  - `programs`: Degree program metadata (name, total_required_credits, grading_scale_id)
  - Enhanced `repositories` (courses) with: credits, semester_id, manual_grade, status, component_config, component_scores, grading_scale_id

### TypeScript Types
- **Location**: `src/types/grading.ts`
- **Interfaces**: `Semester`, `GradingScale`, `Program`, `ComponentConfig`, `ComponentScore`, `SemesterGpa`, `GradeSummary`, `ProjectionResult`, `ProjectionSettings`

### React Frontend
- **Grades Component**: `src/components/Grades.tsx` — Main grades dashboard (UI complete, logic incomplete)
- **Course Grade Dialog**: `src/components/CourseGradeDialog.tsx` — Edit course grades with component-based scoring
- **Grade Settings Dialog**: `src/components/GradeSettingsDialog.tsx` — Program and scale selection
- **Issues**: 
  - Missing backend command implementations
  - Placeholder/mock data in many places
  - No real grade conversion logic
  - Projection visualization incomplete

### Existing Backend Commands (in `src-tauri/src/lib.rs` and `src-tauri/src/grades.rs`)
- `get_semesters()` ✅
- `create_semester()` ✅
- `delete_semester()` ✅
- `update_course_grade_details()` ⚠️ (incomplete)
- `get_gpa_summary()` ✅ (basic version, assumes direct grade points)
- **Missing**:
  - `get_grading_scales()` ❌
  - `create_program()` ❌
  - `get_programs()` ❌
  - `set_user_program()` ❌
  - `convert_score_to_points()` ❌
  - `project_grades()` ❌
  - `calculate_component_score()` ❌
  - `save_projection_settings()` ❌

---

## Detailed Implementation Phases

### Phase 1: Complete Core Backend Data Access Layer (1-2 days)

#### 1.1 Implement Missing Database Queries in `grades.rs`

**File**: `src-tauri/src/grades.rs`

##### Tasks:
1. **Add `GradingScale` CRUD Commands**
   - `pub fn get_grading_scales(state: &State<DbState>) -> Result<Vec<GradingScale>, String>`
     - Query `grading_scales` table
     - Parse `config` JSON field into `GradingScaleConfig`
     - Return all scales ordered by `is_default DESC`
   
   - `pub fn get_grading_scale(state: &State<DbState>, id: i64) -> Result<Option<GradingScale>, String>`
     - Fetch single scale by id
     - Used by course-specific overrides

   - `pub fn create_grading_scale(state: &State<DbState>, name: String, type_: String, config: String) -> Result<i64, String>`
     - Insert new scale
     - `type_` must be one of: "numeric", "letter", "percentage"
     - `config` should be pre-validated JSON from frontend

2. **Add `Program` CRUD Commands**
   - `pub fn get_programs(state: &State<DbState>) -> Result<Vec<Program>, String>`
     - Query all programs
     - Resolve grading_scale relationships
   
   - `pub fn get_program(state: &State<DbState>, id: i64) -> Result<Option<Program>, String>`
     - Fetch single program with scale
   
   - `pub fn create_program(state: &State<DbState>, name: String, total_required_credits: f64, grading_scale_id: Option<i64>) -> Result<i64, String>`
     - Insert new program
     - If `grading_scale_id` is None, default to first scale marked `is_default=1`

3. **Add Program-User Link**
   - `pub fn set_user_program(state: &State<DbState>, program_id: i64) -> Result<(), String>`
     - Update `user_profiles.program_id` for current session user
     - Validate program exists
   
   - `pub fn get_user_program(state: &State<DbState>) -> Result<Option<Program>, String>`
     - Fetch user's assigned program with all details

4. **Enhance Projection Settings Storage**
   - `pub fn save_projection_settings(state: &State<DbState>, target_cgpa: Option<f64>, horizon: Option<i32>) -> Result<(), String>`
     - Update `user_profiles.target_cgpa` and `user_profiles.horizon`
   
   - `pub fn get_projection_settings(state: &State<DbState>) -> Result<(Option<f64>, Option<i32>), String>`
     - Retrieve current target and horizon from user profile

##### Pseudocode Example:
```rust
pub fn get_grading_scales(state: &State<DbState>) -> Result<Vec<GradingScale>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, name, type, config, is_default FROM grading_scales ORDER BY is_default DESC")
        .map_err(|e| e.to_string())?;
    
    let scales = stmt.query_map([], |row| {
        let config_str: String = row.get(3)?;
        let config: GradingScaleConfig = serde_json::from_str(&config_str)
            .unwrap_or_default(); // or error handling
        Ok(GradingScale {
            id: row.get(0)?,
            name: row.get(1)?,
            type_: row.get(2)?,
            config,
            is_default: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;
    
    // Collect and return
}
```

#### 1.2 Export Backend Commands in `lib.rs`

**File**: `src-tauri/src/lib.rs`

**Add `#[tauri::command]` wrappers** for all functions from 1.1:

```rust
#[tauri::command]
pub fn get_grading_scales(state: State<DbState>) -> Result<Vec<GradingScale>, String> {
    grades::get_grading_scales(&state)
}

// ... repeat for all 15+ new functions
```

**Add dependencies to `src-tauri/Cargo.toml` if needed**:
```toml
serde_json = "1.0"
```

---

### Phase 2: Implement Grade Conversion & Calculation Logic (2-3 days)

#### 2.1 Create Conversion Engine (`src-tauri/src/conversion.rs`)

**New File**: `src-tauri/src/conversion.rs`

This module handles **score → grade point conversion** according to the selected grading scale.

##### Core Functions:

1. **`convert_numeric_score(score: f64, mapping: &[GradingScaleMapping]) -> Result<f64, String>`**
   - Input: Raw percentage/score (0-100 or 0-10 depending on input type)
   - Logic:
     - Find the highest mapping entry where `score >= min_percent`
     - Return the corresponding `point` value
     - If score falls below minimum, return 0.0 or raise error
   - Example: score=85 against 10-point scale → point=9.0

2. **`convert_letter_grade(grade: &str, mapping: &[GradingScaleMapping]) -> Result<f64, String>`**
   - Input: Letter grade string (e.g., "A", "B+", "A-")
   - Logic:
     - Case-insensitive lookup in mapping
     - Return matched `point` value
     - Error if not found
   - Example: grade="A" against 4.0 scale → point=4.0

3. **`get_letter_for_points(point: f64, mapping: &[GradingScaleMapping]) -> Option<String>`**
   - Reverse lookup: convert grade point back to letter
   - Used for display/visualization
   - Example: point=3.7 against 4.0 scale → letter="A-"

4. **`calculate_weighted_score(components: &[ComponentScore], config: &[ComponentConfig]) -> Result<f64, String>`**
   - Input: Component scores (exam, lab, assignment, etc.) + their weights
   - Logic:
     ```
     total_score = Σ(component_score * component_weight)
     total_weight = Σ(component_weight)
     weighted_avg = total_score / total_weight
     ```
   - Validation: Check `total_weight ≈ 1.0` (or allow flexible weighting)
   - Example:
     - Components: exam=85 (weight 0.7), assignment=90 (weight 0.3)
     - Result: (85 * 0.7 + 90 * 0.3) / 1.0 = 86.5

5. **`convert_course_score(components: Option<&[ComponentScore]>, config: Option<&[ComponentConfig]>, scale: &GradingScale, manual_override: Option<f64>) -> Result<f64, String>`**
   - **Two-mode conversion**:
     - **Component Mode**: If components & config provided
       - Calculate weighted score from components
       - Convert to grade points using scale
     - **Direct Mode**: If manual_override provided
       - Use override directly (assumes already in grade points)
     - **Priority**: manual_override > component calculation
   - Example flow:
     ```
     If manual_grade provided: return manual_grade
     Else if component_scores and component_config provided:
       weighted = calculate_weighted_score(...)
       points = convert_numeric_score(weighted, scale.mappings)
       return points
     Else: error("Insufficient data")
     ```

##### Data Structures (add to `grades.rs` or `conversion.rs`):

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct ComponentScore {
    pub name: String,
    pub score: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ComponentConfig {
    pub name: String,
    pub weight: f64,
}

#[derive(Debug)]
pub struct ConversionError {
    pub message: String,
}
```

#### 2.2 Create GPA Calculation Engine

**Expand in**: `src-tauri/src/grades.rs`

##### Core Functions:

1. **`calculate_semester_gpa(semester_id: i64, state: &State<DbState>, scale: &GradingScale) -> Result<(f64, f64), String>`**
   - Query all courses in the semester
   - For each course: get final grade point + credits
   - Formula: `semester_gpa = Σ(grade_point * credits) / Σ(credits)`
   - Return: `(gpa, total_credits)`

2. **`calculate_cgpa(state: &State<DbState>, scale: &GradingScale) -> Result<(f64, f64), String>`**
   - Query all completed courses across all semesters
   - Filter by `status = 'completed'` and `manual_grade IS NOT NULL`
   - Formula: `cgpa = Σ(grade_point * credits) / Σ(credits)`
   - Return: `(cgpa, total_credits)`
   - **Note**: Different scales have different max points (10, 4.0, etc.)

3. **Refactor `get_gpa_summary()`**
   - Currently: Hardcoded for direct grade points
   - New: Fetch user's program → get assigned scale → use scale for all calculations
   - Return enriched `GradeSummary` with scale info

#### 2.3 Add Conversion Tests

**File**: `src-tauri/src/conversion.rs` (bottom of file)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_numeric_conversion_10point() {
        // Test 90% → 10 points
    }

    #[test]
    fn test_letter_grade_conversion() {
        // Test "A" → 4.0
    }

    #[test]
    fn test_weighted_score() {
        // Test component weighting
    }
}
```

---

### Phase 3: Implement Grade Projection & Timeline Algorithm (2-3 days)

#### 3.1 Create Projection Engine (`src-tauri/src/projection.rs`)

**New File**: `src-tauri/src/projection.rs`

This module computes **future GPA requirements** and **feasibility analysis**.

##### Core Functions:

1. **`project_future_requirements(state: &State<DbState>) -> Result<ProjectionResult, String>`**
   
   **Input from database**:
   - Current CGPA (calculated from `calculate_cgpa()`)
   - Credits completed (sum of completed course credits)
   - User's program: total_required_credits, grading_scale (to get max_point)
   - User's target CGPA (from user_profiles.target_cgpa, default or user-set)
   - User's target term/horizon (from user_profiles.horizon)

   **Calculation**:
   ```
   credits_remaining = total_required_credits - credits_completed
   
   If credits_remaining <= 0:
     // User has completed all credits or more
     return ProjectionResult {
       feasible: true,
       message: "Degree complete",
       required_future_gpa: 0.0,
       ...
     }
   
   // Current grade points
   current_gp = current_cgpa * credits_completed
   
   // Target total grade points needed
   target_gp_total = target_cgpa * total_required_credits
   
   // Future grade points needed
   gp_needed_future = target_gp_total - current_gp
   
   // Average GPA required across remaining credits
   required_future_gpa = gp_needed_future / credits_remaining
   
   // Feasibility check
   max_scale_point = grading_scale.config.max_point
   feasible = required_future_gpa <= max_scale_point * 0.95  // 95% of max as "feasible"
   
   If required_future_gpa > max_scale_point:
     message = "INFEASIBLE: Requires {required_future_gpa} (max {max_scale_point})"
   Else if required_future_gpa > max_scale_point * 0.8:
     message = "CHALLENGING: Requires {required_future_gpa:.2f}/{max_scale_point}"
   Else:
     message = "FEASIBLE: Requires {required_future_gpa:.2f}/{max_scale_point}"
   
   return ProjectionResult {
     current_cgpa,
     target_cgpa,
     required_future_gpa,
     credits_completed,
     credits_remaining,
     feasible,
     message,
     horizon,
   }
   ```

   **Edge Cases**:
   - No completed courses → current_cgpa = 0.0, assume can improve
   - Target CGPA not set → use 7.0 (configurable default)
   - Horizon (semesters) specified → allocate targets per term (advanced feature)

2. **`get_per_semester_targets(projection: &ProjectionResult, remaining_semesters: Vec<Semester>, state: &State<DbState>) -> Result<Vec<SemesterTarget>, String>`**
   
   **Input**:
   - Projection result from above
   - List of remaining semesters
   - User's planned credits per semester (from semester.planned_credits)

   **Algorithm** (even distribution initially):
   ```
   For each semester in remaining_semesters:
     semester_credits = semester.planned_credits
     
     // Allocate a fraction of total remaining GPA
     fraction = semester_credits / credits_remaining
     semester_gp_needed = gp_needed_future * fraction
     semester_gpa_target = semester_gp_needed / semester_credits
     
     Add to results: {
       semester_id,
       semester_name,
       target_gpa: semester_gpa_target,
       planned_credits: semester_credits
     }
   ```

   **Smart Distribution** (future enhancement):
   - If any semester's target_gpa > max_scale_point → redistribute load to other terms
   - If semester has heavy course load (e.g., 30+ credits) → lower target expectation

3. **`get_per_course_targets(semester_id: i64, semester_target: f64, state: &State<DbState>) -> Result<Vec<CourseTarget>, String>`**
   
   **Input**:
   - Semester ID
   - Target GPA for that semester
   - All courses in semester with their credits

   **Algorithm**:
   ```
   For each course in semester:
     // Default: all courses get semester target GPA
     course_target_gpa = semester_target_gpa
     
     // Refinement: weight by difficulty/credits
     course_target_gpa_weighted = semester_target_gpa * (1 + difficulty_adjust)
     
     Add to results: {
       course_id,
       course_name,
       target_gpa: course_target_gpa,
       target_points: course_target_gpa * scale.max_point
     }
   ```

   **Note**: Simple version treats all courses equally; advanced version uses difficulty/importance multipliers

4. **`estimate_study_hours_needed(course_id: i64, target_gpa: f64, scale: &GradingScale, state: &State<DbState>) -> Result<i32, String>`**
   
   **Input**:
   - Course ID (to get credits, name)
   - Target GPA for course
   - Grading scale (to normalize to 0-1)
   - Current estimated performance (optional; default 50%)

   **Formula**:
   ```
   base_hours_per_credit = 10  // Configurable, default
   course_credits = course.credits
   difficulty_multiplier = 1.0  // From course metadata or default
   
   // Gap ratio: how much improvement needed?
   current_estimate = 5.0  // or fetch from user history
   max_point = scale.max_point
   
   gap_ratio = (target_gpa - current_estimate) / (max_point - current_estimate)
   gap_ratio = clamp(gap_ratio, 0.2, 1.0)  // Min 20%, max 100% of scale
   
   hours_needed = base_hours_per_credit * course_credits * difficulty_multiplier * gap_ratio
   
   return hours_needed as i32
   ```

   **Example**:
   ```
   Course: CS101, 4 credits, difficulty 1.2x, current ~6/10, target 9/10
   hours = 10 * 4 * 1.2 * ((9-6)/(10-6))
         = 10 * 4 * 1.2 * 0.75
         = 36 hours
   ```

##### Data Structures:

```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct ProjectionResult {
    pub current_cgpa: f64,
    pub target_cgpa: f64,
    pub required_future_gpa: f64,
    pub credits_completed: f64,
    pub credits_remaining: f64,
    pub feasible: bool,
    pub message: String,
    pub horizon: Option<i32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SemesterTarget {
    pub semester_id: i64,
    pub semester_name: String,
    pub target_gpa: f64,
    pub planned_credits: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CourseTarget {
    pub course_id: i64,
    pub course_name: String,
    pub target_gpa: f64,
    pub target_points: f64,
}
```

#### 3.2 Expose Projection Commands in `lib.rs`

**Add to**: `src-tauri/src/lib.rs`

```rust
#[tauri::command]
pub fn project_grades(state: State<DbState>) -> Result<ProjectionResult, String> {
    projection::project_future_requirements(&state)
}

#[tauri::command]
pub fn get_semester_targets(
    state: State<DbState>,
    projection: ProjectionResult,
) -> Result<Vec<SemesterTarget>, String> {
    // Fetch remaining semesters and call projection function
}

#[tauri::command]
pub fn get_course_targets(
    state: State<DbState>,
    semester_id: i64,
) -> Result<Vec<CourseTarget>, String> {
    // Fetch courses and compute targets
}

#[tauri::command]
pub fn estimate_study_hours(
    state: State<DbState>,
    course_id: i64,
    target_gpa: f64,
) -> Result<i32, String> {
    // Call projection::estimate_study_hours_needed
}
```

---

### Phase 4: Frontend Integration & UI Completion (2-3 days)

#### 4.1 Update React Components to Use Real Backend Commands

**File**: `src/components/Grades.tsx`

**Changes**:
- Replace `invoke('project_grades')` mock with real call validation
- Load `get_grading_scales()` on mount
- Load `get_programs()` for settings dialog
- Update `fetchSummary()` to pass scale information
- Implement "Add Semester" dialog with actual `create_semester()` call

**File**: `src/components/CourseGradeDialog.tsx`

**Changes**:
- On save: Call backend to:
  1. Parse component scores & config
  2. Call conversion function to get grade point
  3. Update course with `update_course_grade_details()`
- Display calculated grade point in real-time as user enters scores
- Support scale override per course

**File**: `src/components/GradeSettingsDialog.tsx`

**Changes**:
- Load programs from `get_programs()`
- Load scales from `get_grading_scales()`
- "Create Program" dialog should call `create_program()` with selected scale
- "Set Program" should call `set_user_program()`

#### 4.2 Add Visualization Components

**New Components** (or extend existing):
1. **`PerTermTargetChart`**: Bar chart showing semester-by-semester GPA targets vs. required
2. **`ProjectionTimeline`**: Gantt-style timeline showing feasibility window
3. **`StudyHoursEstimate`**: Breakdown of study hours by course

#### 4.3 Form Validation & Error Handling

- Validate component weights sum to ~1.0
- Validate credits > 0
- Validate semester dates (end > start)
- Friendly error messages for infeasible projections
- Show warnings when required_future_gpa > 80% of max scale

---

### Phase 5: Advanced Features (Optional, 3+ days)

#### 5.1 Retake Policy Engine

**New Module**: `src-tauri/src/retake_policy.rs`

Handles how repeated courses affect GPA:
- **Replace**: New grade replaces old (most common)
- **Average**: Compute average of all attempts
- **Best**: Keep highest grade only
- **All**: Count all attempts (uncommon)

**Functions**:
- `calculate_gpa_with_retakes(courses: Vec<Course>, policy: RetakePolicy) -> f64`

#### 5.2 Pass/Fail Course Handling

Courses marked as pass/fail should:
- Be **excluded from GPA calculation** (most common)
- Or map to default points (e.g., 0.5 * max_scale if passed)

**Update**: `calculate_cgpa()` to filter by course grading mode

#### 5.3 Transfer Credits

- Accept pre-populated credits that don't have grade points
- Include in credit count but exclude from GPA
- Mark as "transfer" in course status

#### 5.4 Adaptive Study Hour Calibration

Track actual study effort vs. performance:
- After each exam: user reports hours studied + actual score
- Update `base_hours_per_credit` multiplier based on user's historical accuracy
- ML-like approach: `base_hours = avg(previous_hours_for_similar_score_delta)`

#### 5.5 What-If Analysis

Allow users to simulate scenarios:
- "If I get 9.5 in CS101 and 8.0 in CS102, what's my CGPA?"
- Implement: `simulate_gpa(hypothetical_courses: Vec<Course>) -> f64`

#### 5.6 Analytics & Insights

**Dashboard additions**:
- Grade distribution (histogram)
- Semester-to-semester trend
- Difficulty vs. performance scatter plot
- Course performance heatmap (credits × GPA)

---

## Database Schema Reference

### Final Schema (after all migrations)

```sql
-- Grading Scales (predefined or custom)
CREATE TABLE grading_scales (
    id INTEGER PRIMARY KEY,
    name TEXT,           -- "10-point", "4.0 GPA", etc.
    type TEXT,          -- "numeric", "letter", "percentage"
    config JSON,        -- {"max_point": 10, "mappings": [...]}
    is_default BOOLEAN
);

-- Programs (degree programs)
CREATE TABLE programs (
    id INTEGER PRIMARY KEY,
    name TEXT,                      -- "BTech CS", "BA Economics"
    total_required_credits REAL,
    grading_scale_id INTEGER,       -- Foreign key
    duration_months INTEGER,
    created_at DATETIME
);

-- Semesters
CREATE TABLE semesters (
    id INTEGER PRIMARY KEY,
    name TEXT,
    start_date DATETIME,
    end_date DATETIME,
    planned_credits REAL,
    created_at DATETIME
);

-- Courses (repositories enhanced with grading)
ALTER TABLE repositories ADD:
    credits REAL,
    semester_id INTEGER,            -- FK to semesters
    manual_grade REAL,              -- Final grade point (direct entry)
    status TEXT,                    -- 'completed', 'in_progress', 'planned'
    component_config TEXT,          -- JSON: [{"name":"exam","weight":0.7}...]
    component_scores TEXT,          -- JSON: [{"name":"exam","score":85}...]
    grading_scale_id INTEGER;       -- FK to grading_scales (override)

-- User Profile Extensions
ALTER TABLE user_profiles ADD:
    program_id INTEGER,             -- FK to programs
    target_cgpa REAL,
    horizon INTEGER;                -- Semesters remaining for target
```

---

## API Command Checklist

### To Implement (Phase 1-3)

#### Grading Scales
- [ ] `get_grading_scales() -> Vec<GradingScale>`
- [ ] `get_grading_scale(id: i64) -> Option<GradingScale>`
- [ ] `create_grading_scale(name, type, config) -> i64`
- [ ] `update_grading_scale(id, ...) -> ()`
- [ ] `delete_grading_scale(id) -> ()`

#### Programs
- [ ] `get_programs() -> Vec<Program>`
- [ ] `get_program(id: i64) -> Option<Program>`
- [ ] `create_program(name, credits, scale_id) -> i64`
- [ ] `update_program(id, ...) -> ()`
- [ ] `set_user_program(program_id) -> ()`
- [ ] `get_user_program() -> Option<Program>`

#### Grade Conversion
- [ ] `convert_score_to_points(score, scale_id) -> f64`
- [ ] `convert_letter_to_points(letter, scale_id) -> f64`
- [ ] `calculate_weighted_component_score(components, config) -> f64`
- [ ] `calculate_course_final_grade(course_id) -> f64`

#### GPA Calculation
- [ ] `calculate_semester_gpa(semester_id) -> (f64, f64)` // (gpa, credits)
- [ ] `calculate_cgpa() -> (f64, f64)` // (cgpa, total_credits)
- [ ] `get_gpa_summary() -> GradeSummary` // Refactored

#### Projection
- [ ] `project_grades() -> ProjectionResult`
- [ ] `get_semester_targets(projection) -> Vec<SemesterTarget>`
- [ ] `get_course_targets(semester_id) -> Vec<CourseTarget>`
- [ ] `estimate_study_hours(course_id, target_gpa) -> i32`
- [ ] `save_projection_settings(target_cgpa, horizon) -> ()`

#### Enhanced Course Management
- [ ] `update_course_components(course_id, config, scores) -> ()`
- [ ] `set_course_grading_scale(course_id, scale_id) -> ()`

---

## Testing Strategy

### Unit Tests (Rust)

**Conversion Engine**:
```rust
#[test]
fn test_percent_to_10point_conversion() {
    // 85% → 9 points
}

#[test]
fn test_letter_to_4point_conversion() {
    // "A-" → 3.7 points
}

#[test]
fn test_weighted_component_avg() {
    // exam=80 (0.7) + lab=90 (0.3) → 83.0
}
```

**GPA Calculation**:
```rust
#[test]
fn test_semester_gpa_calculation() {
    // Course 1: 3 credits, 9 pts; Course 2: 4 credits, 8.5 pts
    // Expected CGPA: (9*3 + 8.5*4) / 7 ≈ 8.71
}

#[test]
fn test_cgpa_across_semesters() {
    // Semester 1 GPA; Semester 2 GPA → overall CGPA
}
```

**Projection**:
```rust
#[test]
fn test_feasible_projection() {
    // Current: 6.0 CGPA, 60/160 credits
    // Target: 7.0 CGPA
    // Expected: required_future_gpa ≈ 7.67 (feasible)
}

#[test]
fn test_infeasible_projection() {
    // Current: 3.0 CGPA, 100/120 credits
    // Target: 3.9 CGPA
    // Expected: required_future_gpa > 4.0 (infeasible)
}
```

### Integration Tests (React + Tauri)

- Create test user with test program
- Create 2 semesters with courses
- Verify GPA calculations match expected
- Verify projection messages are correct
- Test scale override per course

### Manual QA Checklist

- [ ] Onboarding: User selects program & scale
- [ ] Course Entry: User enters component scores, sees calculated grade point
- [ ] GPA View: Total CGPA and per-semester breakdown shown correctly
- [ ] Projection: Message updates when target CGPA changed via slider
- [ ] Edge Cases:
  - [ ] First semester (no prior courses)
  - [ ] All courses are pass/fail
  - [ ] Transfer credits included
  - [ ] Scale with letter grades displays letter in UI

---

## Known Limitations & Future Enhancements

### Current Limitations
1. **No retake handling** — each course counted once
2. **No pass/fail courses** — all courses affect GPA
3. **No transfer credits** — all credits must have grades
4. **Fixed weights** — can't dynamically adjust component weights per course type
5. **Single scale per program** — no mixed scales in same program
6. **No historical calibration** — study hours always use default base_hours

### Future Enhancements
1. **Retake Policy Management** — allow users to choose how repeats affect GPA
2. **Pass/Fail Mode** — separate handling for non-graded courses
3. **Honors/Specialization Tracking** — weighted GPA for certain courses
4. **Multi-scale Support** — different scales for different course groups
5. **Machine Learning Integration** — predict grades based on historical performance
6. **Collaborative Benchmarking** — compare pace against peers (anonymized)
7. **Export Transcripts** — generate official transcripts in multiple formats
8. **Bulk Import** — CSV import from student information systems

---

## Documentation & User Guides Needed

1. **Admin Guide**: How to configure custom grading scales
2. **User Guide**: How to set up program and track GPA
3. **Developer Guide**: How to extend conversion logic for new scale types
4. **Scale Configuration Handbook**: Pre-made configurations for common universities

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 (Data Access) | 1-2 days | DB schema complete |
| Phase 2 (Conversion) | 2-3 days | Phase 1 |
| Phase 3 (Projection) | 2-3 days | Phase 2 |
| Phase 4 (Frontend) | 2-3 days | Phase 1-3 |
| Phase 5 (Advanced) | 3+ days | All prior |
| **Total** | **10-14 days** | **Sequential** |

**Critical Path**: Phase 1 → Phase 2 → Phase 3 → Phase 4

---

## Rollout Strategy

### MVP (Minimum Viable Product)
- Phases 1-4
- Basic 10-point and 4.0 scales
- Single program per user
- Simple projection (no per-semester allocation)
- ✅ Ready for onboarding flow

### Phase 2 (Post-MVP)
- Phase 5.1 - 5.2: Retake & pass/fail
- Advanced visualization
- Study hour calibration

### Phase 3 (Polish)
- Phase 5.3 - 5.6: Transfer credits, analytics, what-if

---

## References & Examples

### Example: 10-Point System (India)
```json
{
  "name": "Standard 10-point",
  "type": "numeric",
  "max_point": 10,
  "mappings": [
    {"min_percent": 90, "point": 10},
    {"min_percent": 80, "point": 9},
    {"min_percent": 70, "point": 8},
    {"min_percent": 60, "point": 7},
    {"min_percent": 50, "point": 6},
    {"min_percent": 40, "point": 5},
    {"min_percent": 0, "point": 0}
  ]
}
```

### Example: 4.0 Scale (US)
```json
{
  "name": "US 4.0 GPA",
  "type": "letter",
  "max_point": 4.0,
  "mappings": [
    {"letter": "A", "point": 4.0},
    {"letter": "A-", "point": 3.7},
    {"letter": "B+", "point": 3.3},
    {"letter": "B", "point": 3.0},
    {"letter": "B-", "point": 2.7},
    {"letter": "C+", "point": 2.3},
    {"letter": "C", "point": 2.0},
    {"letter": "D", "point": 1.0},
    {"letter": "F", "point": 0.0}
  ]
}
```

### Example: Course with Components
```json
{
  "course_id": 5,
  "component_config": [
    {"name": "exam", "weight": 0.7},
    {"name": "lab", "weight": 0.2},
    {"name": "assignment", "weight": 0.1}
  ],
  "component_scores": [
    {"name": "exam", "score": 78},
    {"name": "lab", "score": 85},
    {"name": "assignment", "score": 92}
  ],
  "calculation": "78*0.7 + 85*0.2 + 92*0.1 = 80.9"
}
```

---

## Conclusion

This flexible grading system enables the app to serve a **global student population** with vastly different institutional standards. The phased implementation approach ensures:

✅ **Foundation** (Phases 1-2): Core conversion & calculation  
✅ **Projection** (Phase 3): Forward-looking GPA planning  
✅ **UX Completion** (Phase 4): Seamless user experience  
✅ **Polish & Advanced** (Phase 5): Retakes, analytics, what-if analysis  

The modular architecture (separate conversion, projection, grading modules) makes it easy to extend, test, and maintain. All code will be well-documented for future maintainers.
