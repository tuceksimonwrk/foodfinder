import type { ReactNode } from 'react';
import type { ThemeChoice } from '../theme';

const LABELS: Record<ThemeChoice, string> = { auto: 'Automaticky podle systému', light: 'Světlý', dark: 'Tmavý' };

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ICONS: Record<ThemeChoice, ReactNode> = {
  // half sun, half moon: follows the system
  auto: (
    <Svg>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
    </Svg>
  ),
  light: (
    <Svg>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  ),
  dark: (
    <Svg>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </Svg>
  ),
};

/** Cycles auto, light, dark. The icon shows the current choice; the label names it and the action. */
export function ThemeToggle({ choice, onClick }: { choice: ThemeChoice; onClick: () => void }) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onClick}
      aria-label={`Motiv: ${LABELS[choice]}. Klepnutím přepnout.`}
      title={`Motiv: ${LABELS[choice]}`}
    >
      <span key={choice} style={{ display: 'contents' }}>{ICONS[choice]}</span>
    </button>
  );
}
