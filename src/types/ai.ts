// AI Generation result types
export interface GenerationResult {
    content: string;
    status?: string;
    error?: string;
}

export interface ChatResult {
    content: string;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
}

export interface DocumentGenerationRequest {
    title: string;
    topic: string;
    description: string;
    target_audience: string;
    tone: string;
    length: string;
    language: string;
    document_type: string;
    formatting: string;
    section_structure: string;
    reference_material: string;
}

export interface PresentationGenerationData {
    title: string;
    topic: string;
    description: string;
    target_audience: string;
    tone: string;
    length: string;
    language: string;
    presentation_type: string;
    slide_count: string;
    structure: string;
    reference_material: string;
}

export interface PresentationGenerationRequest extends PresentationGenerationData {
    template?: string;
    include_images?: boolean;
    slide_style?: string;
    bullet_preference?: string;
    include_speaker_notes?: boolean;
}