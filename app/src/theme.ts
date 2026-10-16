export type ThemeChoice = 'auto' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

const ORDER: ThemeChoice[] = ['auto', 'light', 'dark'];

export const nextTheme = (current: ThemeChoice): ThemeChoice => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

export function parseTheme(raw: unknown): ThemeChoice {
  return raw === 'light' || raw === 'dark' || raw === 'auto' ? raw : 'auto';
}

export const resolveTheme = (choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme =>
  choice === 'auto' ? (systemPrefersDark ? 'dark' : 'light') : choice;

/** Browser UI colour (address bar, status bar): the header colour of each theme. */
export const themeColor = (theme: ResolvedTheme): string => (theme === 'dark' ? '#070f1e' : '#0e1f3d');
