import { AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { TaskPane } from '@/features/tasks/TaskPane';
import { StudyRepository } from '@/pages/StudyRepository';
import { Planner } from '@/pages/Planner';
import { FocusMode } from '@/features/tasks/FocusMode';
import { ChatLocalLLM } from '@/features/ai/ChatLocalLLM';
import { Grades } from '@/pages/Grades';
import { Finance } from '@/pages/Finance';
import { FlashcardsPage } from '@/pages/FlashcardsPage';
import { HomeHub } from '@/pages/HomeHub';
import { NoteEditor } from '@/features/editor/NoteEditor';
import { ResourcePreview } from '@/features/resources/ResourcePreview';
import { StudioPage } from '@/pages/StudioPage';
import { PresentationEditor } from '@/features/editor/PresentationEditor';
import { Resource } from '@/types/node-system';

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
    if (activeView === "main") {
        return (
            <Layout>
                {activeResource ? (
                    activeResource.type === 'note' ? (
                        <NoteEditor
                            resource={activeResource}
                            repositoryId={activeResource.repository_id || 0}
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
                />
            </Layout>
        );
    }

    return null;
}
