# Flexible Grading System - Current Status Report

**Generated**: December 13, 2025  
**Project**: Uni Study App - Global Grading System Implementation

---

## Quick Status Overview

| Component | Status | Completion | Priority |
|-----------|--------|------------|----------|
| **Database Schema** | ✅ Complete | 90% | LOW |
| **TypeScript Types** | ✅ Complete | 100% | DONE |
| **Data Access Layer** | ⚠️ Partial | 30% | HIGH |
| **Conversion Engine** | ❌ Not Started | 0% | CRITICAL |
| **GPA Calculations** | ⚠️ Basic | 40% | CRITICAL |
| **Projection Engine** | ❌ Not Started | 0% | CRITICAL |
| **Frontend Components** | ⚠️ Partial | 50% | HIGH |
| **Backend Commands** | ❌ Partial | 20% | CRITICAL |
| **Tests** | ❌ None | 0% | MEDIUM |

---

## What's Already Done

### 1. Database Schema ✅
**Files**: 
- `src-tauri/migrations/0008_grades_projection.sql`
- `src-tauri/migrations/0010_flexible_grading_schema.sql`

**Tables Created**:
- ✅ `grading_scales` — Flexible scale definitions with JSON config
- ✅ `programs` — Degree program metadata
- ✅ `semesters` — Term/semester management
- ✅ Enhanced `repositories` with credits, semester tracking, component scores
- ✅ User profile extensions (target_cgpa, horizon, program_id)

**Example Data**: Two seed scales (10-point, 4.0) included in migration

### 2. TypeScript Types ✅
**File**: `src/types/grading.ts`

**Complete Interfaces**:
- ✅ `Semester` — Term metadata
- ✅ `GradingScale`, `GradingScaleConfig`, `GradingScaleMapping` — Scale definitions
- ✅ `Program` — Degree program
- ✅ `ComponentConfig`, `ComponentScore` — Component-based scoring
- ✅ `SemesterGpa` — Per-semester GPA
- ✅ `GradeSummary` — Overall summary
- ✅ `ProjectionResult`, `ProjectionSettings` — Projection data

### 3. Basic Backend Commands ✅
**File**: `src-tauri/src/grades.rs` and `src-tauri/src/lib.rs`

**Implemented**:
- ✅ `get_semesters()` — Fetch all semesters
- ✅ `create_semester()` — Add new semester
- ✅ `delete_semester()` — Remove semester
- ✅ `update_course_grade_details()` — Basic course update
- ✅ `get_gpa_summary()` — Calculate basic GPA (hardcoded for direct points)

### 4. Frontend UI Structure ✅
**Files**: `src/components/Grades.tsx`, `CourseGradeDialog.tsx`, `GradeSettingsDialog.tsx`

**Screens Implemented**:
- ✅ Grade dashboard layout with stats
- ✅ Course grade editing interface
- ✅ Settings/program selection dialog
- ✅ Projection timeline visualization (stub)
- ✅ Semester browser

**Issues**:
- ⚠️ Mock/placeholder data in many places
- ⚠️ No real backend integration for scale selection
- ⚠️ Component score UI present but logic incomplete

---

## What's Missing (High Priority)

### PHASE 1: Core Backend Data Access

#### Missing Commands:
```rust
// Grading Scales
get_grading_scales() ❌
get_grading_scale(id) ❌
create_grading_scale(...) ❌

// Programs
get_programs() ❌
get_program(id) ❌
create_program(...) ❌
set_user_program(id) ❌
get_user_program() ❌

// Projection Settings
save_projection_settings(...) ❌
get_projection_settings() ❌
```

**Effort**: 1-2 days  
**Blocker**: Multiple frontend features

---

### PHASE 2: Conversion & Calculation Engine

#### Missing Modules:

**`src-tauri/src/conversion.rs`** (NEW)
```rust
convert_numeric_score() ❌          // percent/score → points
convert_letter_grade() ❌           // letter → points
calculate_weighted_score() ❌       // component weighting
convert_course_score() ❌           // two-mode conversion
```

**Enhanced in `grades.rs`**:
```rust
calculate_semester_gpa() ❌         // per-semester calculation
calculate_cgpa() ❌                 // overall GPA with scale awareness
```

