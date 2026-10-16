import { useCallback, useEffect, useState } from 'react';
import {
  THEME_STORAGE_KEY, nextTheme, parseTheme, resolveTheme, themeColor,
  type ResolvedTheme, type ThemeChoice,
} from '../theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const systemPrefersDark = () => typeof window !== 'undefined' && !!window.matchMedia?.(DARK_QUERY).matches;

function readStored(): ThemeChoice {
  try {
    return parseTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'auto';
  }
}

function applyToDocument(choice: ThemeChoice, resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (choice === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor(resolved));
}

/** Theme choice (auto, light, dark), persisted in the browser and applied to <html data-theme>. */
export function useTheme(): { choice: ThemeChoice; resolved: ResolvedTheme; cycle: () => void } {
  const [choice, setChoice] = useState<ThemeChoice>(readStored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const query = window.matchMedia?.(DARK_QUERY);
    if (!query) return;
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved = resolveTheme(choice, systemDark);

  useEffect(() => applyToDocument(choice, resolved), [choice, resolved]);

  const cycle = useCallback(() => {
    setChoice((current) => {
      const next = nextTheme(current);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* storage unavailable: the choice lasts for this visit only */
      }
      return next;
    });
  }, []);

  return { choice, resolved, cycle };
}
