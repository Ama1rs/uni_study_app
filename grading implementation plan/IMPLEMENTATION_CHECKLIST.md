# Implementation Checklist - Flexible Grading System

**Use this checklist to track progress through all phases**

---

## PHASE 1: Data Access Layer (1-2 days)

### Grading Scales Management
- [x] **Function**: `get_grading_scales()` in `grades.rs`
  - [x] Query all scales from database
  - [x] Parse JSON config for each scale
  - [x] Return `Vec<GradingScale>`
  - [x] Unit test: Returns ≥2 default scales
- [x] **Function**: `get_grading_scale(id: i64)` in `grades.rs`
  - [x] Query single scale by ID
  - [x] Handle not found error
  - [x] Return `Option<GradingScale>`
  - [x] Unit test: Correct scale returned

- [x] **Function**: `create_grading_scale()` in `grades.rs`
  - [x] Validate type is valid
  - [x] Validate JSON config format
  - [x] Insert into database
  - [x] Return new ID
  - [x] Unit test: New scale is retrievable

- [x] **Expose in lib.rs**:
  - [x] `#[tauri::command] get_grading_scales()`
  - [x] `#[tauri::command] get_grading_scale(id)`
  - [x] `#[tauri::command] create_grading_scale(...)`

### Programs Management
- [x] **Function**: `get_programs()` in `grades.rs`
  - [x] Query all programs
  - [x] Include scale relationship
  - [x] Return `Vec<Program>`
  - [x] Unit test: Returns all programs

- [x] **Function**: `get_program(id: i64)` in `grades.rs`
  - [x] Query single program with scale
  - [x] Return `Option<Program>`
  - [x] Unit test: Correct program returned

- [x] **Function**: `create_program()` in `grades.rs`
  - [x] Validate inputs
  - [x] Default to first scale if not specified
  - [x] Insert into database
  - [x] Return new ID
  - [x] Unit test: New program is retrievable

- [x] **Function**: `set_user_program(program_id: i64)` in `grades.rs`
  - [x] Update current user's program_id
  - [x] Validate program exists
  - [x] Update user_profiles table
  - [x] Return Result
  - [x] Unit test: Program updated

- [x] **Function**: `get_user_program()` in `grades.rs`
  - [x] Get current user's program with scale
  - [x] Return `Option<Program>`
  - [x] Handle no program assigned
  - [x] Unit test: Correct program returned

- [x] **Expose in lib.rs**:
  - [x] `#[tauri::command] get_programs()`
  - [x] `#[tauri::command] get_program(id)`
  - [x] `#[tauri::command] create_program(...)`
  - [x] `#[tauri::command] set_user_program(id)`
  - [x] `#[tauri::command] get_user_program()`

### Projection Settings
- [x] **Function**: `save_projection_settings()` in `grades.rs`
  - [x] Update user_profiles.target_cgpa
  - [x] Update user_profiles.horizon
  - [x] Handle partial updates
  - [x] Unit test: Settings saved

- [x] **Function**: `get_projection_settings()` in `grades.rs`
  - [x] Fetch target_cgpa and horizon
  - [x] Return `(Option<f64>, Option<i32>)`
  - [x] Unit test: Settings retrieved

- [x] **Expose in lib.rs**:
  - [x] `#[tauri::command] save_projection_settings(...)`
  - [x] `#[tauri::command] get_projection_settings()`

### Frontend Integration - Phase 1
- [x] **Grades.tsx**: Update `fetchScales()`
  - [x] Remove mock data
  - [x] Call `invoke('get_grading_scales')`
  - [x] Handle response
  - [x] Test in browser

- [x] **GradeSettingsDialog.tsx**: Load programs
  - [x] Call `invoke('get_programs')` on load
  - [x] Display in dropdown
  - [x] Implement "Create Program" flow
  - [x] Call `invoke('create_program', {...})`
  - [x] Call `invoke('set_user_program', id)`
  - [x] Test form submission

