import { Layout } from '@/components/layout/Layout';
import { Resource } from '@/types/node-system';
import { Suspense, lazy } from 'react';
import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import { AIDocumentCreate, DocumentGenerationData } from '@/features/ai/AIDocumentCreate';
import { AIPresentationCreate, PresentationGenerationRequest } from '@/features/ai/AIPresentationCreate';
import { NoteEditor } from '@/features/editor/NoteEditor';
import { ResourcePreview } from '@/features/resources/ResourcePreview';
import { PresentationEditor } from '@/features/editor/PresentationEditor';

// Lazy load large components
const StudyRepository = lazy(() => import('@/pages/StudyRepository').then(m => ({ default: m.StudyRepository })));
const Planner = lazy(() => import('@/pages/Planner').then(m => ({ default: m.Planner })));
const FocusMode = lazy(() => import('@/features/tasks/FocusMode').then(m => ({ default: m.FocusMode })));
const ChatLocalLLM = lazy(() => import('@/features/ai/ChatLocalLLM').then(m => ({ default: m.ChatLocalLLM })));
const AIDocumentReview = lazy(() => import('@/features/ai/AIDocumentReview').then(m => ({ default: m.AIDocumentReview })));
const AIPresentationReview = lazy(() => import('@/features/ai/AIPresentationReview').then(m => ({ default: m.AIPresentationReview })));
const Grades = lazy(() => import('@/pages/Grades').then(m => ({ default: m.Grades })));
const Finance = lazy(() => import('@/pages/Finance').then(m => ({ default: m.Finance })));
const FlashcardsPage = lazy(() => import('@/pages/FlashcardsPage').then(m => ({ default: m.FlashcardsPage })));
const HomeHub = lazy(() => import('@/pages/HomeHub').then(m => ({ default: m.HomeHub })));
const StudioPage = lazy(() => import('@/pages/StudioPage').then(m => ({ default: m.StudioPage })));
const Library = lazy(() => import('@/pages/Library').then(m => ({ default: m.Library })));
const Performance = lazy(() => import('@/pages/Performance').then(m => ({ default: m.Performance })));
import { useAIGeneration } from '@/contexts/AIGenerationContext';
import { invoke } from '@tauri-apps/api/core';
import { useMemo } from 'react';
import logger from '@/lib/logger';
import { GenerationResult, ChatResult } from '@/types/ai';

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
        logger.debug('handleDocumentGenerate called with:', data);
        setState({ isGenerating: true, generationData: data, generatedContent: '' });
        try {
            logger.debug('Invoking generate_document...');
            const result: GenerationResult = await invoke('generate_document', { request: data });
            logger.debug('Generation result:', result);
            setState({
                isGenerating: false,
                generatedContent: result.content,
                error: undefined
            });
setActiveView('ai-document-review');
        } catch (error) {
            logger.error('Generation error:', error);
            setState({
                isGenerating: false,
                error: error as string
            });
            setActiveView('ai-document-review'); // Navigate even on error so user can see it
        }
    };

    const handlePresentationGenerate = async (data: PresentationGenerationRequest) => {
        setState({ isGenerating: true, generationData: data, generatedContent: '' });
        try {
            const result: GenerationResult = await invoke('generate_presentation', { request: data });
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
            const result: ChatResult = await invoke('chat_direct', {
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
        { 
            id: 'main', 
            component: <Suspense fallback={<SkeletonCard />}><HomeHub onOpenFile={(res: Resource) => setActiveResource(res)} /></Suspense> 
        },
        { 
            id: 'planner', 
            component: <Suspense fallback={<Skeleton />}><Planner /></Suspense> 
        },
        { 
            id: 'repository', 
            component: <Suspense fallback={<SkeletonCard />}><StudyRepository /></Suspense> 
        },
        { 
            id: 'library', 
            component: <Suspense fallback={<SkeletonCard />}><Library onOpenBook={(book: any) => { setActiveResource(book); setActiveView('main'); }} /></Suspense> 
        },
        { 
            id: 'focus', 
            component: <Suspense fallback={<Skeleton />}><FocusMode activeView={activeView} /></Suspense> 
        },
        { 
            id: 'grades', 
            component: <Suspense fallback={<SkeletonTable />}><Grades /></Suspense> 
        },
        { 
            id: 'finance', 
            component: <Suspense fallback={<Skeleton />}><Finance /></Suspense> 
        },
        { 
            id: 'flashcards', 
            component: <Suspense fallback={<SkeletonCard />}><FlashcardsPage /></Suspense> 
        },
        { 
            id: 'chat', 
            component: <Suspense fallback={<Skeleton />}><ChatLocalLLM /></Suspense> 
        },
        {
            id: 'studio', 
            component: <Suspense fallback={<Skeleton />}><StudioPage
                onViewResource={(res: Resource) => {
                    setActiveResource(res);
                    setActiveView('main');
                }}
                setActiveView={setActiveView}
            /></Suspense>
        },
        { 
            id: 'performance', 
            component: <Suspense fallback={<Skeleton />}><Performance /></Suspense> 
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
                    {activeView === "ai-document-review" && <Suspense fallback={<Skeleton />}><AIDocumentReview
                        onBack={() => setActiveView('ai-document-create')}
                        generationData={state.generationData}
                        generatedContent={state.generatedContent}
                        onRefine={handleRefine}
                        onExport={handleExport}
                        onSave={handleSave}
                        isGenerating={state.isGenerating}
                        error={state.error}
                    /></Suspense>}
                    {activeView === "ai-presentation-review" && <Suspense fallback={<Skeleton />}><AIPresentationReview
                        onBack={() => setActiveView('ai-presentation-create')}
                        generationData={state.generationData}
                        generatedContent={{ slides: [] }} // TODO: Parse actual slides
                        onRefine={handleRefine}
                        onExport={handleExport}
                        onSave={handleSave}
                        isGenerating={state.isGenerating}
                        error={state.error}
                    /></Suspense>}
                </div>
            )}
        </Layout>
    );
}

