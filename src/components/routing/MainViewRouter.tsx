import { AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Resource } from '@/types/node-system';
import { TaskPane } from '@/features/tasks/TaskPane';
import { StudyRepository } from '@/pages/StudyRepository';
import { Planner } from '@/pages/Planner';
import { FocusMode } from '@/features/tasks/FocusMode';
import { ChatLocalLLM } from '@/features/ai/ChatLocalLLM';
import { AIDocumentCreate, DocumentGenerationData } from '@/features/ai/AIDocumentCreate';
import { AIPresentationCreate, PresentationGenerationData } from '@/features/ai/AIPresentationCreate';
import { AIDocumentReview } from '@/features/ai/AIDocumentReview';
import { AIPresentationReview } from '@/features/ai/AIPresentationReview';
import { Grades } from '@/pages/Grades';
import { Finance } from '@/pages/Finance';
import { FlashcardsPage } from '@/pages/FlashcardsPage';
import { HomeHub } from '@/pages/HomeHub';
import { NoteEditor } from '@/features/editor/NoteEditor';
import { ResourcePreview } from '@/features/resources/ResourcePreview';
import { StudioPage } from '@/pages/StudioPage';
import { PresentationEditor } from '@/features/editor/PresentationEditor';
import { useAIGeneration } from '@/contexts/AIGenerationContext';
import { invoke } from '@tauri-apps/api/core';

interface MainViewRouterProps {
    activeView: string;
    setActiveView: (v: string) => void;
    activeResource: Resource | null;
    setActiveResource: (r: Resource | null) => void;
    isRightSidebarOpen: boolean;
    setIsRightSidebarOpen: (v: boolean) => void;
}

export function MainViewRouter({
    activeView,
    setActiveView,
    activeResource,
    setActiveResource,
    isRightSidebarOpen,
    setIsRightSidebarOpen
}: MainViewRouterProps) {
    const { state, setState, reset } = useAIGeneration();

    const handleDocumentGenerate = async (data: DocumentGenerationData) => {
        console.log('handleDocumentGenerate called with:', data);
        setState({ isGenerating: true, generationData: data, generatedContent: '' });
        try {
            console.log('Invoking generate_document...');
            const result: any = await invoke('generate_document', { request: data });
            console.log('Generation result:', result);
            setState({
                isGenerating: false,
                generatedContent: result.content,
                error: undefined
            });
            setActiveView('ai-document-review');
        } catch (error) {
            console.log('Generation error:', error);
            setState({
                isGenerating: false,
                error: error as string
            });
            setActiveView('ai-document-review'); // Navigate even on error so user can see it
        }
    };

    const handlePresentationGenerate = async (data: PresentationGenerationData) => {
        setState({ isGenerating: true, generationData: data, generatedContent: '' });
        try {
            const result: any = await invoke('generate_presentation', { request: data });
            setState({
                isGenerating: false,
                generatedContent: result.content,
                error: undefined
            });
            setActiveView('ai-presentation-review');
        } catch (error) {
            setState({
                isGenerating: false,
                error: error as string
            });
            setActiveView('ai-presentation-review'); // Navigate even on error so user can see it
        }
    };

    const handleRefine = async (instructions: string) => {
        if (!state.generationData) return;

        setState({ isGenerating: true });
        try {
            const refinePrompt = `Original content:\n${state.generatedContent}\n\nRefinement instructions: ${instructions}\n\nPlease provide the refined version.`;
            const result: any = await invoke('chat_direct', {
                prompt: refinePrompt,
                max_tokens: 2048,
                temperature: 0.7
            });
            setState({
                isGenerating: false,
                generatedContent: result.content,
                error: undefined
            });
        } catch (error) {
            setState({
                isGenerating: false,
                error: error as string
            });
        }
    };

    const handleExport = (format: string) => {
        // TODO: Implement export functionality
        console.log('Exporting as', format, state.generatedContent);
    };

    const handleSave = async (repositoryId: string) => {
        if (!state.generationData || !state.generatedContent) return;

        try {
            const type = activeView === 'ai-document-review' ? 'note' : 'ppt';
            const resource: any = await invoke('add_resource', {
                repositoryId: parseInt(repositoryId),
                title: state.generationData.title,
                resourceType: type,
                content: state.generatedContent
            });
            // Navigate to the created resource
            setActiveResource(resource);
            setActiveView('main');
            reset();
        } catch (error) {
            console.error('Failed to save resource:', error);
        }
    };
    if (activeView === "main") {
        return (
            <Layout>
                {activeResource ? (
                    activeResource.type === 'note' ? (
                        <NoteEditor
                            resource={activeResource}
                            repositoryId={activeResource.repository_id}
                            onClose={() => setActiveResource(null)}
                            onSave={() => { }}
                            onDelete={() => setActiveResource(null)}
                        />
                    ) : activeResource.type === 'ppt' ? (
                        <PresentationEditor
                            resource={activeResource}
                            onClose={() => setActiveResource(null)}
                            onSave={() => { }}
                        />
                    ) : (
                        <ResourcePreview
                            resource={activeResource}
                            onClose={() => setActiveResource(null)}
                        />
                    )
                ) : (
                    <HomeHub
                        onOpenFile={(res: Resource) => setActiveResource(res)}
                    />
                )}
                <AnimatePresence mode="wait">
                    {isRightSidebarOpen && <TaskPane onClose={() => setIsRightSidebarOpen(false)} />}
                </AnimatePresence>
            </Layout>
        );
    }

    if (activeView === "planner") return <Planner />;
    if (activeView === "repository") return <StudyRepository />;
    if (activeView === "focus") return <FocusMode />;
    if (activeView === "grades") return <Grades />;
    if (activeView === "finance") return <Layout><Finance /></Layout>;
    if (activeView === "flashcards") return <Layout><FlashcardsPage /></Layout>;
    if (activeView === "chat") return <ChatLocalLLM />;
    if (activeView === "studio") {
        return (
            <Layout>
                <StudioPage
                    onViewResource={(res: Resource) => {
                        setActiveResource(res);
                        setActiveView('main');
                    }}
                    setActiveView={setActiveView}
                />
            </Layout>
        );
    }

    if (activeView === "ai-document-create") return <AIDocumentCreate onBack={() => setActiveView('studio')} onGenerate={handleDocumentGenerate} />;
    if (activeView === "ai-presentation-create") return <AIPresentationCreate onBack={() => setActiveView('studio')} onGenerate={handlePresentationGenerate} />;
    if (activeView === "ai-document-review") return <AIDocumentReview
        onBack={() => setActiveView('ai-document-create')}
        generationData={state.generationData}
        generatedContent={state.generatedContent}
        onRefine={handleRefine}
        onExport={handleExport}
        onSave={handleSave}
        isGenerating={state.isGenerating}
        error={state.error}
    />;
    if (activeView === "ai-presentation-review") return <AIPresentationReview
        onBack={() => setActiveView('ai-presentation-create')}
        generationData={state.generationData}
        generatedContent={{ slides: [] }} // TODO: Parse actual slides
        onRefine={handleRefine}
        onExport={handleExport}
        onSave={handleSave}
        isGenerating={state.isGenerating}
        error={state.error}
    />;

    return null;
}
