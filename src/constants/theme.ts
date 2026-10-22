/**
 * Central Theme & Design System Configuration
 *
 * ALL colors, typography, borders, and UI tokens for the ENTIRE application
 * are configured in this SINGLE file.
 *
 * Built around the Infosys corporate identity:
 *  - Light Mode (default): calm cool-grey canvas, white surfaces, Infosys blue accents.
 *  - Dark Mode: deep Infosys navy surfaces with brightened blue accents.
 * Any change made here updates the entire UI immediately via CSS custom properties.
 */

export type ThemeMode = 'dark' | 'light';

/**
 * Infosys Brand Palette
 * `blue` is sampled directly from the Infosys wordmark so the logo and UI match exactly.
 */
const BRAND = {
  blue: '#3A7FBC',      // Infosys wordmark blue
  blueDeep: '#2B67A0',  // Buttons / brand text on light surfaces (WCAG AA with white)
  blueDeeper: '#1F5487',// Hover / pressed on light surfaces
  blueSoft: '#6EA6DB',  // Accent on navy surfaces
  blueSofter: '#8FBCE6' // Hover / brand text on navy surfaces
};

// Shared Typography and Corner Radii
const SHARED_TYPOGRAPHY = {
  // Humanist sans for UI and reading text
  sans: "'Source Sans 3', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
  // Editorial serif for page titles, section headings and headline figures
  display: "'Source Serif 4', Georgia, 'Times New Roman', serif",
  mono: "'Source Code Pro', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
};

const SHARED_RADII = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  full: '9999px'
};

// 1. Light Theme Palette (default) — Infosys white & blue
export const LIGHT_THEME = {
  fonts: SHARED_TYPOGRAPHY,
  radii: SHARED_RADII,
  colors: {
    bgApp: '#F4F6FA',          // Soft cool-grey canvas
    bgSidebar: '#FFFFFF',      // White sidebar (logo sits on white)
    bgSurface: '#FFFFFF',      // Cards, panels, toolbars
    bgCard: '#F8FAFC',         // Inner cards, list items
    bgCardHover: '#EEF3F9',    // Card hover state
    bgInput: '#FFFFFF',        // Inputs, textareas, selects
    bgMuted: '#EEF2F7',        // Subtle pills, toolbars, table headers

    textPrimary: '#1B2533',    // Deep navy-charcoal
    textSecondary: '#4A5668',  // Body copy
    textMuted: '#7A8597',      // Hints, timestamps
    textInverse: '#FFFFFF',

    borderSubtle: '#E3E8EF',
    borderMedium: '#CDD5E0',
    borderFocus: BRAND.blue,

    btnPrimaryBg: BRAND.blueDeep,
    btnPrimaryText: '#FFFFFF',
    btnPrimaryHover: BRAND.blueDeeper,

    accent: BRAND.blue,

    // Brand accent system (consumed as --color-primary-* across components)
    colorPrimary: BRAND.blue,
    colorPrimaryHover: BRAND.blueDeep,
    colorPrimaryText: BRAND.blueDeep,              // Brand-coloured text that stays legible
    colorPrimarySubtle: 'rgba(58, 127, 188, 0.10)',// Tinted backgrounds
    colorPrimaryBorder: 'rgba(58, 127, 188, 0.32)',// Tinted borders
    ring: 'rgba(58, 127, 188, 0.28)',

    overlay: 'rgba(17, 27, 42, 0.42)',
    shadowSm: '0 1px 2px rgba(17, 27, 42, 0.06)',
    shadowMd: '0 4px 16px rgba(17, 27, 42, 0.08)',
    shadowLg: '0 24px 48px -12px rgba(17, 27, 42, 0.22)',

    statusOnline: '#1E9E5A',
    statusOffline: '#A1A9B5'
  }
} as const;

