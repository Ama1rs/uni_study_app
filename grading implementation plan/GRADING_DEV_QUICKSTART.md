# Flexible Grading System - Developer Quick Reference

**Purpose**: Quick lookup guide for implementing grading features  
**Audience**: Developers working on Phases 1-5

---

## Architecture Overview

```
Frontend (React)                  Backend (Tauri/Rust)           Database (SQLite)
├─ Grades.tsx          ──────>    ├─ lib.rs (#[tauri::cmd])     ├─ grading_scales
├─ CourseGradeDialog   ──────>    ├─ grades.rs (data access)    ├─ programs
├─ GradeSettingsDialog ──────>    ├─ conversion.rs (PHASE 2)     ├─ semesters
│                                  ├─ projection.rs (PHASE 3)     └─ repositories (enhanced)
│                                  └─ inference.rs (LLM)
```

**Data Flow**:
```
User Input → Frontend Component
           → invoke() command
           → Backend (Tauri)
           → Database Query
           ← JSON Response
           → State Update
           → Re-render
```

---

## Phase 1: Data Access Layer

### What to Implement
Create functions in `src-tauri/src/grades.rs` and expose via `lib.rs`

### Template Pattern
```rust
// In grades.rs
pub fn get_something(state: &State<DbState>) -> Result<Vec<Thing>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT ... FROM ...")
        .map_err(|e| e.to_string())?;
    
    let items = stmt
        .query_map([], |row| {
            Ok(Thing {
                field1: row.get(0)?,
                field2: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for item in items {
        result.push(item.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

// In lib.rs
#[tauri::command]
pub fn get_something(state: State<DbState>) -> Result<Vec<Thing>, String> {
    grades::get_something(&state)
}
```

### Checklist
- [ ] `get_grading_scales()` — Query all scales with parsed JSON config
- [ ] `get_grading_scale(id)` — Single scale lookup
- [ ] `create_grading_scale(name, type, config)` — Insert new
- [ ] `get_programs()` — All programs
- [ ] `get_program(id)` — Single program
- [ ] `create_program(name, credits, scale_id)` — Insert new
- [ ] `set_user_program(program_id)` — Update user's program
- [ ] `get_user_program()` — Get user's current program

### Testing Example
```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_get_grading_scales_returns_defaults() {
        // Setup: Create in-memory DB with seed data
        // Call: get_grading_scales()
        // Assert: Returns ≥2 scales (10-point, 4.0)
    }
}
```

---

## Phase 2: Conversion & GPA Engine

### What to Implement
Create NEW file: `src-tauri/src/conversion.rs`

### Core Functions

#### 1. Numeric Score Conversion
```rust
pub fn convert_numeric_score(
    score: f64,
    mappings: &[GradingScaleMapping]
) -> Result<f64, String> {
    // Find highest mapping where score >= min_percent
    // Return corresponding point value
    
    let mapping = mappings
        .iter()
        .filter(|m| m.min_percent.is_some() && score >= m.min_percent.unwrap())
        .max_by(|a, b| {
            let a_min = a.min_percent.unwrap_or(0.0);
            let b_min = b.min_percent.unwrap_or(0.0);
            a_min.partial_cmp(&b_min).unwrap()
        })
        .ok_or("Score below minimum")?;
    
    Ok(mapping.point)
}
```

#### 2. Letter Grade Conversion
```rust
pub fn convert_letter_grade(
    grade: &str,
    mappings: &[GradingScaleMapping]
) -> Result<f64, String> {
    mappings
        .iter()
        .find(|m| m.letter.as_deref() == Some(grade))
        .map(|m| m.point)
        .ok_or(format!("Letter grade {} not found", grade))
}
```

#### 3. Weighted Component Average
```rust
pub fn calculate_weighted_score(
    components: &[ComponentScore],
    config: &[ComponentConfig]
) -> Result<f64, String> {
    let total_weight: f64 = config.iter().map(|c| c.weight).sum();
    
    if (total_weight - 1.0).abs() > 0.01 {
        return Err(format!("Total weight {} != 1.0", total_weight));
    }
    
    let weighted_sum: f64 = config
        .iter()
        .map(|cfg| {
            components
                .iter()
                .find(|sc| sc.name == cfg.name)
                .map(|sc| sc.score * cfg.weight)
                .unwrap_or(0.0)
        })
        .sum();
    
    Ok(weighted_sum)
}
```

