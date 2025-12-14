# System Architecture Diagram & Data Flow

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER / TAURI WEBVIEW                       │
├─────────────────────────────────────────────────────────────────────┤
│  React Frontend Layer                                                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Components:                                                   │   │
│  │  • Grades.tsx          (Dashboard, projection viz)            │   │
│  │  • CourseGradeDialog   (Grade entry with components)          │   │
│  │  • GradeSettingsDialog (Program & scale selection)            │   │
│  │  • SearchFilterPanel   (Filter courses by semester)           │   │
│  │  • MetricsSidebar      (GPA summary display)                  │   │
│  │                                                                │   │
│  │ State Management:                                             │   │
│  │  • useState: semesters, courses, summary, projection, scales  │   │
│  │  • useEffect: invoke() calls on mount & after save            │   │
│  │  • refetch: refreshAll() pattern                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              ⬇️ invoke()
                    ┌──────────────────────┐
                    │ Tauri IPC Bridge     │
                    │ (async commands)     │
                    └──────────────────────┘
                              ⬇️
┌─────────────────────────────────────────────────────────────────────┐
│                      RUST BACKEND (Tauri)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Command Layer (lib.rs)                                              │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ #[tauri::command] functions - entry points for frontend    │     │
│  │ • get_grading_scales() / create_grading_scale()            │     │
│  │ • get_programs() / create_program() / set_user_program()   │     │
│  │ • get_gpa_summary() [PHASE 1 ✅]                           │     │
│  │ • project_grades() [PHASE 3 ❌]                            │     │
│  │ • convert_score_to_points() [PHASE 2 ❌]                   │     │
│  └────────────────────────────────────────────────────────────┘     │
│              ⬇️                        ⬇️                ⬇️           │
│  ┌──────────────────┐  ┌─────────────────────┐  ┌──────────────┐  │
│  │  grades.rs       │  │  conversion.rs      │  │ projection.rs│  │
│  │  (Data Access)   │  │  (Score → Points)   │  │ (GPA Goals) │  │
│  │                  │  │                     │  │             │  │
│  │  • get_semester  │  │  • numeric→point    │  │ • feasible  │  │
│  │  • get_programs  │  │  • letter→point     │  │ • required_ │  │
│  │  • get_scales    │  │  • weighted_score   │  │   future_gpa│  │
│  │  • get_gpa       │  │  • convert_course   │  │ • per_term  │  │
│  │  • create/upd... │  │  • (PHASE 2)        │  │ • per_course│  │
│  │                  │  │                     │  │ • study_hrs │  │
│  └──────────────────┘  └─────────────────────┘  └──────────────┘  │
│              ⬇️                        ⬇️                ⬇️           │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              Database Layer (db.rs)                      │      │
│  │  DbState { conn: Mutex<Connection> }                     │      │
│  │  Connection operations (prepare, execute, query_map)     │      │
│  └──────────────────────────────────────────────────────────┘      │
│                              ⬇️                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ⬇️
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE (SQLite)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Core Tables:                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ grading_scales   │  │ programs         │  │ semesters        │ │
│  │ ───────────────  │  │ ────────────────  │  │ ─────────────    │ │
│  │ id               │  │ id               │  │ id               │ │
│  │ name             │  │ name             │  │ name             │ │
│  │ type (numeric)   │  │ total_req_creds  │  │ start_date       │ │
│  │ config (JSON)    │  │ scale_id         │  │ end_date         │ │
│  │ is_default       │  │                  │  │ planned_credits  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                       │
│  Enhanced Tables:                                                    │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ repositories (Courses)                                   │      │
│  │ ──────────────────────────────────────────────────────── │      │
│  │ id | name | code | credits | semester_id                │      │
│  │ manual_grade | status | component_config                │      │
│  │ component_scores | grading_scale_id                      │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ user_profiles (User State)                               │      │
│  │ ──────────────────────────────────────────────────────── │      │
│  │ user_id | name | university | avatar_path               │      │
│  │ program_id | target_cgpa | horizon                       │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: User Enters a Grade

