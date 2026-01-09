export const ACCENT_COLORS = {
    blue: { dark: '#2383E2', light: '#0B6BCB', name: 'Blue' },
    purple: { dark: '#9B59B6', light: '#7B2CBF', name: 'Purple' },
    green: { dark: '#4CAF50', light: '#2E7D32', name: 'Green' },
    red: { dark: '#E03E3E', light: '#C62828', name: 'Red' },
    orange: { dark: '#FFA344', light: '#EF6C00', name: 'Orange' },
} as const;

export type PresetAccentColor = keyof typeof ACCENT_COLORS;
export type AccentColor = PresetAccentColor | string;


export const DARK_THEME = {
    bgPrimary: '#191919',
    bgSurface: '#252525',
    bgCard: '#2E2E2E',
    bgHover: '#2D2D2D',
    border: '#373737',
    borderLight: '#404040',
    textPrimary: '#E3E3E3',
    textSecondary: '#9B9A97',
    textTertiary: '#6C6C6C',
    glassBg: 'rgba(25, 25, 25, 0.6)',
} as const;

export const LIGHT_THEME = {
    bgPrimary: '#FFFFFF',
    bgSurface: '#FFFFFF', // Consistent with titlebar
    bgCard: '#F8F9FA',    // Very subtle card background
    bgHover: '#F3F4F6',
    border: '#E5E7EB',    // Tailwind gray-200
    borderLight: '#F3F4F6',
    textPrimary: '#111827', // Gray-900 for target pure aesthetics
    textSecondary: '#4B5563',
    textTertiary: '#9CA3AF',
    glassBg: 'rgba(255, 255, 255, 0.85)',
} as const;

export const WARM_DARK_THEME = {
    bgPrimary: '#202020',
    bgSurface: '#262626',
    bgCard: '#2E2E2E',
    bgHover: '#323232',
    border: '#404040',
    borderLight: '#4D4D4D',
    textPrimary: '#EAEAEA',
    textSecondary: '#A0A0A0',
    textTertiary: '#707070',
    glassBg: 'rgba(32, 32, 32, 0.6)',
} as const;

export const WARM_LIGHT_THEME = {
    bgPrimary: '#FFFEFC',
    bgSurface: '#FFFEFC', // Match primary for seamless feel
    bgCard: '#F9F8F4',
    bgHover: '#F5F2EA',
    border: '#E8E6E1',    // Subtle warm border
    borderLight: '#F2F0ED',
    textPrimary: '#2D2A26', // Deep warm charcoal
    textSecondary: '#78716C',
    textTertiary: '#A8A29E',
    glassBg: 'rgba(253, 251, 247, 0.85)',
} as const;

export function getAccentColor(accent: AccentColor, mode: 'light' | 'dark'): string {
    if (accent in ACCENT_COLORS) {
        return ACCENT_COLORS[accent as PresetAccentColor][mode];
    }
    return accent; // Assume it's a hex string
}

export function getAccentHover(accent: AccentColor, mode: 'light' | 'dark'): string {
    const color = getAccentColor(accent, mode);
    // Darken by 10% for hover state
    return mode === 'dark'
        ? adjustBrightness(color, -10)
        : adjustBrightness(color, -15);
}


function adjustBrightness(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1).toUpperCase();
}