**Current Issue**: `get_gpa_summary()` assumes direct grade points  
**Impact**: Cannot handle different grading scales

**Effort**: 2-3 days  
**Blocker**: All projection features

---

### PHASE 3: Projection & Timeline Engine

#### Missing Module:

**`src-tauri/src/projection.rs`** (NEW)
```rust
project_future_requirements() ❌    // core projection algorithm
get_per_semester_targets() ❌       // allocate targets to terms
get_per_course_targets() ❌         // per-course breakdowns
estimate_study_hours_needed() ❌    // study effort calculator
```

**Frontend Missing**:
- ❌ Real projection results
- ❌ Per-semester target visualization
- ❌ Study hour estimates
- ❌ Feasibility warnings

**Effort**: 2-3 days  
**Blocker**: Projection dashboard

---

## Critical Issues

### Issue #1: Grade Conversion Not Implemented
**Impact**: Cannot convert between different scale types  
**Example**: User with 10-point system can't see 4.0 equivalent  
**Status**: BLOCKING projection, GPA calculations

**Solution**: Implement conversion engine (Phase 2)

---

### Issue #2: No Scale-Aware GPA Calculation
**Current**:  
```rust
// Assumes manual_grade is already in grade points
total_points += grade * credits;
```

**Should Be**:  
```rust
// Convert based on grading scale
grade_points = convert_score_to_points(score, scale);
total_points += grade_points * credits;
```

**Impact**: Cannot mix courses from different scales  
**Solution**: Refactor `get_gpa_summary()` to use conversion engine

---

### Issue #3: Frontend Calling Non-Existent Backend Commands
**Examples**:
- `invoke('get_grading_scales')` → NOT IMPLEMENTED
- `invoke('create_program')` → NOT IMPLEMENTED
- `invoke('project_grades')` → NOT IMPLEMENTED

**Current Behavior**: Errors logged to console  
**Solution**: Implement Phase 1 commands first

---

## File Map & What Needs Work

```
✅ Complete / Ready
⚠️  Partial / Needs Work
❌ Not Started

src-tauri/
├── migrations/
│   ├── 0008_grades_projection.sql ✅ (schema)
│   └── 0010_flexible_grading_schema.sql ✅ (schema)
├── src/
│   ├── lib.rs ⚠️ (missing 15+ commands)
│   ├── main.rs ✅ (just entry point)
│   ├── db.rs ✅ (basic CRUD)
│   ├── grades.rs ⚠️ (partial, needs refactor)
│   ├── conversion.rs ❌ (MISSING - NEW)
│   ├── projection.rs ❌ (MISSING - NEW)
│   ├── inference.rs ✅ (unrelated)
│   └── ollama.rs ✅ (unrelated)

src/
├── types/
│   └── grading.ts ✅ (complete)
├── components/
│   ├── Grades.tsx ⚠️ (UI done, logic incomplete)
│   ├── CourseGradeDialog.tsx ⚠️ (UI done, save incomplete)
│   ├── GradeSettingsDialog.tsx ⚠️ (UI done, integration missing)
│   ├── DynamicLineChart.tsx ✅ (chart component)
│   └── ... (other components)
```

---

## Implementation Sequence (Recommended)

### Week 1: Foundation
1. **Day 1-2: Phase 1** — Implement data access layer (grading scales, programs)
   - Add 15+ backend commands
   - Test each command
   
2. **Day 3-4: Phase 2** — Implement conversion & GPA engine
   - Create `conversion.rs` module
   - Refactor `get_gpa_summary()`
   - Unit tests

3. **Day 5: Integration** — Connect Phase 1 to Phase 2
   - Test end-to-end: scale → conversion → GPA

### Week 2: Projection & Frontend
4. **Day 6-7: Phase 3** — Implement projection engine
   - Create `projection.rs` module
   - Implement algorithms
   - Unit tests

5. **Day 8-9: Phase 4** — Complete frontend integration
   - Connect React components to real commands
   - Fix all `invoke()` calls
   - Test UI flows

6. **Day 10: QA & Polish** — Testing & refinement
   - Manual testing
   - Edge case handling
   - Error messages

---

## Testing Coverage Needed