```
USER ENTERS GRADE IN DIALOG
        ⬇️
┌─────────────────────────────────────────────────┐
│ CourseGradeDialog.tsx                           │
│ ┌─────────────────────────────────────────────┐ │
│ │ Mode Selection:                             │ │
│ │ • Direct: User enters grade point (9.5)    │ │
│ │ • Component: User enters component scores  │ │
│ │   - Exam: 85/100 (weight 70%)               │ │
│ │   - Lab: 90/100 (weight 30%)                │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
        ⬇️
    handleSave()
        ⬇️
IF COMPONENT MODE:
│
├─ calculate_weighted_score()
│  • Exam:     85 * 0.70 = 59.5
│  • Lab:      90 * 0.30 = 27.0
│  • Total:    59.5 + 27.0 = 86.5 ✓
│
└─ invoke('convert_score_to_points', {
     score: 86.5,
     scale_id: 1  // 10-point scale
   })
        ⬇️
    BACKEND: convert_score_to_points()
    ┌────────────────────────────────────┐
    │ 1. Get scale (id=1):               │
    │    10-point numeric scale          │
    │    mappings: [                     │
    │      {min: 90, point: 10},         │
    │      {min: 80, point: 9},  ◄── Match (86.5 >= 80)
    │      {min: 70, point: 8},         │
    │    ]                              │
    │ 2. Find highest matching mapping   │
    │ 3. Return: 9.0 points             │
    └────────────────────────────────────┘
        ⬇️
        Result: 9.0
        ⬇️
    invoke('update_course_grade_details', {
      repository_id: 5,
      credits: 3.0,
      semester_id: 1,
      manual_grade: 9.0,  ◄── Converted grade
      status: 'completed'
    })
        ⬇️
    BACKEND: update_course_grade_details()
    ┌────────────────────────────────────┐
    │ UPDATE repositories                │
    │ SET manual_grade = 9.0,            │
    │     status = 'completed',          │
    │     component_config = JSON(...),  │
    │     component_scores = JSON(...)   │
    │ WHERE id = 5                       │
    └────────────────────────────────────┘
        ⬇️
    ✅ Saved to Database
        ⬇️
    onUpdate() → refetchAll()
    ┌────────────────────────────────────┐
    │ Frontend:                          │
    │ • Re-fetch GPA summary             │
    │ • Re-fetch projection              │
    │ • Update UI with new GPA           │
    └────────────────────────────────────┘
```

---

## Data Flow: Calculate GPA & Projection

