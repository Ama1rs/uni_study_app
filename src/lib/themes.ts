export const ACCENT_COLORS = {
    blue: { dark: '#2383E2', light: '#0B6BCB', name: 'Blue' },
    purple: { dark: '#9B59B6', light: '#7B2CBF', name: 'Purple' },
    pink: { dark: '#E91E63', light: '#C2185B', name: 'Pink' },
    red: { dark: '#E03E3E', light: '#C62828', name: 'Red' },
    orange: { dark: '#FFA344', light: '#EF6C00', name: 'Orange' },
    yellow: { dark: '#FFDC49', light: '#F9A825', name: 'Yellow' },
    green: { dark: '#4CAF50', light: '#2E7D32', name: 'Green' },
    teal: { dark: '#26A69A', light: '#00897B', name: 'Teal' },
    cyan: { dark: '#00BCD4', light: '#0097A7', name: 'Cyan' },
    indigo: { dark: '#5C6AC4', light: '#3949AB', name: 'Indigo' },
    violet: { dark: '#8B5CF6', light: '#6D28D9', name: 'Violet' },
    rose: { dark: '#F43F5E', light: '#E11D48', name: 'Rose' },
} as const;

export type AccentColor = keyof typeof ACCENT_COLORS;

export const DARK_THEME = {
    bgPrimary: '#191919',
    bgSurface: '#252525',
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
    bgSurface: '#F7F6F3',
    bgHover: '#EFEEEB',
    border: '#E3E2E0',
    borderLight: '#D3D2CF',
    textPrimary: '#37352F',
    textSecondary: '#787774',
    textTertiary: '#9B9A97',
    glassBg: 'rgba(255, 255, 255, 0.6)',
} as const;

export const WARM_DARK_THEME = {
    bgPrimary: '#202020',
    bgSurface: '#2C2C2C',
    bgHover: '#383838',
    border: '#404040',
    borderLight: '#4D4D4D',
    textPrimary: '#EAEAEA',
    textSecondary: '#A0A0A0',
    textTertiary: '#707070',
    glassBg: 'rgba(32, 32, 32, 0.6)',
} as const;

export const WARM_LIGHT_THEME = {
    bgPrimary: '#FFFEFC',
    bgSurface: '#FBF9F5',
    bgHover: '#F2F0EB',
    border: '#E8E6E1',
    borderLight: '#DCDAD5',
    textPrimary: '#403D39',
    textSecondary: '#807D79',
    textTertiary: '#A09D99',
    glassBg: 'rgba(251, 249, 245, 0.6)',
} as const;

export function getAccentColor(accent: AccentColor, mode: 'light' | 'dark'): string {
    return ACCENT_COLORS[accent][mode];
}

export function getAccentHover(accent: AccentColor, mode: 'light' | 'dark'): string {
    const color = ACCENT_COLORS[accent][mode];
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