#### 4. Two-Mode Course Conversion
```rust
pub fn convert_course_score(
    components: Option<&[ComponentScore]>,
    config: Option<&[ComponentConfig]>,
    scale: &GradingScale,
    manual_override: Option<f64>
) -> Result<f64, String> {
    // Priority: manual > component > error
    
    if let Some(manual) = manual_override {
        return Ok(manual);
    }
    
    if let (Some(comps), Some(cfg)) = (components, config) {
        let weighted_score = calculate_weighted_score(comps, cfg)?;
        
        match scale.type_.as_str() {
            "numeric" => convert_numeric_score(weighted_score, &scale.config.mappings),
            "letter" => Err("Can't convert numeric to letter mode".to_string()),
            _ => Err(format!("Unknown scale type: {}", scale.type_)),
        }
    } else {
        Err("No score data available".to_string())
    }
}
```

### Expose in lib.rs
```rust
#[tauri::command]
pub fn convert_score_to_points(
    score: f64,
    scale_id: i64,
    state: State<DbState>
) -> Result<f64, String> {
    let scale = grades::get_grading_scale(&state, scale_id)?
        .ok_or("Scale not found")?;
    conversion::convert_numeric_score(score, &scale.config.mappings)
}
```

### Refactor GPA Summary
```rust
pub fn get_gpa_summary(state: State<DbState>) -> Result<GradeSummary, String> {
    // 1. Get user's program
    let program = grades::get_user_program(&state)?
        .ok_or("No program assigned")?;
    
    // 2. Get program's grading scale
    let scale = grades::get_grading_scale(&state, program.grading_scale_id)?
        .ok_or("Scale not found")?;
    
    // 3. Fetch all completed courses
    let courses: Vec<_> = get_repositories(&state)?
        .into_iter()
        .filter(|c| c.status == "completed" && c.manual_grade.is_some())
        .collect();
    
    // 4. Calculate using scale
    let mut total_gp = 0.0;
    let mut total_cred = 0.0;
    
    for course in courses {
        let gp = course.manual_grade.unwrap(); // Already converted
        let points = gp * course.credits;
        total_gp += points;
        total_cred += course.credits;
    }
    
    let cgpa = if total_cred > 0.0 { total_gp / total_cred } else { 0.0 };
    
    Ok(GradeSummary {
        cgpa,
        total_credits: total_cred,
        points_secured: total_gp,
        semester_gpas: vec![], // Calculate per semester similarly
    })
}
```

---

## Phase 3: Projection Engine

### What to Implement
Create NEW file: `src-tauri/src/projection.rs`

### Main Algorithm
```rust
pub fn project_future_requirements(
    state: &State<DbState>
) -> Result<ProjectionResult, String> {
    // 1. Fetch prerequisites
    let program = grades::get_user_program(state)?
        .ok_or("No program")?;
    let scale = grades::get_grading_scale(state, program.grading_scale_id)?
        .ok_or("No scale")?;
    let (current_cgpa, credits_completed) = calculate_cgpa_with_details(state)?;
    let (target_cgpa, _) = grades::get_projection_settings(state)?;
    let target_cgpa = target_cgpa.unwrap_or(7.0); // Default
    
    // 2. Calculate
    let credits_remaining = program.total_required_credits - credits_completed;
    
    if credits_remaining <= 0.0 {
        return Ok(ProjectionResult {
            current_cgpa,
            target_cgpa,
            required_future_gpa: 0.0,
            credits_completed,
            credits_remaining: 0.0,
            feasible: true,
            message: "Degree complete".to_string(),
            horizon: None,
        });
    }
    
    let current_gp = current_cgpa * credits_completed;
    let target_gp_total = target_cgpa * program.total_required_credits;
    let gp_needed_future = target_gp_total - current_gp;
    let required_future_gpa = gp_needed_future / credits_remaining;
    
    let max_point = scale.config.max_point;
    let feasible = required_future_gpa <= max_point * 0.95;
    
    let message = if required_future_gpa > max_point {
        format!("INFEASIBLE: {:.2}/{:.1}", required_future_gpa, max_point)
    } else if required_future_gpa > max_point * 0.8 {
        format!("CHALLENGING: {:.2}/{:.1}", required_future_gpa, max_point)
    } else {
        format!("FEASIBLE: {:.2}/{:.1}", required_future_gpa, max_point)
    };
    
    Ok(ProjectionResult {
        current_cgpa,
        target_cgpa,
        required_future_gpa,
        credits_completed,
        credits_remaining,
        feasible,
        message,
        horizon: None,
    })
}
```

