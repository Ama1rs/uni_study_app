import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AccentColor, getAccentColor, getAccentHover, DARK_THEME, LIGHT_THEME, WARM_DARK_THEME, WARM_LIGHT_THEME } from '../lib/themes';

interface ThemeContextType {
    mode: 'light' | 'dark';
    theme: 'default' | 'warm';
    accent: AccentColor;
    customBg: string | null;
    customSurface: string | null;
    highContrast: boolean;
    toggleMode: () => void;
    setTheme: (theme: 'default' | 'warm') => void;
    setAccent: (color: AccentColor) => void;
    setCustomBg: (color: string | null) => void;
    setCustomSurface: (color: string | null) => void;
    setHighContrast: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('theme_mode');
        return (saved as 'light' | 'dark') || 'dark';
    });

    const [theme, setThemeState] = useState<'default' | 'warm'>(() => {
        const saved = localStorage.getItem('theme_style');
        return (saved as 'default' | 'warm') || 'default';
    });

    const [accent, setAccentState] = useState<AccentColor>(() => {
        const saved = localStorage.getItem('theme_accent');
        return (saved as AccentColor) || 'blue';
    });

    const [customBg, setCustomBg] = useState<string | null>(() => {
        return localStorage.getItem('theme_custom_bg');
    });

    const [customSurface, setCustomSurface] = useState<string | null>(() => {
        return localStorage.getItem('theme_custom_surface');
    });

    const [highContrast, setHighContrast] = useState<boolean>(() => {
        return localStorage.getItem('theme_high_contrast') === 'true';
    });

    // Apply theme to CSS variables
    useEffect(() => {
        const root = document.documentElement;

        let themeObj;
        if (theme === 'warm') {
            themeObj = mode === 'dark' ? WARM_DARK_THEME : WARM_LIGHT_THEME;
        } else {
            themeObj = mode === 'dark' ? DARK_THEME : LIGHT_THEME;
        }

        const accentColor = getAccentColor(accent, mode);
        const accentHover = getAccentHover(accent, mode);

        // Set theme mode attribute
        root.setAttribute('data-theme', mode);

        // Apply color variables
        root.style.setProperty('--bg-primary', customBg || themeObj.bgPrimary);
        root.style.setProperty('--bg-surface', customSurface || themeObj.bgSurface);
        root.style.setProperty('--bg-card', themeObj.bgCard);
        root.style.setProperty('--bg-hover', themeObj.bgHover);

        // Apply contrast adjustments
        if (highContrast) {
            root.style.setProperty('--border', mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)');
            root.style.setProperty('--border-light', mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)');
            root.style.setProperty('--text-primary', mode === 'dark' ? '#FFFFFF' : '#000000');
            root.style.setProperty('--text-secondary', mode === 'dark' ? '#BBBBBB' : '#444444');
        } else {
            root.style.setProperty('--border', themeObj.border);
            root.style.setProperty('--border-light', themeObj.borderLight);
            root.style.setProperty('--text-primary', themeObj.textPrimary);
            root.style.setProperty('--text-secondary', themeObj.textSecondary);
        }

        root.style.setProperty('--text-tertiary', themeObj.textTertiary);
        root.style.setProperty('--accent', accentColor);
        root.style.setProperty('--accent-hover', accentHover);
        root.style.setProperty('--glass-bg', themeObj.glassBg);

        // Persist to localStorage
        localStorage.setItem('theme_mode', mode);
        localStorage.setItem('theme_style', theme);
        localStorage.setItem('theme_accent', accent);
        if (customBg) localStorage.setItem('theme_custom_bg', customBg);
        else localStorage.removeItem('theme_custom_bg');
        if (customSurface) localStorage.setItem('theme_custom_surface', customSurface);
        else localStorage.removeItem('theme_custom_surface');
        localStorage.setItem('theme_high_contrast', String(highContrast));
    }, [mode, theme, accent, customBg, customSurface, highContrast]);

    const toggleMode = () => {
        setMode(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const setTheme = (newTheme: 'default' | 'warm') => {
        setThemeState(newTheme);
    };

    const setAccent = (color: AccentColor) => {
        setAccentState(color);
    };

    return (
        <ThemeContext.Provider value={{
            mode, theme, accent, customBg, customSurface, highContrast,
            toggleMode, setTheme, setAccent, setCustomBg, setCustomSurface, setHighContrast
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
