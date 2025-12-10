import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface UserProfile {
    name: string;
    university: string;
}

interface UserProfileContextType {
    profile: UserProfile;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
}

const defaultProfile: UserProfile = {
    name: 'Student',
    university: ''
};

const UserProfileContext = createContext<UserProfileContextType>({
    profile: defaultProfile,
    isLoading: true,
    refreshProfile: async () => { }
});

export function UserProfileProvider({ children }: { children: ReactNode }) {
    const [profile, setProfile] = useState<UserProfile>(defaultProfile);
    const [isLoading, setIsLoading] = useState(true);

    const refreshProfile = useCallback(async () => {
        try {
            const prof = await invoke<{ id: number; name?: string; university?: string }>('get_user_profile');
            setProfile({
                name: prof.name || 'Student',
                university: prof.university || ''
            });
        } catch (e) {
            console.error('Failed to load user profile:', e);
            setProfile(defaultProfile);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshProfile();
    }, [refreshProfile]);

    return (
        <UserProfileContext.Provider value={{ profile, isLoading, refreshProfile }}>
            {children}
        </UserProfileContext.Provider>
    );
}

export function useUserProfile() {
    const context = useContext(UserProfileContext);
    if (!context) {
        throw new Error('useUserProfile must be used within a UserProfileProvider');
    }
    return context;
}
