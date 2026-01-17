export interface Semester {
    id: number;
    name: string;
    start_date: string | null;
    end_date: string | null;
    planned_credits: number;
}

export interface GradingScaleMapping {
    min_percent?: number;
    letter?: string;
    point: number;
}

export interface GradingScaleConfig {
    max_point: number;
    mappings: GradingScaleMapping[];
}

export interface GradingScale {
    id: number;
    name: string;
    type: string; // "numeric" | "letter"
    config: GradingScaleConfig;
    is_default: boolean;
}

export interface Program {
    id: number;
    name: string;
    total_required_credits: number;
    grading_scale_id?: number;
    duration_months?: number;
}

export interface ComponentConfig {
    name: string;
    weight: number;
}

export interface ComponentScore {
    name: string;
    score: number;
    max_score?: number;
}

export interface SemesterGpa {
    semester_id: number;
    semester_name: string;
    gpa: number;
    credits: number;
}

export interface GradeSummary {
    cgpa: number;
    total_credits: number;
    semester_gpas: SemesterGpa[];
}

export interface ProjectionResult {
    current_cgpa: number;
    target_cgpa: number;
    required_future_gpa: number;
    credits_completed: number;
    credits_remaining: number;
    feasible: boolean;
    message: string;
    horizon: number | null;
}

export interface ProjectionSettings {
    target_cgpa: number | null;
    horizon: number | null;
}
