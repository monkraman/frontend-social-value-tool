/**
 * Central Theme & Design System Configuration
 *
 * ALL colors, typography, borders, and UI tokens for the ENTIRE application
 * are configured in this SINGLE file.
 *
 * Supports Dark Mode (Minimalist Zinc/Black) and Light Mode (Clean White/Black).
 * Any change made here updates the entire UI immediately via CSS custom properties.
 */

export type ThemeMode = 'dark' | 'light';

// Shared Typography and Corner Radii
const SHARED_TYPOGRAPHY = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
};

const SHARED_RADII = {
  sm: '6px',
  md: '8px',
  lg: '10px',
  full: '9999px'
};

// 1. Dark Theme Palette (Monochrome Slate / Zinc)
export const DARK_THEME = {
  fonts: SHARED_TYPOGRAPHY,
  radii: SHARED_RADII,
  colors: {
    bgApp: '#09090b',          // Main canvas background
    bgSidebar: '#09090b',      // Sidebar panel background
    bgSurface: '#121215',      // Card surfaces, containers, toolbars
    bgCard: '#18181b',         // Inner cards, list items
    bgCardHover: '#222226',    // Card hover state
    bgInput: '#18181b',        // Text inputs, textareas, selects
    bgMuted: '#27272a',        // Active nav tabs, subtle pills

    textPrimary: '#fafafa',    // High-contrast primary text, headings
    textSecondary: '#a1a1aa',  // Secondary labels, descriptions
    textMuted: '#71717a',      // Footnotes, timestamps, hints
    textInverse: '#09090b',    // Text on white accent buttons

    borderSubtle: '#27272a',   // Standard structural borders
    borderMedium: '#3f3f46',   // Input borders, upload zone dash
    borderFocus: '#71717a',    // Focused input outline

    btnPrimaryBg: '#fafafa',
    btnPrimaryText: '#09090b',
    btnPrimaryHover: '#e4e4e7',

    accent: '#fafafa',

    statusOnline: '#fafafa',
    statusOffline: '#52525b'
  }
} as const;

// 2. Light Theme Palette (Clean White / Dark Charcoal)
export const LIGHT_THEME = {
  fonts: SHARED_TYPOGRAPHY,
  radii: SHARED_RADII,
  colors: {
    bgApp: '#ffffff',          // Crisp white background
    bgSidebar: '#f8fafc',      // Subtle off-white sidebar
    bgSurface: '#ffffff',      // Pure white card surfaces
    bgCard: '#f4f4f5',         // Soft zinc card backgrounds
    bgCardHover: '#e4e4e7',    // Card hover state
    bgInput: '#ffffff',        // White inputs
    bgMuted: '#e4e4e7',        // Active nav tabs, subtle pills

    textPrimary: '#09090b',    // Deep high-contrast black
    textSecondary: '#52525b',  // Readable dark charcoal
    textMuted: '#71717a',      // Secondary helper text
    textInverse: '#ffffff',    // Text on dark elements

    borderSubtle: '#e4e4e7',   // Clean light divider
    borderMedium: '#d4d4d8',   // Medium input borders
    borderFocus: '#18181b',    // Sharp focused input outline

    btnPrimaryBg: '#09090b',   // Solid black button
    btnPrimaryText: '#ffffff', // White button text
    btnPrimaryHover: '#27272a',

    accent: '#09090b',

    statusOnline: '#09090b',
    statusOffline: '#a1a1aa'
  }
} as const;

export const THEME_CONFIG = DARK_THEME;
export type ThemeDefinition = typeof DARK_THEME;

/**
 * Retrieves the stored theme or defaults to 'dark'.
 */
export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('social_value_theme') as ThemeMode;
  return saved === 'light' ? 'light' : 'dark';
}

/**
 * Automatically applies selected theme tokens to document :root CSS variables.
 */
export function applyTheme(mode: ThemeMode = 'dark'): void {
  if (typeof document === 'undefined') return;

  const theme = mode === 'light' ? LIGHT_THEME : DARK_THEME;
  const root = document.documentElement;

  // Persist preference & set attribute for CSS selectors
  root.setAttribute('data-theme', mode);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('social_value_theme', mode);
  }

  // Set Fonts
  root.style.setProperty('--font-sans', theme.fonts.sans);
  root.style.setProperty('--font-mono', theme.fonts.mono);

  // Set Colors
  root.style.setProperty('--bg-app', theme.colors.bgApp);
  root.style.setProperty('--bg-sidebar', theme.colors.bgSidebar);
  root.style.setProperty('--bg-surface', theme.colors.bgSurface);
  root.style.setProperty('--bg-card', theme.colors.bgCard);
  root.style.setProperty('--bg-card-hover', theme.colors.bgCardHover);
  root.style.setProperty('--bg-input', theme.colors.bgInput);
  root.style.setProperty('--bg-muted', theme.colors.bgMuted);

  root.style.setProperty('--text-primary', theme.colors.textPrimary);
  root.style.setProperty('--text-secondary', theme.colors.textSecondary);
  root.style.setProperty('--text-muted', theme.colors.textMuted);
  root.style.setProperty('--text-inverse', theme.colors.textInverse);

  root.style.setProperty('--border-subtle', theme.colors.borderSubtle);
  root.style.setProperty('--border-medium', theme.colors.borderMedium);
  root.style.setProperty('--border-focus', theme.colors.borderFocus);

  root.style.setProperty('--btn-primary-bg', theme.colors.btnPrimaryBg);
  root.style.setProperty('--btn-primary-text', theme.colors.btnPrimaryText);
  root.style.setProperty('--btn-primary-hover', theme.colors.btnPrimaryHover);

  root.style.setProperty('--accent', theme.colors.accent);

  root.style.setProperty('--status-online', theme.colors.statusOnline);
  root.style.setProperty('--status-offline', theme.colors.statusOffline);

  // Set Radii
  root.style.setProperty('--radius-sm', theme.radii.sm);
  root.style.setProperty('--radius-md', theme.radii.md);
  root.style.setProperty('--radius-lg', theme.radii.lg);
  root.style.setProperty('--radius-full', theme.radii.full);
}
