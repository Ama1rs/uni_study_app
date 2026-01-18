import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAppSettings } from '@/contexts/AppSettingsContext';

interface UserPublic {
    id: number;
    username: string;
    created_at?: string;
    is_cloud_user?: boolean;
}

export function useAppInitialization() {
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
    const [onboardingComplete, setOnboardingComplete] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const { refreshProfile } = useUserProfile();
    const { refreshSettings } = useAppSettings();

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

    const logout = async (setActiveView: (v: string) => void) => {
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

    const handleAuthenticated = async (user: UserPublic, authType: 'local' | 'cloud') => {
        try {
            setCurrentUser(user);
            await Promise.all([
                refreshProfile(),
                refreshSettings()
            ]);
            
            // Check if onboarding is needed - only for local users
            const onboardingState = await invoke<{ completed: boolean }>('get_onboarding_state');
            
            // Cloud users don't need onboarding since their config comes from the cloud
            if (authType === 'cloud') {
                setOnboardingComplete(true);
            } else {
                setOnboardingComplete(onboardingState.completed);
            }
        } catch (error) {
            console.error("Failed to switch profile:", error);
        }
    };

    return {
        isLoading,
        currentUser,
        onboardingComplete,
        authChecked,
        setOnboardingComplete,
        logout,
        handleAuthenticated
    };
}