```
USER VIEWS GRADES DASHBOARD
        ⬇️
    fetchSummary()
    invoke('get_gpa_summary')
        ⬇️
    BACKEND: get_gpa_summary()
    ┌──────────────────────────────────────┐
    │ 1. Get user's program                │
    │    ↓ SELECT FROM user_profiles       │
    │    ↓ program_id = 1                  │
    │ 2. Get program's scale               │
    │    ↓ SELECT FROM grading_scales      │
    │    ↓ id = program.scale_id           │
    │ 3. Fetch all completed courses       │
    │    ↓ SELECT FROM repositories        │
    │    ↓ status='completed', manual_grade IS NOT NULL
    │    ↓ Results:                        │
    │      Course 1: 4 credits, grade=9.5 │
    │      Course 2: 3 credits, grade=8.0 │
    │      Course 3: 2 credits, grade=7.5 │
    │ 4. Calculate semester GPAs           │
    │    For each semester:                │
    │      sum(grade * credits) /          │
    │      sum(credits)                    │
    │ 5. Calculate overall CGPA            │
    │    Σ(grade * credits) /              │
    │    Σ(credits)                        │
    │    = (9.5*4 + 8.0*3 + 7.5*2) / 9    │
    │    = (38 + 24 + 15) / 9              │
    │    = 77 / 9 ≈ 8.56 / 10             │
    │ 6. Return GradeSummary               │
    └──────────────────────────────────────┘
        ⬇️
    UI: Display CGPA = 8.56 / 10
        ⬇️
    fetchProjection()
    invoke('project_grades')
        ⬇️
    BACKEND: project_grades()
    ┌──────────────────────────────────────┐
    │ 1. Get current CGPA & credits done   │
    │    current_cgpa = 8.56               │
    │    credits_completed = 80 / 160      │
    │ 2. Get target CGPA (from settings)   │
    │    target_cgpa = 8.0 (user set)      │
    │ 3. Calculate future requirements     │
    │    credits_remaining = 160 - 80 = 80│
    │    current_gp = 8.56 * 80 = 684.8   │
    │    target_gp = 8.0 * 160 = 1280     │
    │    future_gp_needed = 1280 - 684.8  │
    │                     = 595.2          │
    │    required_future_gpa = 595.2 / 80 │
    │                        = 7.44 / 10  │
    │ 4. Determine feasibility             │
    │    max_point = 10                    │
    │    required < max * 0.95             │
    │    7.44 < 9.5 ✓ FEASIBLE             │
    │ 5. Generate message                  │
    │    "FEASIBLE: requires 7.44/10"      │
    │ 6. Return ProjectionResult           │
    └──────────────────────────────────────┘
        ⬇️
    UI: Display
    ┌──────────────────────────────────────┐
    │ Current CGPA:        8.56            │
    │ Target CGPA:         8.00            │
    │ Future GPA needed:   7.44            │
    │ Credits remaining:   80              │
    │ Status:  ✅ FEASIBLE                 │
    │ Message: Requires avg 7.44/10        │
    │          across remaining credits    │
    └──────────────────────────────────────┘
```

---

## Grading Scale Conversion Flow

```
┌──────────────────────────────────────────────────┐
│ GRADING SCALE DEFINITION (in database)           │
├──────────────────────────────────────────────────┤
│                                                   │
│ Scale: "India 10-Point System"                   │
│ Type: "numeric"                                  │
│ Config: {                                        │
│   "max_point": 10,                               │
│   "mappings": [                                  │
│     { "min_percent": 90, "point": 10 },          │
│     { "min_percent": 80, "point": 9 },           │
│     { "min_percent": 70, "point": 8 },           │
│     { "min_percent": 60, "point": 7 },           │
│     { "min_percent": 50, "point": 6 },           │
│   ]                                              │
│ }                                                │
│                                                   │
└──────────────────────────────────────────────────┘
                    ⬇️
        ┌───────────────────────────┐
        │ convert_numeric_score()   │
        │ Input: 85 (percentage)    │
        │                           │
        │ 1. Parse mappings         │
        │ 2. Find highest min_pct   │
        │    where 85 >= min_pct    │
        │ 3. Candidates:            │
        │    80 (9 pts) ◄── Match!  │
        │    70 (8 pts)             │
        │ 4. Return: 9              │
        │                           │
        └───────────────────────────┘
                    ⬇️
            Output: 9 points
```

---

## Component Score Weighting Flow

```
Course: "Data Structures"
Required Grades:
├─ Exam:       70% (max 100)
├─ Lab:        20% (max 100)
└─ Assignment: 10% (max 100)

        ⬇️

User Input:
├─ Exam:       85/100
├─ Lab:        92/100
└─ Assignment: 78/100

        ⬇️

calculate_weighted_score()
┌────────────────────────────────────────┐
│ Step 1: Parse components & config      │
│                                        │
│ config: [                              │
│   { name: "exam", weight: 0.70 }      │
│   { name: "lab", weight: 0.20 }       │
│   { name: "assignment", weight: 0.10 }│
│ ]                                      │
│                                        │
│ scores: [                              │
│   { name: "exam", score: 85 }         │
│   { name: "lab", score: 92 }          │
│   { name: "assignment", score: 78 }   │
│ ]                                      │
│                                        │
│ Step 2: Calculate weighted sum         │
│ exam:       85 * 0.70 = 59.50          │
│ lab:        92 * 0.20 = 18.40          │
│ assignment: 78 * 0.10 =  7.80          │
│ ──────────────────────────────         │
│ Total:              = 85.70             │
│                                        │
│ Step 3: Check total weight             │
│ 0.70 + 0.20 + 0.10 = 1.00 ✓            │
│                                        │
│ Step 4: Return weighted average        │
│ Result: 85.70 / 1.00 = 85.70           │
│                                        │
└────────────────────────────────────────┘

        ⬇️

Convert to Grade Point
(Using 10-point scale)

85.70 percentage
        ⬇️
Match against scale:
├─ 90+ → 10 pts
├─ 80+ → 9 pts ◄── MATCH!
├─ 70+ → 8 pts
└─ ...

        ⬇️

Final Grade: 9 points
(out of 10)
```