### Testing - Phase 1
- [x] Unit tests written for each function
- [x] Database tests (in-memory SQLite)
- [x] Error cases tested
- [x] All tests passing ✅
- [x] Coverage report generated

### Documentation - Phase 1
- [x] Code comments added
- [x] Function signatures documented
- [x] Error conditions documented
- [x] Example usage shown

---

## PHASE 2: Conversion & GPA Engine (2-3 days)

### Create conversion.rs Module
- [x] **File**: Create `src-tauri/src/conversion.rs`
- [x] **Add imports**: serde, GradingScale types
- [x] **Add module declaration** to `lib.rs`

### Numeric Score Conversion
- [x] **Function**: `convert_numeric_score(score: f64, mappings: &[...]) -> Result<f64, String>`
  - [x] Find highest matching mapping
  - [x] Return corresponding point value
  - [x] Error if score below minimum
  - [x] Unit test: 85% → 9 points (10-scale)
  - [x] Unit test: Edge cases (boundary values)
  - [x] Unit test: Below minimum error

### Letter Grade Conversion
- [x] **Function**: `convert_letter_grade(grade: &str, mappings: &[...]) -> Result<f64, String>`
  - [x] Case-insensitive lookup
  - [x] Return matched point value
  - [x] Error if not found
  - [x] Unit test: "A" → 4.0 (4.0 scale)
  - [x] Unit test: "A-" → 3.7
  - [x] Unit test: Invalid grade error

### Reverse Letter Lookup
- [x] **Function**: `get_letter_for_points(point: f64, mappings: &[...]) -> Option<String>`
  - [x] Reverse lookup: point → letter
  - [x] Used for display
  - [x] Unit test: 4.0 → "A"

### Weighted Component Average
- [x] **Function**: `calculate_weighted_score(components: &[ComponentScore], config: &[ComponentConfig]) -> Result<f64, String>`
  - [x] Sum weighted scores
  - [x] Validate total weight ≈ 1.0
  - [x] Return weighted average
  - [x] Unit test: 85*0.7 + 90*0.3 = 86.5
  - [x] Unit test: Weight validation
  - [x] Unit test: Missing component

### Two-Mode Course Conversion
- [x] **Function**: `convert_course_score(...) -> Result<f64, String>`
  - [x] Priority: manual > components
  - [x] Mode 1: Direct grade point entry
  - [x] Mode 2: Calculate from components
  - [x] Call appropriate conversion function
  - [x] Unit test: Manual override wins
  - [x] Unit test: Component mode works
  - [x] Unit test: Insufficient data error

### Expose Conversions in lib.rs & as Tauri Commands
- [x] **Command**: `#[tauri::command] convert_score_to_points(...)`
  - [x] Takes score and scale_id
  - [x] Returns grade points
  - [x] Includes error handling

- [x] **Command**: `#[tauri::command] convert_letter_to_points(...)`
  - [x] Takes letter and scale_id
  - [x] Returns grade points

- [x] **Command**: `#[tauri::command] calculate_weighted_component_score(...)`
  - [x] Takes components and config
  - [x] Returns weighted average

- [x] **Command**: `#[tauri::command] convert_course_grade_to_points(...)`
  - [x] Takes manual/components and scale_id
  - [x] Returns final grade point

### Refactor GPA Calculations
- [x] **Refactor**: `get_gpa_summary()` in `grades.rs`
  - [x] Get user's program
  - [x] Get program's grading scale
  - [x] Use scale in calculation
  - [x] Return accurate CGPA
  - [x] Unit test: Multiple scales tested

- [x] **New Function**: `calculate_semester_gpa(semester_id: i64, scale: &GradingScale) -> Result<(f64, f64), String>`
  - [x] Query courses in semester
  - [x] Group by semester
  - [x] Calculate GPA = Σ(points * credits) / Σ(credits)
  - [x] Return (gpa, total_credits)
  - [x] Unit test: Correct calculation

