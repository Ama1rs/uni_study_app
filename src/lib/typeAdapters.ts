// Type adapters for converting between Rust-generated types and frontend-friendly types

export interface RepositoryNumber {
    id: number;
    name: string;
    code?: string;
    semester?: string;
    description?: string;
    credits: number;
    semester_id?: number | null;
    manual_grade?: number | null;
    status: string;
    component_config?: string;
    component_scores?: string;
    grading_scale_id?: number;
}

export interface ResourceNumber {
    id: number;
    repository_id: number;
    title: string;
    type: string;
    path?: string;
    content?: string;
    tags?: string;
}

// Convert bigint to number for Repository
export const adaptRepository = (repo: any): RepositoryNumber => {
    return {
        id: Number(repo.id),
        name: repo.name,
        code: repo.code,
        semester: repo.semester,
        description: repo.description,
        credits: repo.credits || 0, // Ensure credits is always a number
        semester_id: repo.semester_id ? Number(repo.semester_id) : null,
        manual_grade: repo.manual_grade,
        status: repo.status || 'active',
        component_config: repo.component_config,
        component_scores: repo.component_scores,
        grading_scale_id: repo.grading_scale_id ? Number(repo.grading_scale_id) : undefined,
    };
};

// Adapt for Grades usage where some fields have different nullability
export const adaptExtendedRepository = (repo: any): RepositoryNumber => {
    return {
        id: Number(repo.id),
        name: repo.name,
        code: repo.code,
        semester: repo.semester,
        description: repo.description,
        credits: repo.credits || 0,
        semester_id: repo.semester_id ? Number(repo.semester_id) : null,
        manual_grade: repo.manual_grade,
        status: repo.status || 'active',
        component_config: repo.component_config,
        component_scores: repo.component_scores,
        grading_scale_id: repo.grading_scale_id ? Number(repo.grading_scale_id) : undefined,
    };
};

// Convert bigint to number for Resource
export const adaptResource = (resource: any): ResourceNumber => {
    return {
        id: Number(resource.id),
        repository_id: Number(resource.repository_id),
        title: resource.title,
        type: resource.type,
        path: resource.path,
        content: resource.content,
        tags: resource.tags,
    };
};

// Batch adaptation
export const adaptRepositories = (repositories: any[]): RepositoryNumber[] => {
    return repositories.map(adaptRepository);
};

export const adaptResources = (resources: any[]): ResourceNumber[] => {
    return resources.map(adaptResource);
};