---

## State Management Flow

```
Initial State:
┌─────────────────────────────────────┐
│ semesters: []                       │
│ courses: []                         │
│ summary: {cgpa:0, total:0, ...}     │
│ projection: null                    │
│ scales: []                          │
│ selectedProgram: null               │
└─────────────────────────────────────┘

        ⬇️

User Action 1: Mount component
        ⬇️
refreshAll()
├─ fetchData()         → Invoke get_semesters(), get_repositories()
├─ fetchSummary()      → Invoke get_gpa_summary()
├─ fetchProjection()   → Invoke project_grades()
└─ fetchScales()       → Invoke get_grading_scales()

        ⬇️

Updated State:
┌─────────────────────────────────────┐
│ semesters: [Semester, ...]          │
│ courses: [Repository, ...]          │
│ summary: {cgpa:8.56, total:80, ...} │
│ projection: {required:7.44, ...}    │
│ scales: [GradingScale, ...]         │
│ selectedProgram: {id:1, name:...}   │
└─────────────────────────────────────┘

        ⬇️

User Action 2: Open grade dialog & save
        ⬇️
invoke('update_course_grade_details', {...})
        ⬇️
Backend: UPDATE database

        ⬇️

User Action 3: Close dialog
        ⬇️
onUpdate() → refreshAll()

        ⬇️

New State:
┌─────────────────────────────────────┐
│ semesters: [same]                   │
│ courses: [updated with new grade]   │
│ summary: {cgpa: 8.61 (updated)}    │ ◄── Recalculated
│ projection: {required: 7.33}        │ ◄── Recalculated
│ scales: [same]                      │
│ selectedProgram: [same]             │
└─────────────────────────────────────┘
```

---

## Feasibility Decision Tree

```
User sets target CGPA = 8.0

        ⬇️

project_grades() called

        ⬇️

Calculate required future GPA

        ⬇️

                    ┌─────────────────────────┐
                    │ required_future_gpa = ? │
                    └─────────────────────────┘
                           ⬇️
        ┌──────────────────────────────────────────┐
        │                                          │
        ├── required > max_point                   ├──> INFEASIBLE
        │                                          │    (impossible)
        ├── required > 80% of max_point            ├──> CHALLENGING
        │   (e.g., > 8.0 on 10-point)              │    (very difficult)
        │                                          │
        ├── required > 50% of max_point            ├──> FEASIBLE
        │   (e.g., > 5.0 on 10-point)              │    (achievable)
        │                                          │
        └──Required ≤ 50% of max_point             └──> EASY
            (e.g., ≤ 5.0 on 10-point)                   (easily achievable)

        ⬇️

Return:
┌──────────────────────────────────────┐
│ feasible: true/false                 │
│ message: "CHALLENGING: requires 8.5" │
│ required_future_gpa: 8.5             │
└──────────────────────────────────────┘

        ⬇️

Frontend displays:
        ┌───────────────┬─────────────────┐
        │ FEASIBILITY   │ RECOMMENDATION  │
        ├───────────────┼─────────────────┤
        │ INFEASIBLE    │ ⚠️ Impossible   │
        │ CHALLENGING   │ ⚠️ Very hard    │
        │ FEASIBLE      │ ✅ Achievable   │
        │ EASY          │ ✅ Easy path    │
        └───────────────┴─────────────────┘
```

