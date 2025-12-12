
export interface LinkType {
    id: number;
    name: string;
    color: string;
    stroke_style: string;
}

export interface ResourceMetadata {
    resource_id: number;
    importance: number; // 1-5
    status: 'unreviewed' | 'reviewing' | 'mastered';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    time_estimate: number; // minutes
    last_reviewed_at?: string;
}

export interface LinkV2 {
    id: number;
    source_id: number;
    target_id: number;
    type_id?: number;
    strength: number;
    bidirectional: boolean;
    created_at?: string;
}

export interface Resource {
    id: number;
    title: string;
    type: string;
    path?: string;
    content?: string;
    tags?: string;
    repository_id: number;
    created_at?: string;
    updated_at?: string;
}
