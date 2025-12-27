import { createContext, useContext, useState, ReactNode } from 'react';

export interface GenerationState {
    isGenerating: boolean;
    generationData: any;
    generatedContent: string;
    error?: string;
}

interface AIGenerationContextType {
    state: GenerationState;
    setState: (state: Partial<GenerationState>) => void;
    reset: () => void;
}

const AIGenerationContext = createContext<AIGenerationContextType | null>(null);

export function AIGenerationProvider({ children }: { children: ReactNode }) {
    const [state, setStateInternal] = useState<GenerationState>({
        isGenerating: false,
        generationData: null,
        generatedContent: '',
        error: undefined
    });

    const setState = (newState: Partial<GenerationState>) => {
        setStateInternal(prev => ({ ...prev, ...newState }));
    };

    const reset = () => {
        setStateInternal({
            isGenerating: false,
            generationData: null,
            generatedContent: '',
            error: undefined
        });
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