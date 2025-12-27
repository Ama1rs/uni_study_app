import { useState, useEffect } from "react";
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsModal } from "@/features/settings/SettingsModal";
import { Onboarding } from "@/features/onboarding/Onboarding";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { MainViewRouter } from "@/components/routing/MainViewRouter";
import { AppSettingsProvider, useAppSettings } from "@/contexts/AppSettingsContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { AIGenerationProvider } from "@/contexts/AIGenerationContext";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import { Resource } from "@/types/node-system";
import { invoke } from "@tauri-apps/api/core";

function AppContent() {
  const [activeView, setActiveView] = useState<string>("main");
  const [activeResource, setActiveResource] = useState<Resource | null>(null);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isSwitchingProfile, setIsSwitchingProfile] = useState<boolean>(false);

  const { settings, toggleSidebar } = useAppSettings();
  const {
    isLoading,
    currentUser,
    onboardingComplete,
    authChecked,
    setOnboardingComplete,
    logout,
    handleAuthenticated
  } = useAppInitialization();

  // Debug: Reset onboarding with Ctrl+Shift+R
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        console.log("Resetting onboarding...");
        try {
          await invoke('set_onboarding_state', { onboardingState: { completed: false } });
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
  }, [setOnboardingComplete]);

  if (isLoading) return null;

  if (authChecked && !currentUser) {
    return (
      <AuthScreen
        onAuthenticated={async (user) => {
          setIsSwitchingProfile(true);
          await handleAuthenticated(user);
          setIsSwitchingProfile(false);
        }}
      />
    );
  }

  if (!onboardingComplete) {
    return (
      <Onboarding
        userId={currentUser?.id}
        onComplete={() => setOnboardingComplete(true)}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      <TitleBar
        onToggleSidebar={toggleSidebar}
        onLogout={() => logout(setActiveView)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          activeView={activeView}
          onViewChange={(view: string) => {
            setActiveView(view);
            if (view === 'main') setActiveResource(null);
          }}
          hidden={settings.sidebar_hidden}
        />

        <MainViewRouter
          activeView={activeView}
          setActiveView={setActiveView}
          activeResource={activeResource}
          setActiveResource={setActiveResource}
          isRightSidebarOpen={isRightSidebarOpen}
          setIsRightSidebarOpen={setIsRightSidebarOpen}
        />

        {/* Floating edge button to toggle right panel */}
        {activeView === "main" && (
          <motion.button
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[60] bg-bg-surface/80 backdrop-blur-md border border-border border-r-0 rounded-l-xl p-1.5 hover:bg-white/10 transition-all group flex items-center justify-center shadow-2xl"
            title={isRightSidebarOpen ? "Close Today View" : "Open Today View"}
            initial={false}
            animate={{ x: 0, opacity: 1 }}
            whileHover={{ scale: 1.1, x: -2 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div animate={{ rotate: isRightSidebarOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronLeft size={20} className="text-text-secondary group-hover:text-accent transition-colors" />
            </motion.div>
          </motion.button>
        )}
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

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
        <AIGenerationProvider>
          <AppContent />
        </AIGenerationProvider>
      </UserProfileProvider>
    </AppSettingsProvider>
  );
}
