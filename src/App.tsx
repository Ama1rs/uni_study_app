import { useState, useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { Layout } from "./components/Layout";
import { EditorPane } from "./components/EditorPane";
import { TaskPane } from "./components/TaskPane";
import { StudyRepository } from "./components/StudyRepository";
import { Planner } from "./components/Planner";
import { FocusMode } from "./components/FocusMode";
import { ChatLocalLLM } from "./components/ChatLocalLLM.tsx";
import { SettingsModal } from "./components/SettingsModal";
import { Onboarding } from "./components/onboarding/Onboarding";
import { HomeHub } from "./components/HomeHub";
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
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const { settings, toggleSidebar } = useAppSettings();
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
        setIsOnboarding(!onboardingState.completed);

        if (!onboardingState.completed) {
          const appWindow = getCurrentWindow();
          appWindow.setSize(new LogicalSize(1024, 768));
          appWindow.center();
        }
      } catch (e) {
        console.error("Failed to check onboarding/auth status:", e);
        setIsOnboarding(true);
      } finally {
        setIsLoading(false);
        setAuthChecked(true);
      }
    }
    bootstrap();
  }, []);

  const handleLogout = async () => {
    try {
      await invoke('logout');
      // Reset onboarding state in DB
      await invoke('set_onboarding_state', {
        data: {
          completed: false
        }
      });

      setCurrentUser(null);
      setIsOnboarding(true);
      setOnboardingComplete(false);
      setActiveView("main");

      // Resize window for onboarding
      const appWindow = getCurrentWindow();
      await appWindow.setSize(new LogicalSize(1024, 768));
      await appWindow.center();
      await appWindow.setResizable(true);
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  if (isLoading) return null;

  if (authChecked && !currentUser) {
    return <AuthScreen onAuthenticated={async (user) => {
      setCurrentUser(user);
      await refreshProfile();
      const onboardingState = await invoke<{ completed: boolean }>('get_onboarding_state');
      setOnboardingComplete(onboardingState.completed);
      setIsOnboarding(!onboardingState.completed);
    }} />;
  }

  if (!onboardingComplete) {
    return <Onboarding userId={currentUser?.id} onComplete={async () => {
      await refreshProfile();
      setOnboardingComplete(true);
      setIsOnboarding(false);
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
            if (view === 'main') setActiveFile(null);
          }}
          hidden={settings.sidebar_hidden}
        />

        {activeView === "main" && (
          <Layout>
            {activeFile ? (
              <EditorPane />
            ) : (
              <HomeHub onOpenFile={(path) => setActiveFile(path)} />
            )}
            {isRightSidebarOpen && <TaskPane onClose={() => setIsRightSidebarOpen(false)} />}
          </Layout>
        )}

        {/* Floating edge button to re-open right panel */}
        {activeView === "main" && !isRightSidebarOpen && (
          <button
            onClick={() => setIsRightSidebarOpen(true)}
            className="fixed right-0 top-16 z-50 bg-bg-surface/80 backdrop-blur-sm border border-border border-r-0 rounded-l-lg p-2 hover:bg-white/10 transition-colors group"
            title="Open Right Panel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-tertiary group-hover:text-accent">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        {activeView === "planner" && <Planner />}
        {activeView === "repository" && <StudyRepository />}
        {activeView === "focus" && <FocusMode />}
        {activeView === "chat" && <ChatLocalLLM />}
      </div>
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