### Expose in lib.rs
```rust
#[tauri::command]
pub fn project_grades(state: State<DbState>) -> Result<ProjectionResult, String> {
    projection::project_future_requirements(&state)
}

#[tauri::command]
pub fn save_projection_settings(
    state: State<DbState>,
    target_cgpa: Option<f64>,
    horizon: Option<i32>
) -> Result<(), String> {
    grades::save_projection_settings(&state, target_cgpa, horizon)
}
```

---

## Phase 4: Frontend Integration

### Key Components to Update

#### Grades.tsx
```tsx
// Before: Mock data
const [projection, setProjection] = useState<ProjectionResult | null>(null);

// After: Real data
useEffect(() => {
    const fetchProjection = async () => {
        try {
            const proj = await invoke<ProjectionResult>('project_grades');
            setProjection(proj);
        } catch (e) {
            console.error('Projection failed:', e);
        }
    };
    fetchProjection();
}, []);
```

#### CourseGradeDialog.tsx
```tsx
const handleSave = async () => {
    try {
        // 1. Calculate weighted score if components provided
        let finalGrade = manualGrade;
        if (mode === 'component' && configs.length > 0) {
            const weighted = configs.reduce((acc, cfg) => {
                const score = scores.find(s => s.name === cfg.name)?.score || 0;
                return acc + (score * cfg.weight);
            }, 0);
            
            // 2. Convert using scale
            const scale = scales.find(s => s.id === selectedScaleId);
            if (scale) {
                // Call backend conversion
                const points = await invoke<number>('convert_score_to_points', {
                    score: weighted,
                    scale_id: scale.id
                });
                finalGrade = points.toString();
            }
        }
        
        // 3. Save course
        await invoke('update_course_grade_details', {
            repository_id: course.id,
            credits: course.credits,
            semester_id: course.semester_id,
            manual_grade: parseFloat(finalGrade),
            status: 'completed'
        });
        
        onUpdate();
    } catch (e) {
        console.error('Save failed:', e);
    }
};
```

#### GradeSettingsDialog.tsx
```tsx
const handleCreateProgram = async () => {
    try {
        const id = await invoke<number>('create_program', {
            name: newProgramName,
            total_required_credits: parseFloat(newProgramCredits),
            grading_scale_id: newProgramScaleId || null
        });
        
        await invoke('set_user_program', {
            program_id: id
        });
        
        onSave();
        onClose();
    } catch (e) {
        console.error('Create program failed:', e);
    }
};
```

---

## Common Mistakes to Avoid

### ❌ Don't:
```rust
// Don't hardcode scale types
if scale_name == "10-point" { ... }

// Don't assume grade is in points
total += grade * credits; // If grade is percentage, this is wrong

// Don't forget error handling
let config: Config = serde_json::from_str(&json_str).unwrap();

// Don't forget to lock/unlock mutex
let conn = state.conn.lock(); // Forgot to unwrap!
```

### ✅ Do:
```rust
// Use scale type field
match scale.type_.as_str() {
    "numeric" => { ... }
    "letter" => { ... }
}

// Convert score first
let points = convert_numeric_score(grade, &scale.mappings)?;
total += points * credits;

// Handle errors properly
let config: Config = serde_json::from_str(&json_str)
    .map_err(|e| format!("Invalid config: {}", e))?;

// Proper mutex handling
let conn = state.conn.lock().map_err(|e| e.to_string())?;
```

---

## Testing Checklist

### For Each Phase:

#### Phase 1
- [ ] Can create/read grading scale
- [ ] Can create/read program
- [ ] User can set their program
- [ ] Seed data loads on migration

