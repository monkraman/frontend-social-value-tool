/**
 * One restrained colour per Social Value theme, used everywhere a theme is shown
 * (Opportunity Finder pillars, TOMs catalog, partner directory), so a theme always
 * looks the same. Work uses the Infosys brand blue; the others are muted companions.
 */
export interface ThemeTone {
  color: string;
  bg: string;
  border: string;
}

export const THEME_PALETTE = {
  work: { color: '#2B67A0', bg: 'rgba(43, 103, 160, 0.10)', border: 'rgba(43, 103, 160, 0.28)' },
  planet: { color: '#2F7D5B', bg: 'rgba(47, 125, 91, 0.10)', border: 'rgba(47, 125, 91, 0.28)' },
  community: { color: '#5E5A8C', bg: 'rgba(94, 90, 140, 0.10)', border: 'rgba(94, 90, 140, 0.28)' },
  economy: { color: '#2C7A7B', bg: 'rgba(44, 122, 123, 0.10)', border: 'rgba(44, 122, 123, 0.28)' },
  other: { color: '#4A5668', bg: 'rgba(74, 86, 104, 0.10)', border: 'rgba(74, 86, 104, 0.28)' }
} satisfies Record<string, ThemeTone>;
