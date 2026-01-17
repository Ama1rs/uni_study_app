import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface AppSettings {
    id: number;
    theme_style: string;
    theme_mode: string;
    accent: string;
    sidebar_hidden: boolean;
    graph_node_color: string;
    graph_link_color: string;
    graph_node_size: number;
    graph_link_width: number;
    graph_show_labels: boolean;
    graph_label_size: number;
    graph_show_legend: boolean;
    graph_show_topology: boolean;
}

interface AppSettingsContextType {
    settings: AppSettings;
    toggleSidebar: () => void;
    updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
    refreshSettings: () => Promise<void>;
    isLoading: boolean;
}

const defaultSettings: AppSettings = {
    id: 1,
    theme_style: 'default',
    theme_mode: 'dark',
    accent: 'blue',
    sidebar_hidden: true,
    graph_node_color: '#2383E2',
    graph_link_color: 'rgba(255,255,255,0.15)',
    graph_node_size: 3.0,
    graph_link_width: 0.5,
    graph_show_labels: true,
    graph_label_size: 12.0,
    graph_show_legend: true,
    graph_show_topology: true,
};

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    const refreshSettings = useCallback(async () => {
        try {
            const loadedSettings = await invoke<AppSettings>('get_app_settings');
            setSettings(loadedSettings);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load settings on mount
    useEffect(() => {
        refreshSettings();
    }, [refreshSettings]);

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        try {
            await invoke('set_app_settings', { settings: updated });
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    };

    const toggleSidebar = () => {
        updateSettings({ sidebar_hidden: !settings.sidebar_hidden });
    };

    return (
        <AppSettingsContext.Provider value={{ settings, toggleSidebar, updateSettings, refreshSettings, isLoading }}>
            {children}
        </AppSettingsContext.Provider>
    );
}

export function useAppSettings() {
    const context = useContext(AppSettingsContext);
    if (!context) {
        throw new Error('useAppSettings must be used within AppSettingsProvider');
    }
    return context;
}
