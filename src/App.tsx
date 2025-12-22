import { useState, useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { Layout } from "./components/Layout";
import { TaskPane } from "./components/TaskPane";
import { StudyRepository } from "./components/StudyRepository";
import { Planner } from "./components/Planner";
import { FocusMode } from "./components/FocusMode";
import { ChatLocalLLM } from "./components/ChatLocalLLM.tsx";
import { Grades } from "./components/Grades";
import { Finance } from "./components/Finance.tsx";
import { FlashcardsPage } from "./components/FlashcardsPage";
import { SettingsModal } from "./components/SettingsModal";
import { Onboarding } from "./components/onboarding/Onboarding.tsx";
import { HomeHub } from "./components/HomeHub";
import { NoteEditor } from "./components/NoteEditor";
import { ResourcePreview } from "./components/ResourcePreview";
import { StudioPage } from "./components/StudioPage";
import { PresentationEditor } from "./components/studio/PresentationEditor";
import { Resource } from "./types/node-system";
import { AppSettingsProvider, useAppSettings } from "./contexts/AppSettingsContext";
import { UserProfileProvider, useUserProfile } from "./contexts/UserProfileContext";
import { AuthScreen } from "./components/auth/AuthScreen";

interface UserPublic {
  id: number;
  username: string;
  created_at?: string;
}

function AppContent() {
  const [activeView, setActiveView] = useState<string>("main");
  const [activeResource, setActiveResource] = useState<Resource | null>(null);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSwitchingProfile, setIsSwitchingProfile] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const { settings, toggleSidebar, refreshSettings } = useAppSettings();
  const { refreshProfile } = useUserProfile();

  // Bootstrap auth + onboarding
  useEffect(() => {
    async function bootstrap() {
      try {
        const [user, onboardingState] = await Promise.all([
          invoke<UserPublic | null>('get_current_user'),
          invoke<{ completed: boolean }>('get_onboarding_state')
        ]);
        setCurrentUser(user);
        setOnboardingComplete(onboardingState.completed);

        if (!onboardingState.completed) {
          const appWindow = getCurrentWindow();
          appWindow.setSize(new LogicalSize(1024, 768));
          appWindow.center();
        }
      } catch (e) {
        console.error("Failed to check onboarding/auth status:", e);
      } finally {
        setIsLoading(false);
        setAuthChecked(true);
      }
    }
    bootstrap();
  }, []);

  // Debug: Reset onboarding with Ctrl+Shift+R
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        console.log("Resetting onboarding...");
        try {
          await invoke('set_onboarding_state', {
            onboardingState: { completed: false }
          });
          setOnboardingComplete(false);
          const appWindow = getCurrentWindow();
          await appWindow.setSize(new LogicalSize(1024, 768));
          await appWindow.center();
        } catch (error) {
          console.error("Failed to reset onboarding:", error);
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleLogout = async () => {
    try {
      await invoke('logout');
    } catch (error) {
      console.error("Failed to logout on backend:", error);
    } finally {
      setCurrentUser(null);
      setOnboardingComplete(false);

      // Resize window for login/onboarding
      const appWindow = getCurrentWindow();
      await appWindow.setSize(new LogicalSize(1024, 768));
      await appWindow.center();
      await appWindow.setResizable(true);
      setActiveView("main");
    }
  };

  if (isLoading) return null;

  if (authChecked && !currentUser) {
    return <AuthScreen onAuthenticated={async (user) => {
      setIsSwitchingProfile(true);
      try {
        setCurrentUser(user);
        await Promise.all([
          refreshProfile(),
          refreshSettings()
        ]);
        const onboardingState = await invoke<{ completed: boolean }>('get_onboarding_state');
        setOnboardingComplete(onboardingState.completed);
      } catch (error) {
        console.error("Failed to switch profile:", error);
      } finally {
        setIsSwitchingProfile(false);
      }
    }} />;
  }

  if (!onboardingComplete) {
    return <Onboarding userId={currentUser?.id} onComplete={async () => {
      await refreshProfile();
      setOnboardingComplete(true);
    }} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      <TitleBar
        onToggleSidebar={toggleSidebar}
        onLogout={handleLogout}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          activeView={activeView}
          onViewChange={(view) => {
            setActiveView(view);
            if (view === 'main') setActiveResource(null);
          }}
          hidden={settings.sidebar_hidden}
        />

        {activeView === "main" && (
          <Layout>
            {activeResource ? (
              activeResource.type === 'note' ? (
                <NoteEditor
                  resource={activeResource}
                  repositoryId={activeResource.repository_id || 0}
                  onClose={() => setActiveResource(null)}
                  onSave={() => { }} // Might need more handling here
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
        )}

        {/* Floating edge button to toggle right panel */}
        {activeView === "main" && (
          <motion.button
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[60] bg-bg-surface/80 backdrop-blur-md border border-border border-r-0 rounded-l-xl p-1.5 hover:bg-white/10 transition-all group flex items-center justify-center shadow-2xl"
            title={isRightSidebarOpen ? "Close Today View" : "Open Today View"}
            initial={false}
            animate={{
              x: 0,
              opacity: 1
            }}
            whileHover={{ scale: 1.1, x: -2 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              animate={{ rotate: isRightSidebarOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronLeft size={20} className="text-text-secondary group-hover:text-accent transition-colors" />
            </motion.div>
          </motion.button>
        )}

        {activeView === "planner" && <Planner />}
        {activeView === "repository" && <StudyRepository />}
        {activeView === "focus" && <FocusMode />}
        {activeView === "grades" && <Grades />}
        {activeView === "finance" && (
          <Layout>
            <Finance />
          </Layout>
        )}
        {activeView === "flashcards" && (
          <Layout>
            <FlashcardsPage />
          </Layout>
        )}
        {activeView === "chat" && <ChatLocalLLM />}
        {activeView === "studio" && (
          <Layout>
            <StudioPage
              onViewResource={(res) => {
                setActiveResource(res);
                setActiveView('main');
              }}
            />
          </Layout>
        )}
      </div>
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Global Loading Overlay */}
      <AnimatePresence>
        {isSwitchingProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-text-primary font-medium">Switching Profile...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AppSettingsProvider>
      <UserProfileProvider>
        <AppContent />
      </UserProfileProvider>
    </AppSettingsProvider>
  );
}
