import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface GenerationState {
    isGenerating: boolean;
    generationData: any;
    generatedContent: string;
    error?: string;
    documentFormData: any;
    presentationFormData: any;
}

interface AIGenerationContextType {
    state: GenerationState;
    setState: (state: Partial<GenerationState>) => void;
    reset: () => void;
}

const STORAGE_KEY = 'ai_generation_state';

const defaultState: GenerationState = {
    isGenerating: false,
    generationData: null,
    generatedContent: '',
    error: undefined,
    documentFormData: {
        title: '',
        topic: '',
        description: '',
        target_audience: 'student',
        tone: 'explanatory',
        length: 'medium',
        language: 'English',
        document_type: 'notes',
        formatting: 'markdown',
        section_structure: 'auto',
        reference_material: ''
    },
    presentationFormData: {
        title: '',
        topic: '',
        description: '',
        target_audience: 'student',
        tone: 'visual',
        slide_count: '10',
        language: 'English',
        template: 'modern',
        include_images: true,
        reference_material: ''
    }
};

const AIGenerationContext = createContext<AIGenerationContextType | null>(null);

export function AIGenerationProvider({ children }: { children: ReactNode }) {
    const [state, setStateInternal] = useState<GenerationState>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                return { ...defaultState, ...JSON.parse(saved), isGenerating: false }; // Never persist 'isGenerating' as true
            } catch (e) {
                console.error("Failed to parse saved AI generation state:", e);
            }
        }
        return defaultState;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state]);

    const setState = (newState: Partial<GenerationState>) => {
        setStateInternal(prev => ({ ...prev, ...newState }));
    };

    const reset = () => {
        setStateInternal(defaultState);
    };

    return (
        <AIGenerationContext.Provider value={{ state, setState, reset }}>
            {children}
        </AIGenerationContext.Provider>
    );
}

export function useAIGeneration() {
    const context = useContext(AIGenerationContext);
    if (!context) {
        throw new Error('useAIGeneration must be used within AIGenerationProvider');
    }
    return context;
}