- [x] **New Function**: `calculate_cgpa(scale: &GradingScale) -> Result<(f64, f64), String>`
  - [x] Query all completed courses
  - [x] Calculate weighted average
  - [x] Return (cgpa, total_credits)
  - [x] Unit test: Across multiple semesters

### Frontend Integration - Phase 2
- [x] **CourseGradeDialog.tsx**: Implement grade conversion
  - [x] Component mode: Calculate weighted score
  - [x] Call `invoke('convert_score_to_points', {...})`
  - [x] Display converted grade point
  - [x] Save final grade
  - [x] Test grade entry flow

- [x] **Grades.tsx**: Update GPA display
  - [x] Call real `get_gpa_summary()`
  - [x] Display semester GPAs
  - [x] Display overall CGPA
  - [x] Show scale name
  - [x] Test accuracy

### Testing - Phase 2
- [ ] 15+ unit tests for conversion functions
- [ ] Edge cases: boundary values, missing data
- [ ] Integration tests: conversion → GPA flow
- [ ] All tests passing ✅
- [ ] Coverage >90%

---

## PHASE 3: Projection Engine (2-3 days)

### Create projection.rs Module
- [x] **File**: Create `src-tauri/src/projection.rs`
- [x] **Add imports**: GradingScale, ProjectionResult types
- [x] **Add module declaration** to `lib.rs`

### Main Projection Function
- [x] **Function**: `project_future_requirements(state: &State<DbState>) -> Result<ProjectionResult, String>`
  - [x] Get user's program
  - [x] Get user's target CGPA (or default)
  - [x] Get user's current CGPA and credits done
  - [x] Calculate credits remaining
  - [x] Calculate required future GPA
  - [x] Determine feasibility
  - [x] Generate message
  - [x] Unit test: Feasible scenario
  - [x] Unit test: Infeasible scenario
  - [x] Unit test: Already complete
  - [x] Unit test: Zero credits done

### Per-Semester Targets
- [x] **Function**: `get_per_semester_targets(...) -> Result<Vec<SemesterTarget>, String>`
  - [x] Allocate remaining GPA across terms
  - [x] Even distribution initially
  - [x] Calculate per-semester target
  - [x] Return semester targets
  - [x] Unit test: Correct allocation
  - [x] Unit test: Weighted distribution (future)

### Per-Course Targets
- [x] **Function**: `get_per_course_targets(...) -> Result<Vec<CourseTarget>, String>`
  - [x] Get semester target GPA
  - [x] Assign to each course
  - [x] Consider course difficulty (future)
  - [x] Return course targets
  - [x] Unit test: All courses assigned

### Study Hours Estimation
- [x] **Function**: `estimate_study_hours_needed(...) -> Result<i32, String>`
  - [x] Get course credits
  - [x] Get target GPA
  - [x] Get grading scale max
  - [x] Calculate gap ratio
  - [x] Apply base_hours multiplier
  - [x] Return total hours
  - [x] Unit test: Example from spec
  - [x] Unit test: Edge cases

### Expose Projection in lib.rs
- [x] **Command**: `#[tauri::command] project_grades()`
  - [x] Call projection function
  - [x] Return ProjectionResult
  - [x] Include error handling

- [x] **Command**: `#[tauri::command] get_semester_targets(...)`
  - [x] Returns per-semester targets

- [x] **Command**: `#[tauri::command] get_course_targets(...)`
  - [x] Returns per-course targets

- [x] **Command**: `#[tauri::command] estimate_study_hours(...)`
  - [x] Returns estimated hours

### Feasibility Decision Logic
- [x] Decision tree implemented
  - [x] INFEASIBLE: required_future_gpa > max_point
  - [x] CHALLENGING: required > 80% of max
  - [x] FEASIBLE: required > 50% of max
  - [x] EASY: required ≤ 50% of max
  - [x] Unit test: Each path tested