// 2. Dark Theme Palette — Infosys navy
export const DARK_THEME = {
  fonts: SHARED_TYPOGRAPHY,
  radii: SHARED_RADII,
  colors: {
    bgApp: '#0E1520',
    bgSidebar: '#111A27',
    bgSurface: '#152030',
    bgCard: '#1A2638',
    bgCardHover: '#213049',
    bgInput: '#1A2638',
    bgMuted: '#1F2D42',

    textPrimary: '#E8EEF6',
    textSecondary: '#A9B6C8',
    textMuted: '#7D8BA0',
    textInverse: '#0E1520',

    borderSubtle: '#24344B',
    borderMedium: '#33465F',
    borderFocus: BRAND.blueSoft,

    btnPrimaryBg: BRAND.blueDeep,
    btnPrimaryText: '#FFFFFF',
    btnPrimaryHover: BRAND.blue,

    accent: BRAND.blueSoft,

    colorPrimary: BRAND.blueSoft,
    colorPrimaryHover: BRAND.blueSofter,
    colorPrimaryText: BRAND.blueSofter,
    colorPrimarySubtle: 'rgba(110, 166, 219, 0.14)',
    colorPrimaryBorder: 'rgba(110, 166, 219, 0.35)',
    ring: 'rgba(110, 166, 219, 0.35)',

    overlay: 'rgba(4, 8, 14, 0.62)',
    shadowSm: '0 1px 2px rgba(0, 0, 0, 0.35)',
    shadowMd: '0 4px 16px rgba(0, 0, 0, 0.35)',
    shadowLg: '0 24px 48px -12px rgba(0, 0, 0, 0.6)',

    statusOnline: '#34C77B',
    statusOffline: '#5B6B80'
  }
} as const;

export const THEME_CONFIG = LIGHT_THEME;
export type ThemeDefinition = typeof LIGHT_THEME;

// Bumped key so everyone starts on the new light default once.
const THEME_STORAGE_KEY = 'social_value_theme_v2';

/**
 * Retrieves the stored theme or defaults to 'light'.
 */
export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

// Theme color key -> CSS custom property
const COLOR_VARS: Record<keyof ThemeDefinition['colors'], string> = {
  bgApp: '--bg-app',
  bgSidebar: '--bg-sidebar',
  bgSurface: '--bg-surface',
  bgCard: '--bg-card',
  bgCardHover: '--bg-card-hover',
  bgInput: '--bg-input',
  bgMuted: '--bg-muted',
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  textMuted: '--text-muted',
  textInverse: '--text-inverse',
  borderSubtle: '--border-subtle',
  borderMedium: '--border-medium',
  borderFocus: '--border-focus',
  btnPrimaryBg: '--btn-primary-bg',
  btnPrimaryText: '--btn-primary-text',
  btnPrimaryHover: '--btn-primary-hover',
  accent: '--accent',
  colorPrimary: '--color-primary',
  colorPrimaryHover: '--color-primary-hover',
  colorPrimaryText: '--color-primary-text',
  colorPrimarySubtle: '--color-primary-subtle',
  colorPrimaryBorder: '--color-primary-border',
  ring: '--ring',
  overlay: '--overlay',
  shadowSm: '--shadow-sm',
  shadowMd: '--shadow-md',
  shadowLg: '--shadow-lg',
  statusOnline: '--status-online',
  statusOffline: '--status-offline'
};

/**
 * Automatically applies selected theme tokens to document :root CSS variables.
 */
export function applyTheme(mode: ThemeMode = 'light'): void {
  if (typeof document === 'undefined') return;

  const theme = mode === 'dark' ? DARK_THEME : LIGHT_THEME;
  const root = document.documentElement;

  // Persist preference & set attribute for CSS selectors
  root.setAttribute('data-theme', mode);
  root.style.colorScheme = mode;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Storage unavailable (private mode) — theme still applies for this session
  }

  // Fonts
  root.style.setProperty('--font-sans', theme.fonts.sans);
  root.style.setProperty('--font-display', theme.fonts.display);
  root.style.setProperty('--font-mono', theme.fonts.mono);

  // Colors
  (Object.keys(COLOR_VARS) as Array<keyof ThemeDefinition['colors']>).forEach((key) => {
    root.style.setProperty(COLOR_VARS[key], theme.colors[key]);
  });

  // Radii
  root.style.setProperty('--radius-sm', theme.radii.sm);
  root.style.setProperty('--radius-md', theme.radii.md);
  root.style.setProperty('--radius-lg', theme.radii.lg);
  root.style.setProperty('--radius-full', theme.radii.full);
}