---

## Database Schema Relationships

```
┌─────────────────────────────┐
│   grading_scales            │
├─────────────────────────────┤
│ id (PK)                     │
│ name                        │
│ type                        │
│ config (JSON)               │
│ is_default                  │
└─────────────────────────────┘
         ▲
         │ (referenced by)
         │
┌──────────────────────────────────────┐
│   programs                            │
├──────────────────────────────────────┤
│ id (PK)                              │
│ name                                 │
│ total_required_credits               │
│ grading_scale_id (FK) ─────────────> │
│ duration_months                      │
└──────────────────────────────────────┘
         ▲
         │ (referenced by)
         │
┌──────────────────────────────────────┐
│   user_profiles                      │
├──────────────────────────────────────┤
│ user_id (PK)                         │
│ name                                 │
│ university                           │
│ program_id (FK) ──────────────────> │
│ target_cgpa                          │
│ horizon                              │
└──────────────────────────────────────┘


         ┌──────────────────────────────┐
         │   semesters                   │
         ├──────────────────────────────┤
         │ id (PK)                      │
         │ name                         │
         │ start_date                   │
         │ end_date                     │
         │ planned_credits              │
         └──────────────────────────────┘
                    ▲
                    │ (referenced by)
                    │
    ┌───────────────────────────────────────────────┐
    │   repositories (Courses)                       │
    ├───────────────────────────────────────────────┤
    │ id (PK)                                       │
    │ name (course name)                            │
    │ code (course code)                            │
    │ credits                                       │
    │ semester_id (FK) ───────────────────────────> │
    │ manual_grade (final grade point)              │
    │ status (completed/in_progress/planned)        │
    │ component_config (JSON)                       │
    │ component_scores (JSON)                       │
    │ grading_scale_id (FK) ──┐                     │
    │                         │                     │
    └───────────────────────────────────────────────┘
                              │
                              ▼ (can override)
                   ┌──────────────────────┐
                   │  grading_scales      │
                   │  (per-course scale)  │
                   └──────────────────────┘
```

---

## Example: Complete User Journey