### Frontend Integration - Phase 3
- [x] **Grades.tsx**: Load projection
  - [x] Call `invoke('project_grades')` on load
  - [x] Handle response
  - [x] Display in dashboard
  - [x] Update on target change

- [x] **Grades.tsx**: Make target slider interactive
  - [x] User adjusts target CGPA
  - [x] Call `invoke('save_projection_settings', {...})`
  - [x] Re-fetch projection
  - [x] Update display in real-time
  - [x] Test slider responsiveness

- [x] **Add Visualizations**:
  - [x] Target line on bar chart
  - [x] Feasibility message/badge
  - [x] Required future GPA displayed
  - [x] Test all visualizations

### Testing - Phase 3
- [x] 10+ unit tests for projection functions
- [x] Mathematical accuracy tests
- [x] Edge cases: no credits, already done, target too high
- [x] Feasibility logic tests (all 4 branches)
- [x] All tests passing ✅
- [x] Coverage >90%

---

## PHASE 4: Frontend Integration (2-3 days)

### Connect Grades Component
- [x] **Grades.tsx**: Data fetching
  - [x] Replace mock `semesters` with real data (via get_semesters)
  - [x] Replace mock `courses` with real data (via get_repositories)
  - [x] Replace mock `summary` with real data (via get_gpa_summary)
  - [x] Replace mock `projection` with real data (via project_grades)
  - [x] Replace mock `scales` with real data (via get_grading_scales)
  - [x] Test all fetches working

- [x] **Grades.tsx**: Display updates
  - [x] Show actual CGPA (from summary.cgpa)
  - [x] Show actual credits (from summary.total_credits)
  - [x] Show semester breakdown (from summary.semester_gpas)
  - [x] Show projection timeline (from projection.*)
  - [x] Show feasibility message (projection.message)
  - [x] Test all displays accurate

- [x] **Grades.tsx**: Semester management
  - [x] Add semester dialog works
  - [x] Call `invoke('create_semester', {...})`
  - [x] New semester appears in list
  - [x] Test add flow

### Connect CourseGradeDialog
- [x] **Dialog**: Grade entry modes
  - [x] Direct mode: Enter grade point, save
  - [x] Component mode: Enter scores, calculate, save
  - [x] Mode switching works smoothly
  - [x] Test both modes

- [x] **Dialog**: Grade conversion
  - [x] Call `invoke('convert_score_to_points', {...})`
  - [x] Display converted grade point in real-time
  - [x] Update as user types
  - [x] Test conversion accuracy

- [x] **Dialog**: Save flow
  - [x] Call `invoke('update_course_grade_details', {...})`
  - [x] Close dialog on success
  - [x] Show error on failure
  - [x] Test error handling

- [x] **Dialog**: Scale selection
  - [x] Show available scales
  - [x] Allow per-course override
  - [x] Save selected scale
  - [x] Test override logic

### Connect GradeSettingsDialog
- [x] **Dialog**: Load programs
  - [x] Call `invoke('get_programs')` on open
  - [x] Display in list/dropdown
  - [x] Test program loading

- [x] **Dialog**: Select program
  - [x] User clicks program
  - [x] Call `invoke('set_user_program', id)`
  - [x] Dialog closes on success
  - [x] Test selection

- [x] **Dialog**: Create program
  - [x] Show form for new program
  - [x] Get name, total credits, scale
  - [x] Call `invoke('create_program', {...})`
  - [x] New program selected automatically
  - [x] Test creation flow

### Update All invoke() Calls
- [x] **Remove mock data** from all Grades components
- [x] **Replace with real API calls** to all backend commands
- [x] **Add error handling** for all calls
- [x] **Add loading states** for async operations
- [x] **Test each invoke call** works end-to-end

### Error Handling & Edge Cases
- [x] **Handle no program assigned**
  - [x] Show setup prompt
  - [x] Guide to settings
  - [x] Test flow

- [x] **Handle no courses**
  - [x] Show empty state
  - [x] Prompt to add course
  - [x] Test display