#### Phase 2
- [ ] Numeric score converts correctly (90% → 9 pts on 10-point)
- [ ] Letter converts correctly ("A" → 4.0 on 4.0 scale)
- [ ] Weighted average calculated correctly
- [ ] Two-mode conversion works (manual override wins)
- [ ] GPA summary uses correct scale

#### Phase 3
- [ ] Feasible projection shows "FEASIBLE"
- [ ] Infeasible projection shows "INFEASIBLE"
- [ ] Required GPA calculation is mathematically correct
- [ ] Edge cases handled (0 credits completed, already done)

#### Phase 4
- [ ] Dialog saves grades successfully
- [ ] GPA updates after saving
- [ ] Projection updates when target changed
- [ ] Settings persist across sessions

---

## Debug Tips

### Check Database
```sql
-- See all scales
SELECT * FROM grading_scales;

-- See user's program
SELECT up.*, p.* FROM user_profiles up
LEFT JOIN programs p ON up.program_id = p.id;

-- See course with components
SELECT * FROM repositories WHERE id = 5;
-- Then manually parse component_config & component_scores JSON
```

### Check Tauri Logs
```
In browser: F12 → Console
Look for: "Invoke command failed", errors from backend
```

### Test Conversion Manually
```rust
// In a test or REPL
let scale = GradingScale {
    config: GradingScaleConfig {
        max_point: 10.0,
        mappings: vec![
            GradingScaleMapping { min_percent: Some(90.0), letter: None, point: 10.0 },
            GradingScaleMapping { min_percent: Some(80.0), letter: None, point: 9.0 },
        ]
    },
    ..Default::default()
};

let points = convert_numeric_score(85.0, &scale.config.mappings)?;
println!("85% → {} points", points); // Should be 9.0
```

---

## File Locations Quick Reference

| File | Purpose | Status |
|------|---------|--------|
| `src-tauri/src/lib.rs` | Command exports | ⚠️ Partial |
| `src-tauri/src/grades.rs` | Data access | ⚠️ Partial |
| `src-tauri/src/conversion.rs` | Score conversion | ❌ NEW |
| `src-tauri/src/projection.rs` | GPA projection | ❌ NEW |
| `src/types/grading.ts` | TypeScript types | ✅ Complete |
| `src/components/Grades.tsx` | Main dashboard | ⚠️ Partial |
| `src/components/CourseGradeDialog.tsx` | Grade editor | ⚠️ Partial |
| `src-tauri/migrations/0008_*.sql` | DB schema | ✅ Complete |
| `src-tauri/migrations/0010_*.sql` | Flexible schema | ✅ Complete |

---

## Useful SQL Queries

### Get all courses for a semester
```sql
SELECT r.* FROM repositories r
WHERE r.semester_id = ?
ORDER BY r.name;
```

### Calculate semester GPA
```sql
SELECT 
    SUM(r.manual_grade * r.credits) / SUM(r.credits) as semester_gpa,
    SUM(r.credits) as total_credits
FROM repositories r
WHERE r.semester_id = ? AND r.manual_grade IS NOT NULL;
```

### Get user's program with scale
```sql
SELECT p.*, gs.* FROM user_profiles up
JOIN programs p ON up.program_id = p.id
JOIN grading_scales gs ON p.grading_scale_id = gs.id
LIMIT 1;
```

---

## Performance Considerations

### Optimize Queries
- Index on `repositories.semester_id`
- Index on `user_profiles.program_id`
- Index on `repositories.status` (for filtering completed)

### Cache Opportunities
- Cache user's program (rarely changes)
- Cache grading scales (read-only)
- Recompute GPA on-demand or on save

### Keep Responsive
- Don't fetch all courses on page load if >1000
- Paginate or lazy-load course lists
- Defer projection calculation until needed

---

## Resources & References

- **Backend**: `FLEXIBLE_GRADING_IMPLEMENTATION_PLAN.md` (detailed)
- **Status**: `GRADING_SYSTEM_STATUS.md` (what's done/needed)
- **Tauri Docs**: https://tauri.app/docs
- **TypeScript**: `src/types/grading.ts`
- **Examples**: See existing commands in `lib.rs`

---

*Last Updated: December 13, 2025*