```
┌─ SCENARIO ────────────────────────────────────────────┐
│ New student from India using 10-point system         │
│ Program: BTech CS, 160 credits total                 │
│ Current: 3 completed semesters, 80 credits, 7.5 CGPA │
│ Goal: Reach 8.0 CGPA by semester 8                   │
└───────────────────────────────────────────────────────┘

STEP 1: Onboarding
  User: "I'm from India, using 10-point system"
        ⬇️
  Frontend: Load GradeSettingsDialog
  Backend: get_grading_scales()
        ⬇️
  User: Selects "Standard 10-point" from list
        ⬇️
  User: Creates Program "BTech CS"
    - total_required_credits: 160
    - grading_scale_id: 1 (10-point)
        ⬇️
  Backend: create_program(...)
        ⬇️
  Backend: set_user_program(program_id)
        ⬇️
  ✅ Program set up

STEP 2: Import Historical Data
  User: Enters semester 1 grades (4 courses)
  For each course:
    - Component mode: exam (70%), lab (30%)
    - Exam: 82, Lab: 88
        ⬇️
    Frontend: calculate_weighted_score()
      (82 * 0.70 + 88 * 0.30 = 84.0)
        ⬇️
    invoke('convert_score_to_points', {
      score: 84,
      scale_id: 1
    })
        ⬇️
    Backend: convert_numeric_score(84, scale_1_mappings)
      Finds: min_percent=80 → point=9
      Returns: 9.0
        ⬇️
    invoke('update_course_grade_details', {
      manual_grade: 9.0,
      component_config: [...],
      component_scores: [...]
    })
        ⬇️
    ✅ Course saved with grade 9.0

  Repeat for semesters 2 & 3...
        ⬇️
  ✅ Historical data imported

STEP 3: View Dashboard
  User: Opens Grades tab
        ⬇️
  Frontend: invoke('get_gpa_summary')
        ⬇️
  Backend: calculate_cgpa()
    - Fetches all completed courses
    - Groups by semester
    - Calculates semester GPA: (9.0*4 + 8.5*3 + ...) / total_credits
    - Calculates CGPA: 7.5
        ⬇️
  Display:
    Current CGPA: 7.5 / 10
    Credits: 80 / 160
    Semesters: Sem1 GPA 7.8, Sem2 GPA 7.6, Sem3 GPA 7.2

STEP 4: View Projection
  User: invoke('project_grades')
        ⬇️
  Backend: project_future_requirements()
    - Current CGPA: 7.5
    - Target CGPA: 8.0 (user-set)
    - Credits completed: 80
    - Credits remaining: 80
    - Calculate:
      current_gp = 7.5 * 80 = 600
      target_gp = 8.0 * 160 = 1280
      future_gp_needed = 1280 - 600 = 680
      required_future_gpa = 680 / 80 = 8.5
    - Feasibility: 8.5 < 10 ✓ FEASIBLE
        ⬇️
  Display:
    ┌────────────────────────────┐
    │ Current CGPA:    7.50      │
    │ Target CGPA:     8.00      │
    │ Future GPA:      8.50      │
    │ Status:          FEASIBLE  │
    │ Message:         Requires  │
    │                  8.5/10    │
    │                  remaining │
    └────────────────────────────┘

STEP 5: Interactive Planning
  User: Adjusts target slider to 7.8
        ⬇️
  Frontend: invoke('save_projection_settings', {
              target_cgpa: 7.8
            })
        ⬇️
  Backend: Update user_profiles.target_cgpa = 7.8
        ⬇️
  Frontend: invoke('project_grades') [re-fetch]
        ⬇️
  Backend: Recalculate with new target
    target_gp = 7.8 * 160 = 1248
    future_gp_needed = 1248 - 600 = 648
    required_future_gpa = 648 / 80 = 8.1
        ⬇️
  Display updates:
    ┌────────────────────────────┐
    │ Current CGPA:    7.50      │
    │ Target CGPA:     7.80 ◄─── UPDATED
    │ Future GPA:      8.10      │ ◄─── UPDATED
    │ Status:          FEASIBLE  │
    │ Message:         Requires  │
    │                  8.1/10    │ ◄─── UPDATED
    │                  remaining │
    └────────────────────────────┘
    ✅ More achievable target!

STEP 6: Add New Course
  User: Adds semester 4 course
    "Operating Systems"
    Credits: 4
    In-progress
        ⬇️
  invoke('create_repository', ...)
        ⬇️
  ✅ Course created

STEP 7: Enter New Grade
  User: Semester 4 exam results
    Exam (70%): 88/100
    Lab (30%): 92/100
        ⬇️
  Weighted: 88*0.7 + 92*0.3 = 89.2
  Convert: 89.2% → 9 points (on 10-point scale)
        ⬇️
  invoke('update_course_grade_details', {
    manual_grade: 9.0,
    status: 'completed'
  })
        ⬇️
  ✅ Saved

STEP 8: Watch Projection Update
  Frontend: Auto-refresh after save
        ⬇️
  invoke('get_gpa_summary')  [New CGPA calc]
  invoke('project_grades')   [New projection calc]
        ⬇️
  New CGPA: 7.6 (slightly higher)
  New required future GPA: 8.04 (slightly lower)
        ⬇️
  Display updates automatically
  ✅ Progress tracked!

FINAL STATE:
├─ Student can see real-time GPA impact
├─ Student knows exactly what's needed to reach goal
├─ System supports global 10-point scale
├─ Historical & current data both tracked
├─ Projections update with every change
└─ All data persists in SQLite
```

---

*This architecture document serves as a visual reference for developers. Update as implementation progresses.*