- [x] **Handle missing data**
  - [x] Show defaults/placeholders
  - [x] Don't crash
  - [x] Test edge case

- [x] **Display backend errors**
  - [x] Show user-friendly message
  - [x] Don't expose internals
  - [x] Test error display

### Performance & UX
- [x] **Response time**
  - [x] GPA calc <500ms
  - [x] Projection <500ms
  - [x] Conversion <100ms

- [x] **Responsive UI**
  - [x] No janky animations
  - [x] No layout shifts
  - [x] Smooth slider interaction

- [x] **Accessibility**
  - [x] Keyboard navigation works
  - [x] ARIA labels present
  - [x] Color contrast adequate

### Testing - Phase 4
- [x] Manual end-to-end tests
  - [x] Create program
  - [x] Add courses
  - [x] Enter grades
  - [x] View GPA
  - [x] Adjust projection
  - [x] Test full workflow

- [x] Browser console clean
  - [x] No errors
  - [x] No warnings
  - [x] No failed requests

- [x] Cross-browser testing
  - [x] Chrome
  - [x] Firefox
  - [x] Safari
  - [x] Edge

---

## PHASE 5: Advanced Features (Optional, 3+ days)

### Retake Policy Engine
- [ ] Create `src-tauri/src/retake_policy.rs`
- [ ] Implement retake calculation modes
- [ ] Add retake_policy to user_profiles
- [ ] Add UI for selecting policy
- [ ] Test all policies

### Pass/Fail Support
- [ ] Add course mode (regular vs pass/fail)
- [ ] Exclude from GPA when pass/fail
- [ ] Or map to fixed points
- [ ] Add UI toggle
- [ ] Test exclusion logic

### Transfer Credits
- [ ] Add transfer course flag
- [ ] Include in credits but not GPA
- [ ] Mark separately in UI
- [ ] Test credit counting

### Study Hour Calibration
- [ ] Collect user feedback on study hours vs grades
- [ ] Build historical data
- [ ] Adjust base_hours dynamically
- [ ] Test calibration

### Advanced Visualization
- [ ] Grade distribution histogram
- [ ] Semester trend line
- [ ] Performance heatmap
- [ ] Difficulty vs grade scatter

### Analytics & Insights
- [ ] Dashboard with key metrics
- [ ] Trend analysis
- [ ] Recommendations for improvement
- [ ] Comparison with cohort (if applicable)

---

## Final Validation Checklist

### Code Quality
- [ ] All code passes linter (clippy for Rust)
- [ ] No compiler warnings
- [ ] No clippy warnings
- [ ] Code is well-commented
- [ ] Functions have docstrings

### Testing
- [ ] Unit test coverage ≥90%
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Manual QA checklist complete
- [ ] No known bugs

### Documentation
- [ ] Functions documented
- [ ] Error cases documented
- [ ] Usage examples provided
- [ ] Troubleshooting guide created

### Performance
- [ ] Response times <500ms
- [ ] Database queries optimized
- [ ] No memory leaks
- [ ] Handles >1000 courses smoothly

### Security
- [ ] Input validation on all fronts
- [ ] No SQL injection possible
- [ ] No XSS vulnerabilities
- [ ] User data properly isolated

### Deployment
- [ ] Database migration tested
- [ ] Backwards compatibility maintained
- [ ] Rollback plan documented
- [ ] User data not affected

### User Experience
- [ ] Onboarding flow works
- [ ] Error messages are helpful
- [ ] UI is responsive
- [ ] No console errors
- [ ] Feature complete and polished

---

## Sign-Off

### Completed By
- **Developer**: _______________  
- **Date**: _______________

### Reviewed By
- **Code Reviewer**: _______________  
- **Date**: _______________

### Approved By
- **Project Lead**: _______________  
- **Date**: _______________

---

## Notes

```
[Space for implementation notes, issues found, solutions used]


```

---

*Use this checklist to track progress. Check off items as they're completed. Keep it up-to-date.*