### Unit Tests (Rust)
```
src-tauri/src/
├── conversion.rs
│   ├── test_numeric_conversion
│   ├── test_letter_conversion
│   ├── test_weighted_avg
│   └── test_edge_cases
├── grades.rs (enhanced)
│   ├── test_semester_gpa
│   ├── test_cgpa_multi_semester
│   └── test_different_scales
└── projection.rs (NEW)
    ├── test_feasible_projection
    ├── test_infeasible_projection
    ├── test_per_term_allocation
    └── test_study_hours
```

### Integration Tests
- E2E: Create program → Add courses → Calculate GPA → Project
- Scale mixing: Different scales per course
- Refactoring: Retakes, pass/fail handling

### Manual QA
- [ ] Onboarding flow with program selection
- [ ] Grade entry with component weighting
- [ ] Projection slider updates
- [ ] Different scales produce correct output

---

## Configuration & Presets

### Pre-loaded Scales (in migration):
1. **Standard 10-point** (India)
   - 90-100: 10 pts
   - 80-89: 9 pts
   - ... etc

2. **US 4.0 Scale**
   - A: 4.0
   - A-: 3.7
   - B+: 3.3
   - ... etc

### Can Be Added Later:
- UK (1st/2:1/2:2)
- European ECTS
- Australian (7-point scale)
- Custom per institution

---

## Key Dependencies

### Rust Crates (already in Cargo.toml or needed):
- ✅ `serde`, `serde_json` — JSON serialization
- ✅ `rusqlite` — Database
- ✅ `tauri` — IPC
- ⚠️ `serde_json` — May need explicit import in conversion.rs

### Frontend Packages (React):
- ✅ `react` — Already present
- ✅ `lucide-react` — Icons (already used)
- ✅ `@tauri-apps/api` — Already used

---

## Success Criteria

### MVP Definition (Phases 1-4):
- ✅ Users can select from preset grading scales
- ✅ Users can create programs with custom total credits
- ✅ Courses can have component-based scoring (exam, lab, assignment)
- ✅ CGPA calculated correctly for any scale type
- ✅ Projection shows feasibility of reaching target GPA
- ✅ Per-semester targets allocated fairly
- ✅ Study hours estimated for each course
- ✅ All frontend components integrated with backend

### Quality Metrics:
- ✅ All backend commands have ≥90% test coverage
- ✅ No frontend console errors on happy path
- ✅ Projection accuracy within 0.01 GPA points
- ✅ UI responsive to changes (<500ms)

---

## Contingency Plans

### If Timeline Slips:
1. **Drop Phase 5** (retakes, analytics, what-if) — Save for v2.0
2. **Simplify Projection** — Start with even term distribution only
3. **Remove Study Hours** — Focus on GPA projection first
4. **Manual Scale Config** — Pre-load only most common scales

### If Major Issue Found:
1. **Database schema issue** → Rollback migration, redesign
2. **Conversion logic wrong** → Revisit math, add more tests
3. **Performance** → Profile, add indexes to grading_scales queries
4. **Frontend complexity** → Break into smaller components

---

## Next Actions (Immediate)

1. ✅ **Read this plan** — Understand overall architecture
2. 📋 **Create task list** in your project management tool
3. 🚀 **Start Phase 1** — Implement `get_grading_scales()` first (simplest)
4. 📝 **Document as you go** — Keep comments in code
5. 🧪 **Test each phase** — Don't skip unit tests

---

## Questions & Clarifications Needed

1. **Retake Policy**: Which policy do you want at launch? (replace, average, best, all)
2. **Pass/Fail Courses**: Should they be excluded from GPA or mapped to points?
3. **Transfer Credits**: Allow credits without grades?
4. **Default Values**: What target CGPA should we suggest? (7.0? 8.0?)
5. **Horizon**: Measured in semesters or months?
6. **Study Hours**: Should base_hours be configurable per user/course?

---

## Reference Documents

- **Detailed Plan**: See `FLEXIBLE_GRADING_IMPLEMENTATION_PLAN.md`
- **Database Schema**: `src-tauri/migrations/0008_grades_projection.sql`
- **Type Definitions**: `src/types/grading.ts`
- **Current UI**: `src/components/Grades.tsx`

---

*This report serves as both project documentation and implementation roadmap. Update it as progress is made.*
