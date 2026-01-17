import { Layout } from '@/components/layout/Layout';
import { Resource } from '@/types/node-system';
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
import { Library } from '@/pages/Library';
import { useAIGeneration } from '@/contexts/AIGenerationContext';
import { invoke } from '@tauri-apps/api/core';
import { useMemo } from 'react';

interface MainViewRouterProps {
    activeView: string;
    setActiveView: (v: string) => void;
    activeResource: Resource | null;
    setActiveResource: (r: Resource | null) => void;
}

export function MainViewRouter({
    activeView,
    setActiveView,
    activeResource,
    setActiveResource
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
        if (!state.generatedContent) return;

        try {
            const blob = new Blob([state.generatedContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const filename = `${state.generationData?.title || 'generated-content'}.${format === 'markdown' ? 'md' : format}`;
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Export failed:", e);
        }
    };

    const handleSave = async (repositoryId: string, content: string) => {
        if (!state.generationData || !content) return;

        try {
            const type = activeView === 'ai-document-review' ? 'note' : 'ppt';
            const resource: any = await invoke('add_resource', {
                payload: {
                    repositoryId: parseInt(repositoryId),
                    title: state.generationData.title,
                    resourceType: type,
                    content: content
                }
            });
            // Navigate to the created resource
            setActiveResource(resource);
            setActiveView('main');
            reset();
        } catch (error) {
            console.error('Failed to save resource:', error);
        }
    };

    // list of views that should be preserved
    const persistentViews = useMemo(() => [
        { id: 'main', component: <HomeHub onOpenFile={(res: Resource) => setActiveResource(res)} /> },
        { id: 'planner', component: <Planner /> },
        { id: 'repository', component: <StudyRepository /> },
        { id: 'library', component: <Library onOpenBook={(book) => { setActiveResource(book); setActiveView('main'); }} /> },
        { id: 'focus', component: <FocusMode activeView={activeView} /> },
        { id: 'grades', component: <Grades /> },
        { id: 'finance', component: <Finance /> },
        { id: 'flashcards', component: <FlashcardsPage /> },
        { id: 'chat', component: <ChatLocalLLM /> },
        {
            id: 'studio', component: <StudioPage
                onViewResource={(res: Resource) => {
                    setActiveResource(res);
                    setActiveView('main');
                }}
                setActiveView={setActiveView}
            />
        },
    ], [setActiveResource, setActiveView]);

    const isPersistentView = persistentViews.some(v => v.id === activeView);

    return (
        <Layout>
            {/* Render persistent views with hidden class if not active */}
            {persistentViews.map(view => (
                <div
                    key={view.id}
                    className="w-full h-full overflow-hidden flex flex-col"
                    style={{ display: activeView === view.id && !activeResource ? 'flex' : 'none' }}
                >
                    {view.component}
                </div>
            ))}

            {/* Special handling for main view when activeResource is set (Notes/PPT/Preview) */}
            {activeView === 'main' && activeResource && (
                <div className="w-full h-full overflow-hidden">
                    {activeResource.type === 'note' ? (
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
                    )}
                </div>
            )}

            {/* Non-persistent views (Studio generation/review) */}
            {!isPersistentView && (
                <div className="w-full h-full overflow-hidden">
                    {activeView === "ai-document-create" && <AIDocumentCreate onBack={() => setActiveView('studio')} onGenerate={handleDocumentGenerate} />}
                    {activeView === "ai-presentation-create" && <AIPresentationCreate onBack={() => setActiveView('studio')} onGenerate={handlePresentationGenerate} />}
                    {activeView === "ai-document-review" && <AIDocumentReview
                        onBack={() => setActiveView('ai-document-create')}
                        generationData={state.generationData}
                        generatedContent={state.generatedContent}
                        onRefine={handleRefine}
                        onExport={handleExport}
                        onSave={handleSave}
                        isGenerating={state.isGenerating}
                        error={state.error}
                    />}
                    {activeView === "ai-presentation-review" && <AIPresentationReview
                        onBack={() => setActiveView('ai-presentation-create')}
                        generationData={state.generationData}
                        generatedContent={{ slides: [] }} // TODO: Parse actual slides
                        onRefine={handleRefine}
                        onExport={handleExport}
                        onSave={handleSave}
                        isGenerating={state.isGenerating}
                        error={state.error}
                    />}
                </div>
            )}
        </Layout>
    );
}

